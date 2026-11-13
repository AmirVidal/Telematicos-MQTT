# Telematicos-MQTT

Sistema de mensajería en tiempo real mediante MQTT para la coordinación del personal operativo de un edificio empresarial.

## Arquitectura

- `frontend/`: aplicación React que publica y recibe eventos por MQTT sobre WebSocket.
- `infrastructure/mosquitto/`: configuración del broker y credenciales de desarrollo.
- `backend/`: consumidor MQTT que persiste los eventos en MongoDB mediante Mongoose.
- MongoDB: base de datos `telematicos`.

## Arranque con Docker

```bash
docker compose up --build -d
```

Esto inicia Mosquitto, MongoDB y el servicio de persistencia. El backend crea los índices y sincroniza los catálogos (edificios, canales, tipos de incidente y roles) al arrancar.

MongoDB queda disponible en `mongodb://127.0.0.1:27017/telematicos`.

Para volver a sincronizar los catálogos manualmente:

```bash
docker compose run --rm backend node scripts/seed.js
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend en local

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

El backend escucha `edificio/+/#`, por lo que captura los mensajes de canal, incidentes, solicitudes de soporte, presencia y telemetría de cualquier edificio.

## Colecciones

| Colección | Contenido |
| --- | --- |
| `messages` | Mensajes de canales y mensajes privados |
| `incidents` | Reportes de incidentes |
| `support_requests` | Solicitudes de soporte |
| `presence_sessions` | Sesiones conectadas con expiración automática (TTL) |
| `users` | Personal identificado y su último estado de presencia |
| `events` | Alertas, telemetría y demás eventos MQTT |
| `buildings`, `channels`, `incident_types`, `roles` | Catálogos de referencia |

## Notas

La configuración incluida es para desarrollo local: MongoDB no usa autenticación y las credenciales MQTT son las mismas que utiliza el frontend. No exponer estos puertos fuera de la red local sin añadir autenticación.
