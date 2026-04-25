# SPYFALL (web)

Private-room multiplayer Spyfall-style game: **React + Vite** frontend (Vampire Diaries–inspired UI), **Node + Socket.IO** game server, **Supabase Postgres** for room audit rows (optional).

## What you need from Supabase

1. **Project URL** — Dashboard → Project Settings → API → **Project URL**.
2. **Service role key** — same page → **service_role** key (secret).  
   **Never** expose this in the client or in git. Only `server/.env` (gitignored).

3. In **SQL Editor**, run the full script **`supabase/full_setup.sql`** (creates `rooms`, `words`, RLS).

4. **Word bank (24k words):** from repo root:
   ```bash
   npm run build:words
   npm run seed:words
   ```
   If the `words` table is empty or too small, the server falls back to `server/data/wordbank.generated.json`, then to a tiny embedded list.

**If you ever paste the service role key in chat or commit it, rotate it immediately in Supabase (Settings → API → regenerate).**

If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, the server still runs; it uses the JSON file / embedded words only.

## Run locally

```bash
npm install
```

**`server/.env`**

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**`client/.env`** (optional in dev; Vite proxies `/socket.io` to the server)

```env
VITE_SOCKET_URL=http://localhost:3001
```

```bash
npm run dev
```

- Client: http://localhost:5173  
- Server: http://localhost:3001  

## Production

- Build: `npm run build`
- Host the **server** where WebSockets work (Fly.io, Railway, etc.). Set `CLIENT_ORIGIN` to your **exact** frontend origin.
- Host **client** static files (Vercel, Cloudflare Pages, etc.). Set `VITE_SOCKET_URL` at build time to your **public** API/WebSocket URL.

## Notes

- Game state is **in-memory** on the server; a restart clears active games. Supabase only stores created room rows for now.
- Word lists are a **starter set** in `server/src/words.ts`; expand as needed.
