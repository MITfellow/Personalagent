/** Shape of the test bridge installed by `installStoreBridge`. */
export interface StoreEnvelope {
  version: number;
  savedAt: number;
  // the specs poke at arbitrary corners of the store, so this stays loose
  state: any;
}

declare global {
  interface Window {
    __store: {
      read(): Promise<StoreEnvelope | null>;
      write(env: StoreEnvelope): Promise<void>;
    };
  }
}
