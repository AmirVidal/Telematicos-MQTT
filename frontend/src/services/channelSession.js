import { getChannel } from "../config/channelOptions";

const SESSION_KEY = "mqtt_selected_channel";

export function getSelectedChannelId(userId) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY));

    return saved?.userId === userId && getChannel(saved.channelId)
      ? saved.channelId
      : "";
  } catch {
    return "";
  }
}

export function saveSelectedChannelId(userId, channelId) {
  if (!channelId) {
    clearSelectedChannelId();
    return;
  }

  if (!getChannel(channelId)) {
    throw new Error("El canal seleccionado no es válido.");
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, channelId }));
}

export function clearSelectedChannelId() {
  sessionStorage.removeItem(SESSION_KEY);
}
