import React, { useEffect } from "react";

const CHATBASE_EMBED_SRC = "https://www.chatbase.co/embed.min.js";

/**
 * ChatbotSnippet for plain React (Vite) apps.
 * - Reads chatbot id from Vite env: VITE_CHATBOTID or VITE_CHATBOT_ID
 * - Sets window.chatbaseConfig before loading the embed script
 * - Avoids duplicate script injection across renders
 */
type ChatbotSnippetProps = {
  chatbotId?: string;
};

const ChatbotSnippet: React.FC<ChatbotSnippetProps> = ({ chatbotId }) => {
  useEffect(() => {
    const idFromEnv =
      (import.meta as any).env?.VITE_CHATBOTID ||
      (import.meta as any).env?.VITE_CHATBOT_ID;
    const resolvedId = chatbotId || idFromEnv || "";

    // Expose config on window for the embed script
    try {
      (window as any).chatbaseConfig = {
        chatbotId: resolvedId,
        domain: window.location.hostname,
      };
      console.log("[ChatbotSnippet] Using chatbotId:", resolvedId);
    } catch {}

    // Inject embed script once
    const existing =
      document.getElementById("chatbase-embed") ||
      document.getElementById("chatbase-embed-script");
    if (!existing && resolvedId) {
      const script = document.createElement("script");
      // Use official id that some loaders look for
      script.id = "chatbase-embed";
      script.src = CHATBASE_EMBED_SRC;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      // Provide chatbot id via attributes as a fallback some versions use
      script.setAttribute("data-chatbot-id", resolvedId);
      script.setAttribute("data-cbid", resolvedId);
      script.onload = () => {
        console.log("[ChatbotSnippet] Chatbase loaded");
      };
      script.onerror = () => {
        console.warn("[ChatbotSnippet] Failed to load Chatbase script");
      };
      document.body.appendChild(script);
    }
    if (!resolvedId) {
      console.warn(
        "[ChatbotSnippet] Missing chatbot ID. Set VITE_CHATBOTID, or pass chatbotId prop, or use ?chatbotId=..."
      );
    }
  }, []);

  // No visible UI
  return null;
};

export default ChatbotSnippet;
