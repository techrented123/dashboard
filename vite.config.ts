import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    global: "window", // Or 'globalThis' for broader compatibility
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    proxy: {
      "/api/upload": {
        target: "https://rbzn5e69oa.execute-api.us-west-2.amazonaws.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/upload/, ""),
      },
      "/api/submit": {
        target:
          "https://yipdy0po78.execute-api.us-west-2.amazonaws.com/rent-reports",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/submit/, ""),
      },
      "/api/rent-reports": {
        target:
          "https://yipdy0po78.execute-api.us-west-2.amazonaws.com/rent-reports",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rent-reports/, ""),
      },
      "/api/billing": {
        target: "https://ukytl7ab7d.execute-api.us-west-2.amazonaws.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/billing/, "/prod"),
      },
      "/api/documents": {
        target: "https://ruhqb5iww2.execute-api.us-west-2.amazonaws.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/documents/, "/prod"),
      },
    },
  },
  build: {
    // Ensure environment variables are available in production build
    rollupOptions: {
      external: [],
    },
  },
});
