import { topics } from "../config/mqttTopics";
import { BUILDING_ID } from "../config/channelOptions";

const BASE_TOPIC = topics.personal.base(BUILDING_ID);
const PRESENCE_FILTER = `${BASE_TOPIC}/+/presencia`;
const HEARTBEAT_MS = 15000;
const EXPIRATION_MS = 90000;

function presenceTopic(clientId) {
  return topics.personal.presencia(BUILDING_ID, clientId);
}

export function createPresenceWill(clientId) {
  return {
    topic: presenceTopic(clientId),
    payload: JSON.stringify({ online: false }),
    qos: 1,
    retain: true,
  };
}

export function createPresenceClient({
  client,
  clientId,
  user,
  onUsers,
  onError,
}) {
  const sessions = new Map();
  let stopped = false;

  function emitUsers() {
    const now = Date.now();
    const byUser = new Map();

    for (const session of sessions.values()) {
      if (now - session.updatedAt > EXPIRATION_MS) continue;

      const existing = byUser.get(session.userId);

      if (existing) {
        existing.sessions += 1;
      } else {
        byUser.set(session.userId, {
          id: session.userId,
          name: session.name,
          role: session.role,
          sessions: 1,
        });
      }
    }

    onUsers(
      [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
    );
  }

  function receivePresence(topic, payload) {
    if (stopped || !topic.startsWith(`${BASE_TOPIC}/`)) return;

    const segments = topic.slice(BASE_TOPIC.length + 1).split("/");

    if (segments.length !== 2 || segments[1] !== "presencia") {
      return;
    }

    const sessionId = segments[0];

    if (payload.length === 0) {
      sessions.delete(sessionId);
      emitUsers();
      return;
    }

    try {
      const presence = JSON.parse(payload.toString());

      if (presence?.online !== true) {
        sessions.delete(sessionId);
      } else if (
        presence.clientId === sessionId &&
        typeof presence.userId === "string" &&
        typeof presence.name === "string" &&
        typeof presence.role === "string" &&
        Number.isFinite(presence.updatedAt) &&
        Math.abs(Date.now() - presence.updatedAt) <= EXPIRATION_MS
      ) {
        sessions.set(sessionId, presence);
      }

      emitUsers();
    } catch {
      sessions.delete(sessionId);
      emitUsers();
    }
  }

  function announceOnline() {
    if (stopped || !client.connected) return;

    client.publish(
      presenceTopic(clientId),
      JSON.stringify({
        online: true,
        clientId,
        userId: user.id,
        name: user.name,
        role: user.role,
        updatedAt: Date.now(),
      }),
      { qos: 1, retain: true },
    );
  }

  function onConnect() {
    if (stopped) return;

    client.subscribe(PRESENCE_FILTER, { qos: 1 }, (error) => {
      if (!stopped && error) onError(error);
    });

    announceOnline();
  }

  function onClose() {
    if (stopped) return;

    sessions.clear();
    emitUsers();
  }

  client.on("connect", onConnect);
  client.on("close", onClose);
  client.on("message", receivePresence);

  const heartbeat = setInterval(announceOnline, HEARTBEAT_MS);

  const expiration = setInterval(() => {
    for (const [id, session] of sessions) {
      if (Date.now() - session.updatedAt > EXPIRATION_MS) {
        sessions.delete(id);
      }
    }

    emitUsers();
  }, HEARTBEAT_MS);

  if (client.connected) onConnect();

  return {
    stop(disconnect) {
      if (stopped) return;

      stopped = true;
      clearInterval(heartbeat);
      clearInterval(expiration);

      client.removeListener("connect", onConnect);
      client.removeListener("close", onClose);
      client.removeListener("message", receivePresence);

      if (!client.connected) {
        disconnect();
        return;
      }

      let finished = false;
      let timeout;

      const finish = () => {
        if (finished) return;

        finished = true;
        clearTimeout(timeout);
        disconnect();
      };

      timeout = setTimeout(finish, 1500);

      client.publish(
        presenceTopic(clientId),
        "",
        { qos: 1, retain: true },
        finish,
      );
    },
  };
}
