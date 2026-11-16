# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Telematicos-MQTT: real-time messaging over MQTT for operational staff coordination in a corporate building. UI copy and messages are in Spanish; code identifiers mix English and Spanish.

## Commands

- Full stack (Docker): `docker compose up --build -d` (services: mosquitto, mongo, backend). Requires `HISTORY_API_TOKEN` in the root `.env` (compose aborts if unset; history endpoints require it and it must be >= 32 chars). The root `.env` is untracked/gitignored - it currently contains pasted terminal output and breaks `docker compose`; replace it with valid `KEY=value` lines before running.
- Reseed catalogs: `docker compose run --rm backend node scripts/seed.js` (or `cd backend && npm run seed`).
- Backend dev: `cd backend && cp .env.example .env && npm install && npm run dev` (Node >= 20; `dev` = `node --watch src/index.js`). Env vars: `API_PORT`, `MONGODB_URI`, `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID`, `MQTT_TOPIC_FILTER`, `BUILDING_ID`, `PRESENCE_TTL_MS`, `LOG_LEVEL`.
- Frontend dev: `cd frontend && npm install && npm run dev`; needs `VITE_MQTT_URL=ws://localhost:9001` (in `frontend/.env`) to reach the mosquitto WebSocket listener.

## Verification

- Frontend: `cd frontend && npm run lint` (ESLint 10 flat config, ignores `dist`) and `cd frontend && npm run build`.
- Frontend lint currently fails with 3 pre-existing errors: `react-hooks/set-state-in-effect` in `src/components/EmergencyNotification.jsx` and `src/hooks/useEmergencyAcknowledgments.js`, and `no-undef` for `process` in `vite.config.js`.
- Backend: no lint/test/typecheck scripts and no CI workflows. Only runnable check locally is starting the service (requires MongoDB + MQTT).

## Architecture

- Backend (`backend/`, ESM, Node >= 20, plain `node:http` - no HTTP framework; API in `src/httpApi.js`). Startup: connect Mongo -> sync indexes -> ensure catalogs -> MQTT consumer -> HTTP API.
- MongoDB database `telematicos`. Collections: `events`, `messages`, `incidents`, `support_requests`, `support_messages`, `support_resolutions`, `presence_sessions`, `users`, `emergencies`, `emergency_responses`, plus GridFS buckets `emergency_evidence` and `support_evidence`.
- Backend MQTT: subscribes to `MQTT_TOPIC_FILTER` (default `edificio/+/#`); message handling in `src/handlers.js` dispatches on `edificio/{buildingId}/{category}`.
- Frontend MQTT topics in `src/config/mqttTopics.js`: channel messages published with `qos: 1, retain: true`; empty payload on `edificio/{buildingId}/alertas/emergencias/activas/{emergencyId}` means the emergency was resolved; ack topic: `edificio/{buildingId}/alertas/emergencias/acuses/{alertId}/{clientId}`.
- Frontend subscribes to new alerts at `edificio/{buildingId}/alertas/emergencias` and to active emergencies at `edificio/{buildingId}/alertas/emergencias/activas/+`.

## Backend HTTP API (`backend/src/httpApi.js`, paths under `/api`)

- `GET /api/health`
- `GET /api/emergencies/history` and `GET /api/emergencies/history/export` - Bearer token required (`HISTORY_API_TOKEN`, >= 32 chars; 503 if unset, 401 if invalid). CSV export limited to 10,000 records.
- `POST /api/emergencias/{emergencyId}/respuestas` - multipart form (description, responderId/Name/Role, 1-3 evidence files <= 5 MB each; JPG/PNG/WebP/PDF).
- `GET /api/emergencias/{emergencyId}/respuestas/{responseId}` - response access via `x-response-token` header (sha256 hex of a 32-byte random token).
- `GET /api/evidencias/{fileId}` - evidence via GridFS.
- Support: `GET /api/soporte/solicitudes`, `GET /api/soporte/chats`, `GET /api/soporte/chats/{requestId}/mensajes`, `POST /api/soporte/chats/{requestId}/mensajes`, `GET /api/soporte/resueltos`, `GET /api/soporte/resueltos/{resolutionId}/evidencias/{fileId}`, `POST /api/soporte/solicitudes/{requestId}/responder|resolver`.

## Notes

- History query params: `type`, `status`, `from`, `to` (YYYY-MM-DD), `page` (1-1,000,000), `limit` (20-100, default 20). Response shape: `{ records, pagination: { page, limit, total, totalPages } }`.
- Backend error responses are JSON `{ error: string }` with Spanish messages; invalid UUIDs return 400.
- Backend logs JSON lines; filter via `LOG_LEVEL` (debug/info/warn/error).
- Frontend dev proxy: `/api` -> `http://127.0.0.1:3001`, `/history-api` -> `/api` with Bearer token; backend must be running for history/support screens.
- Frontend MQTT per-role credentials are hardcoded in `frontend/src/services/mqttClient.js` and must match the mosquitto user database at `infrastructure/mosquitto/config/passwd`.



## Login and users

- Login is implemented via MQTT role credentials: the frontend sends username/password (see LOGIN_USERS in frontend/src/services/userSession.js) and connects to the broker with those credentials.
- One user exists per existing role; the maintenance role has two users: mantenimiento and mantenimiento2 (broker user added in infrastructure/mosquitto/config/passwd, ACL entry in infrastructure/mosquitto/config/acl).
- Backend seeds staff users into MongoDB users collection via backend/src/seeds/catalogs.js (staffUsers) and backend/src/seeds/apply.js (ensureCatalogs).
