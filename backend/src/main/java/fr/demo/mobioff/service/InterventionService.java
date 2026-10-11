package fr.demo.mobioff.service;
import fr.demo.mobioff.dto.InterventionDto;
import fr.demo.mobioff.dto.UpdateInterventionDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import static fr.demo.mobioff.dto.InterventionDto.Priority.*;
import static fr.demo.mobioff.dto.InterventionDto.Status.*;
@Service
public class InterventionService {
    private final Map<Long, InterventionDto> interventions = new TreeMap<>();
    public InterventionService() {
        seed(new InterventionDto(45821, "Remplacement équipement", "Entreprise Atlas", "18 rue des Ateliers, Lyon", "EQP-2018-1204", "", "", TODO, HIGH, 1));
        seed(new InterventionDto(45835, "Maintenance", "Industrie Rhône", "42 avenue Jean Jaurès, Vénissieux", "EQP-2020-7810", "", "Contrôle de fonctionnement à effectuer.", IN_PROGRESS, NORMAL, 3));
        seed(new InterventionDto(45842, "Installation équipement", "Atelier Lumière", "7 quai des Étroits, Lyon", "EQP-2026-0091", "", "", TODO, NORMAL, 1));
        seed(new InterventionDto(45856, "Inspection de site", "Résidence des Cèdres", "3 allée des Cèdres, Bron", "EQP-2019-4522", "", "Vérifier l’état et la conformité des équipements.", TODO, HIGH, 2));
        seed(new InterventionDto(45863, "Maintenance", "Logistique Horizon", "86 route de Grenoble, Saint-Priest", "EQP-2021-8830", "EQP-2026-0520", "Contrôles réalisés, équipement conforme.", DONE, NORMAL, 2));
    }
    private void seed(InterventionDto intervention) { interventions.put(intervention.id(), intervention); }
    public synchronized List<InterventionDto> list() { return List.copyOf(interventions.values()); }
    public synchronized InterventionDto get(long id) {
        var item = interventions.get(id);
        if (item == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Intervention inconnue.");
        return item;
    }
    // Comparison and replacement share one lock: two clients cannot validate the same version.
    public synchronized InterventionDto update(long id, UpdateInterventionDto update) {
        var current = get(id);
        if (current.version() != update.version()) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cette intervention a été modifiée depuis votre dernière consultation.");
        var updated = new InterventionDto(current.id(), current.type(), current.client(), current.address(),
                current.currentEquipment(), update.newEquipment().trim(), update.comment(), update.status(),
                current.priority(), current.version() + 1);
        interventions.put(id, updated);
        return updated;
    }
}
