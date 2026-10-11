import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
registerLocaleData(localeFr);

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
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
