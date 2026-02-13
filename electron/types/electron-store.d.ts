import { Store as ElectronStore } from 'electron-store';

type DotNotation<T> = {
  [K in keyof T]: T[K] extends object
    ? `${K & string}` | `${K & string}.${DotNotation<T[K]> & string}`
    : `${K & string}`;
}[keyof T];

interface StoreSchema {
  windowBounds?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  settings?: {
    theme: 'light' | 'dark';
    language: 'en' | 'ja';
  };
}

declare module 'electron-store' {
  interface Store<T> {
    get<K extends DotNotation<T>>(key: K): any;
    get<K extends DotNotation<T>>(key: K, defaultValue: any): any;
    set<K extends DotNotation<T>>(key: K, value: any): void;
    store: T;
  }
  
  class Store<T = any> {
    constructor(options?: Store.Options<T>);
    get<K extends DotNotation<T>>(key: K): any;
    get<K extends DotNotation<T>>(key: K, defaultValue: any): any;
    set<K extends DotNotation<T>>(key: K, value: any): void;
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