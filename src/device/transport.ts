export type HidDataListener = (data: Buffer) => void;
export type HidErrorListener = (error: Error) => void;

export interface HidTransport {
  write(report: Buffer): Promise<void>;
  onData(listener: HidDataListener): () => void;
  onError(listener: HidErrorListener): () => void;
  close(): Promise<void>;
}
