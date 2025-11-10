import { useEffect } from "react";

interface ChatbaseProxy {
  q: any[];
  (action: string, ...args: any[]): any;
  getState?: () => string;
}

export default function ChatbaseWidget() {
  useEffect(() => {
    // Skip if it already exists
    (function () {
      const currentState = window?.chatbase?.getState?.();
      if (!window?.chatbase || currentState !== "initialized") {
        const chatbaseFunction = (...args: any[]) => {
          if (!window.chatbase?.q) {
            (window.chatbase as ChatbaseProxy).q = [];
          }
          (window.chatbase as ChatbaseProxy).q.push(args);
        };

        // Add the q property to the function
        (chatbaseFunction as ChatbaseProxy).q = [];

        // Create proxy
        window.chatbase = new Proxy(chatbaseFunction as ChatbaseProxy, {
          get(target: ChatbaseProxy, prop: string) {
            if (prop === "q") {
              return target.q;
            }
            return (...args: any[]) => target(prop, ...args);
          },
        });
      }

      const onLoad = function () {
        const script = document.createElement("script");
        script.src = "https://www.chatbase.co/embed.min.js";
        script.id = "hogdd5dYuMeYuJvcXp8ve";
        script.setAttribute("data-domain", "www.chatbase.co");
        document.body.appendChild(script);
      };

      if (document.readyState === "complete") {
        onLoad();
      } else {
        window.addEventListener("load", onLoad);
      }
    })();

    // Cleanup function
    return () => {
      const script = document.querySelector(
        'script[src="https://www.chatbase.co/embed.min.js"]'
      );
      if (script) script.remove();

      const iframe = document.querySelector('iframe[src*="chatbase.co"]');
      if (iframe) iframe.remove();

      if (window.chatbase) delete window.chatbase;
    };
  }, []);

  return null;
}
