import { Injectable, signal } from '@angular/core';
import { AnalysisResult } from './analysis.model';
@Injectable({ providedIn: 'root' })
export class AnalysisService {
  readonly running = signal(false);
  readonly result = signal<AnalysisResult | null>(null);
  readonly error = signal('');
  run(): void {
    if (this.running()) return;
    this.running.set(true);
    this.error.set('');
    this.result.set(null);
    let worker: Worker | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const finish = (): void => {
      clearTimeout(watchdog);
      worker?.terminate();
      this.running.set(false);
    };
    try {
      worker = new Worker(new URL('./analysis.worker', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<AnalysisResult>) => {
        this.result.set(data);
        finish();
      };
      worker.onerror = () => {
        this.error.set('Analyse indisponible. Réessayez.');
        finish();
      };
      watchdog = setTimeout(() => {
        this.error.set('Analyse interrompue après 15 secondes.');
        finish();
      }, 15000);
      const records = new Uint32Array(1_000_000);
      for (let i = 0; i < records.length; i++) records[i] = i + 45821;
      // Transfer ownership of the 4 MB buffer instead of copying it.
      worker.postMessage({ records }, [records.buffer]);
    } catch {
      this.error.set('Ce navigateur ne permet pas de lancer le Worker.');
      finish();
    }
  }
}
