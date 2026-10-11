import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { bootstrapApplication } from '@angular/platform-browser';
import { isDevMode } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
registerLocaleData(localeFr);

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately',
    }),
    provideRouter(
      [
        {
          path: '',
          loadComponent: () =>
            import('./app/features/interventions/pages/list.page').then((m) => m.ListPage),
        },
        {
          path: 'interventions/:id',
          loadComponent: () =>
            import('./app/features/interventions/pages/detail.page').then((m) => m.DetailPage),
        },
        { path: '**', redirectTo: '' },
      ],
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
  ],
}).catch(console.error);
