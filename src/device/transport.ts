export type HidDataListener = (data: Buffer) => void;

export interface HidTransport {
  write(report: Buffer): Promise<void>;
  onData(listener: HidDataListener): () => void;
  close(): Promise<void>;
}
