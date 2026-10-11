# MobiOff Demo

MobiOff est un prototype technique générique pour les entreprises qui travaillent dans un contexte de mobilité terrain : maintenance, installation, inspection ou remplacement d’équipements. Toutes les données sont fictives.

Fixtures : cinq interventions, une API REST, une file offline explicite et un vrai Web Worker. Aucun compte, service cloud, police distante ou base de données externe.

## Lancer

Prérequis : Docker Engine / Docker Desktop avec Docker Compose, ports **4300** et **18080** disponibles. Aucun Node, Java ou Maven nécessaire sur la machine hôte.

À la racine :

```bash
docker compose up --build
```

- Application : http://localhost:4300
- API : http://localhost:18080/api/interventions

Attendre que les deux services soient sains. Compose attend le backend avant de démarrer le front. Premier build : accès Internet pour les images et dépendances. Une fois les images construites, **le fonctionnement ne nécessite plus Internet** :

```bash
docker compose up --no-build --pull never
```

Ports Docker personnalisables : `MOBIOFF_FRONTEND_PORT=4400 MOBIOFF_API_PORT=8082 docker compose up --build`.

Pour lancer en arrière-plan : `docker compose up --build -d`. Pour arrêter : `docker compose down`. État et logs : `docker compose ps` et `docker compose logs -f`.

## Tester le scénario en moins de deux minutes

Ouvrir l’application dans Chrome, idéalement en mode téléphone **390 × 844**, onglet Network facultatif avec filtre `/api`.

1. **0–15 s** : la liste affiche cinq interventions et « En ligne ».
2. **15–40 s** : ouvrir **#45821**, saisir `EQP-2026-0842`, choisir « Terminée », valider. Le message confirme l’enregistrement serveur. Le PUT est visible dans Network et la version augmente.
3. **40–65 s** : cliquer **Mode démo hors ligne** dans les outils au bas de la page. Ouvrir **#45835**, saisir `EQP-2026-0843`, ajouter un commentaire, valider. Voir « Enregistré localement » puis « Synchronisation en attente » sur la carte.
4. **65–90 s** : cliquer **Revenir en ligne**, puis **Synchroniser maintenant**. Le retour en ligne tente déjà une synchronisation automatique ; le bouton permet de la déclencher explicitement ou de confirmer qu’il ne reste rien. Voir « Synchronisation terminée », la carte synchronisée et la file locale vide.
5. **90–115 s** : sur la liste, cliquer **Analyser les interventions**. Un vrai Worker analyse **1 000 000 de lignes simulées** et affiche les critiques, les interventions en attente et sa durée. Les cartes restent utilisables pendant le calcul.

Les nombres du Worker concernent son jeu synthétique, pas les cinq interventions. Un calcul de quelques dizaines ou centaines de millisecondes selon la machine est normal.

### Pitch entretien en 2 minutes

> « C’est un prototype terrain Angular 22, avec des composants standalone et un état basé sur Signals. Je valide ici une intervention via l’API Spring Boot. Je simule maintenant une panne API : les données restent disponibles dans IndexedDB. La validation écrit atomiquement l’intervention et une entrée dans une file locale. IndexedDB ne synchronise rien tout seul : un service envoie les PUT au retour du réseau et retire les entrées confirmées. Une version serveur détecte les conflits avec un 409. Enfin, un Worker calcule des statistiques sur un million de lignes sans bloquer le thread de l’interface. Les deux services sont livrés avec Docker Compose. »

## Architecture

