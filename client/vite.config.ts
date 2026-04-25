import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 0.0.0.0 — same Wi‑Fi devices can open http://<your-lan-ip>:5173
    port: 5173,
    strictPort: true,
    // Socket.IO: client uses same hostname as this page + :3001 in dev (see socket.ts).
    // No proxy — avoids ws ECONNREFUSED while the server is still loading words.
  },
});
