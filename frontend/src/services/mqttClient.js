import mqtt from "mqtt";
import { USER_ROLES } from "./userSession";

export const MQTT_URL =
  import.meta.env?.VITE_MQTT_URL?.trim() || "ws://localhost:9001";

const ROLE_CREDENTIALS = {
  [USER_ROLES.MANTENIMIENTO]: { username: "mantenimiento", password: "pass123" },
  [USER_ROLES.ADMINISTRACION]: { username: "administracion", password: "admin123" },
  [USER_ROLES.RECEPCION]: { username: "recepcion", password: "recep123" },
  [USER_ROLES.SEGURIDAD]: { username: "seguridad", password: "seg123" },
  [USER_ROLES.LIMPIEZA]: { username: "limpieza", password: "limp123" },
};

export function createClientId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  const suffix = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `web${suffix}`;
}

export function createMqttConnection({
  url = MQTT_URL,
  clientId = createClientId(),
  onStatus = () => {},
  onError = () => {},
  connectFn = mqtt.connect,
  will,
  userRole,
} = {}) {
  let stopped = false;

  const notifyStatus = (status) => {
    if (!stopped) onStatus(status);
  };

  const handleConnect = () => {
    if (stopped) return;
    onError(null);
    notifyStatus("connected");
  };

  const handleReconnect = () => {
    notifyStatus("reconnecting");
  };

  const handleClose = () => {
    notifyStatus("disconnected");
  };

  const handleError = (error) => {
    if (!stopped) onError(error);
  };

  notifyStatus("connecting");

  const credentials = userRole ? ROLE_CREDENTIALS[userRole] : ROLE_CREDENTIALS[USER_ROLES.RECEPCION];

  const options = {
    clientId,
    protocolVersion: 5,
    clean: true,
    keepalive: 30,
    connectTimeout: 5000,
    reconnectPeriod: 2000,
    ...(will ? { will } : {}),
  };

  if (credentials?.username) {
    options.username = credentials.username;
    options.password = credentials.password;
  }

  const client = connectFn(url, options);

  client.on("connect", handleConnect);
  client.on("reconnect", handleReconnect);
  client.on("close", handleClose);
  client.on("offline", handleClose);
  client.on("error", handleError);

  return {
    client,
    clientId,
    stop() {
      if (stopped) return;
      stopped = true;

      client.removeListener("connect", handleConnect);
      client.removeListener("reconnect", handleReconnect);
      client.removeListener("close", handleClose);
      client.removeListener("offline", handleClose);

      client.end(true);
    },
  };
}
