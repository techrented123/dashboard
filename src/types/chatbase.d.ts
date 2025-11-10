declare global {
  interface Window {
    chatbase?: {
      (...args: any[]): void;
      q?: any[];
      (action: string, ...args: any[]): any;
      getState?: () => string;
    };
    __CHATBOT_ID?: string;
  }
}

export {};