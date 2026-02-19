declare module 'electron-store' {
  class Store<T = Record<string, unknown>> {
    constructor(options?: Store.Options<T>);
    get<K extends keyof T>(key: K): T[K];
    set<K extends keyof T>(key: K, value: T[K]): void;
    store: T;
  }

  namespace Store {
    interface Options<T> {
      name?: string;
      cwd?: string;
      defaults?: T;
    }
  }

  export = Store;
} 