Versions : **Angular 22.2.2**, TypeScript 6.0, RxJS 7.8, **Java 21**, **Spring Boot 3.5.16**. Versions npm verrouillées par `package-lock.json`. Compatibilité documentée : [Angular](https://angular.dev/reference/versions), [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html).

```text
.
├── docker-compose.yml
├── README.md
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json / package-lock.json
│   ├── angular.json / tsconfig*.json / proxy.conf.json
│   └── src/
│       ├── index.html / main.ts / styles.css
│       └── app/
│           ├── app.component.ts
│           ├── core/
│           │   ├── models/intervention.ts
│           │   └── services/
│           │       ├── intervention-api.service.ts
│           │       ├── intervention.store.ts
│           │       ├── offline-storage.service.ts
│           │       └── sync.service.ts
│           ├── features/interventions/
│           │   ├── pages/list.page.ts / detail.page.ts
│           │   ├── components/intervention-card.component.ts
│           │   └── services/analysis.service.ts / analysis.model.ts / analysis.worker.ts
│           └── shared/sync-badge.component.ts
├── backend/
│   ├── Dockerfile / pom.xml
│   └── src/
│       ├── main/java/fr/demo/mobioff/
│       │   ├── MobiOffApplication.java
│       │   ├── controller/InterventionController.java / ApiExceptionHandler.java
│       │   ├── service/InterventionService.java
│       │   └── dto/InterventionDto.java / UpdateInterventionDto.java
│       └── test/java/fr/demo/mobioff/InterventionApiTest.java
└── tests/
    ├── package.json / package-lock.json
    ├── playwright.config.ts
    ├── demo.spec.ts
    └── docker-outage.mjs
```

Les pages assurent la présentation et l’orchestration légère. `InterventionStore` expose des Signals et des compteurs dérivés. `InterventionApiService` expose les Observable HTTP RxJS avec timeout ; `SyncService` orchestre ces appels via `firstValueFrom`, les écritures locales et les états. Les pages sont chargées à la demande. Angular utilise son fonctionnement sans Zone.js.

Nginx sert les assets et relaie `/api` vers `backend:8080` : même origine, pas de configuration CORS nécessaire. Le DNS Docker est réévalué pour supporter le redémarrage/recréation du backend.

### IndexedDB et stratégie offline

Base `mobioff-demo`, version 1 :

- `interventions` : cache métier avec l’état UI, clé `id`.
- `pendingChanges` : file de payloads PUT, clé `id`.

Le cache est hydraté avant le chargement réseau. Toute validation écrit **dans une transaction unique** l’intervention et son payload de mise à jour. Le PUT immédiat est ensuite tenté. Après confirmation serveur, une autre transaction remplace l’intervention par la version serveur et supprime l’entrée de file.

En cas d’échec réseau, timeout ou erreur 5xx, la saisie reste locale. Plusieurs modifications de la même intervention fusionnent en une entrée, en préservant la version serveur de départ. Les saisies en attente ne sont jamais remplacées par le GET de la liste. Aucune donnée métier n’utilise `localStorage`.

La disponibilité est évaluée par les appels HTTP à l’API : le seul événement navigateur `online` ne prouve pas que le backend est disponible. Un contrôle toutes les **8 secondes**, l’événement `online`, le bouton manuel et « Revenir en ligne » déclenchent une tentative. Une seule opération de synchronisation/validation est exécutée à la fois dans cet onglet.

États affichés : `SYNCED`, `PENDING`, `SYNCING`, `ERROR`. Les conflits gardent leur payload local et ne sont pas réessayés automatiquement en boucle.

### Web Worker

`AnalysisService` crée un Worker de type module, prépare un `Uint32Array` d’un million de valeurs et **transfère** son buffer de 4 Mo sans le cloner. Le Worker agrège les trois statuts et applique un score CPU synthétique à chaque ligne. Il retourne un résultat typé et sa durée via `postMessage`, puis est terminé. Le calcul et le chronomètre se trouvent dans le Worker ; il n’accède jamais au DOM. Erreurs et expiration à 15 secondes sont prises en charge. Le temps affiché exclut la préparation/transmission et le démarrage du Worker.

### API et concurrence optimiste

| Requête                       | Résultat                                   |
| ----------------------------- | ------------------------------------------ |
| `GET /api/interventions`      | 200, cinq interventions                    |
| `GET /api/interventions/{id}` | 200 ou 404                                 |
| `PUT /api/interventions/{id}` | 200, version incrémentée ; 400, 404 ou 409 |

Exemple de mise à jour :

```bash
curl -i -X PUT http://localhost:18080/api/interventions/45821 \
  -H 'Content-Type: application/json' \
  -d '{"newEquipment":"EQP-2026-0842","comment":"Contrôle conforme","status":"DONE","version":1}'
```

Le numéro est obligatoire (40 caractères maximum), le commentaire est limité à 1 000 caractères, le statut est contrôlé, la version est requise et positive ou nulle. 
Les erreurs utilisent `ProblemDetail`. Le service Java synchronise la comparaison de version et la mise à jour en mémoire afin que deux PUT concurrents ne valident pas la même version.

Pour montrer le conflit : mettre une intervention hors ligne en attente, modifier la même intervention via `curl` avec sa version actuelle, revenir en ligne. L’interface affiche 
**« Cette intervention a été modifiée depuis votre dernière consultation. »** et conserve la file. Dans le détail, **Charger la version serveur (abandonner la saisie locale)** est une 
décision explicite qui remplace le cache et retire la saisie conflictuelle. La démo ne fusionne pas automatiquement les champs.

### Limites choisies pour cette démo

- Le serveur stocke tout en mémoire et revient aux cinq données initiales après redémarrage. IndexedDB persiste séparément dans le navigateur. Après des essais, redémarrer le backend **et** supprimer la base locale pour repartir de zéro.
- La démonstration offline concerne **l’accès au backend**. L’interface déjà ouverte fonctionne et peut être rechargée tant que Nginx est accessible. Sans Service Worker, recharger toute l’application lorsque le serveur frontend est inaccessible n’est pas couvert.
- Ouvrir et initialiser la liste au moins une fois en ligne avant de tester le cache. Le mode démo n’est pas conservé au rechargement.
- Utiliser `localhost` pour IndexedDB et les tests ; pour une démonstration sur téléphone réel via le réseau local, préférer un hébergement HTTPS.
- Un seul onglet et une synchronisation séquentielle. Pas de coordination multi-onglets, de backoff industriel ou de protocole d’idempotence. Si le serveur valide un PUT mais que sa réponse est perdue, le prochain essai peut produire un 409 ; la saisie reste disponible pour résolution explicite.

## Tester une vraie panne backend

Pendant que l’interface reste ouverte :

```bash
docker compose stop backend
# Modifier une intervention, valider : stockage local.
docker compose start backend
# Attendre « En ligne » ou cliquer « Synchroniser maintenant ».
```

Le redémarrage réinitialise la mémoire serveur : une intervention déjà modifiée peut donc produire un conflit. Pour cette vérification, choisir une intervention encore à sa version initiale. 
Pour le pitch, le mode démo est plus fiable : il coupe les appels sans réinitialiser la mémoire.

## Développement local

Prérequis supplémentaires : Node **22.22.3+** (branche 22), Java 21 et Maven 3.9.

Terminal backend :

```bash
cd backend
mvn spring-boot:run
```

Terminal frontend :

```bash
cd frontend
npm ci
npm start
```

En développement local, le front est sur `http://localhost:4200` et l’API sur `http://localhost:8080`. Le proxy de développement relaie `/api` vers `localhost:8080`. Build et tests :

```bash
cd frontend
npm run build
# Dans backend :
mvn verify
```

Le Dockerfile backend exécute également `mvn verify` pendant la construction, avec Java 21.

### Tests navigateur

Les tests modifient des données de démonstration : les lancer sur un backend fraîchement redémarré. Ils vérifient REST, persistance IndexedDB après rechargement, fusion de deux saisies locales, suppression de la file après confirmation, vrai Worker, absence de débordement à 390 px, et résolution d’un 409.

```bash
docker compose restart backend
cd tests
npm ci
npx playwright install chromium
npm test
```

Un test complémentaire coupe **réellement le conteneur backend**, valide une saisie offline puis le redémarre : `npm run test:docker` (depuis `tests`, sur des données fraîches). Il laisse le backend démarré.

Si Chrome est déjà installé, éviter le téléchargement : `CHROME_PATH=/bin/google-chrome npm test`. Les captures mobiles et traces en cas d’échec sont placées dans `tests/test-results/`.

### Réinitialiser avant l’entretien

```bash
docker compose restart backend
```

Dans DevTools → Application → IndexedDB, supprimer `mobioff-demo`, puis recharger la page. Ou dans la console du navigateur :

```js
// Fermer les autres onglets de la démo, puis exécuter et recharger.
const deletion = indexedDB.deleteDatabase('mobioff-demo');
deletion.onsuccess = () => location.reload();
```

Préparer les images Docker à l’avance, ouvrir la liste une fois, vérifier « En ligne » et placer la fenêtre en format mobile avant de commencer le pitch.

## Vérifications réalisées

- Build Angular 22 de production, TypeScript et templates stricts : réussi.
- Build Docker Java 21, `mvn verify` : 3 tests REST réussis.
- `docker compose up --build -d` : deux conteneurs sains, front et API HTTP 200.
- Chrome en 390 × 844 : 3 tests navigateur réussis (parcours complet, conflit, reprise automatique).
- Arrêt/redémarrage réel du conteneur backend : sauvegarde locale puis synchronisation réussies.
- Captures liste et détail inspectées : aucun débordement horizontal.
