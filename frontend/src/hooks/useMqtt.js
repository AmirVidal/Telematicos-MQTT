import { useEffect, useState } from "react";
import {
  createClientId,
  createMqttConnection,
  MQTT_URL,
} from "../services/mqttClient";

export function useMqtt(url = MQTT_URL) {
  const [clientId] = useState(createClientId);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const connection = createMqttConnection({
      url,
      clientId,
      onStatus: (nextStatus) => {
        if (active) setStatus(nextStatus);
      },
      onError: (nextError) => {
        if (active) setError(nextError?.message ?? null);
      },
    });

    return () => {
      active = false;
      connection.stop();
    };
  }, [url, clientId]);

  return { url, clientId, status, error };
}
