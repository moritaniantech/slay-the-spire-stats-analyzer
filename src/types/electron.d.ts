import type { Run } from '../types';

declare module 'electron' {
  import { IpcMain, IpcMainInvokeEvent } from 'electron';
  export { IpcMain, IpcMainInvokeEvent };
}

declare module 'electron-is-dev' {
  const isDev: boolean;
  export default isDev;
}

interface LoadProgress {
  progress: number;
  total: number;
}

declare global {
  interface Window {
    electronAPI: {
      getTheme: () => Promise<string>;
      setTheme: (theme: string) => Promise<string>;
      getAllRuns: () => Promise<Run[]>;
      loadRunFiles: (folderPath: string) => Promise<Run[]>;
      selectFolder: () => Promise<string | null>;
      getRunFolder: () => Promise<string | null>;
      onLoadProgress: (callback: (progress: LoadProgress) => void) => () => void;
      deleteRun: (run: any) => Promise<void>;
    }
  }
}

export {}; 