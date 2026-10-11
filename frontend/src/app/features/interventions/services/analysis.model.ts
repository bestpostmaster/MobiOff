import { Status } from '../../../core/models/intervention';
export interface AnalysisResult {
  total: number;
  critical: number;
  pending: number;
  byStatus: Record<Status, number>;
  durationMs: number;
  checksum: number;
}
export interface AnalysisRequest {
  records: Uint32Array;
}
