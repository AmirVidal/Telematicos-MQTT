import { useEffect, useState } from "react";
import {
  createClientId,
  createMqttConnection,
  MQTT_URL,
} from "../services/mqttClient";
import {
  createPresenceClient,
  createPresenceWill,
} from "../services/presenceClient";

export function useMqtt(user = null, url = MQTT_URL) {
  const [clientId] = useState(createClientId);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const userId = user?.id;
  const userName = user?.name;
  const userRole = user?.role;

  useEffect(() => {
    let active = true;

    const connection = createMqttConnection({
      url,
      clientId,
      will: userId ? createPresenceWill(clientId) : undefined,

      onStatus: (nextStatus) => {
        if (!active) return;

        setStatus(nextStatus);

        if (nextStatus === "disconnected") {
          setConnectedUsers([]);
        }
      },

      onError: (nextError) => {
        if (active) {
          setError(nextError?.message ?? null);
        }
      },
    });

    const presence = userId
      ? createPresenceClient({
          client: connection.client,
          clientId,
          user: {
            id: userId,
            name: userName,
            role: userRole,
          },
          onUsers: (users) => {
            if (active) setConnectedUsers(users);
          },
          onError: (presenceError) => {
            if (active) setError(presenceError.message);
          },
        })
      : null;

    return () => {
      active = false;

      if (presence) {
        presence.stop(() => connection.stop());
      } else {
        connection.stop();
      }
    };
  }, [url, clientId, userId, userName, userRole]);

  return {
    url,
    clientId,
    status,
    error,
    connectedUsers,
  };
}
