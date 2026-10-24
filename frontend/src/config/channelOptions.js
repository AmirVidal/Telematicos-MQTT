import { topics } from "./mqttTopics";

export const BUILDING_ID = "principal";

export const CHANNELS = Object.freeze([
  {
    id: "general",
    name: "General",
    description: "Comunicación entre todas las áreas",
  },
  {
    id: "seguridad",
    name: "Seguridad",
    description: "Coordinación del personal de seguridad",
  },
  {
    id: "mantenimiento",
    name: "Mantenimiento",
    description: "Solicitudes y coordinación de mantenimiento",
  },
  {
    id: "recepcion",
    name: "Recepción",
    description: "Coordinación de recepción",
  },
  {
    id: "limpieza",
    name: "Limpieza",
    description: "Coordinación del personal de limpieza",
  },
  {
    id: "administracion",
    name: "Administración",
    description: "Comunicaciones administrativas",
  },
]);

export function getChannel(channelId) {
  return CHANNELS.find((channel) => channel.id === channelId) ?? null;
}

export function getChannelTopic(channelId) {
  const channel = getChannel(channelId);

  return channel ? topics.mensajeria.sala(BUILDING_ID, channel.id) : null;
}
