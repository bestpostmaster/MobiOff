/// <reference lib="webworker" />
import { AnalysisRequest, AnalysisResult } from './analysis.model';
addEventListener('message', ({ data }: MessageEvent<AnalysisRequest>) => {
  const start = performance.now();
  const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  let critical = 0;
  let checksum = 0;
  for (let index = 0; index < data.records.length; index++) {
    const value = data.records[index];
    const status = value % 3;
    if (status === 0) byStatus.TODO++;
    else if (status === 1) byStatus.IN_PROGRESS++;
    else byStatus.DONE++;
    // Synthetic priority scoring: repeated numeric work stays off the UI thread.
    let score = value;
    for (let round = 0; round < 64; round++)
      score = Math.imul(score ^ (score >>> 13), 1597334677) >>> 0;
    if (status !== 2 && score % 100 > 89) critical++;
    checksum = (checksum + score) >>> 0;
  }
  const result: AnalysisResult = {
    total: data.records.length,
    critical,
    pending: byStatus.TODO,
    byStatus,
    durationMs: performance.now() - start,
    checksum,
  };
  postMessage(result);
});
