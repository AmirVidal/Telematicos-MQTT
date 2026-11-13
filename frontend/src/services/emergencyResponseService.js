const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
export const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 3;
const STORAGE_PREFIX = "mqtt_hu14_own_response_";

function savedKey(userId, emergencyId) {
  return `${STORAGE_PREFIX}${userId}_${emergencyId}`;
}

async function parseApiResponse(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Error del servidor (${response.status}).`);
  }
  return result;
}

export function validateEvidence(files) {
  if (files.length < 1 || files.length > MAX_EVIDENCE_FILES) {
    throw new Error(`Adjunta entre 1 y ${MAX_EVIDENCE_FILES} archivos.`);
  }
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(
        "Solo se admiten imágenes JPG, PNG, WebP o documentos PDF.",
      );
    }
    if (!file.size || file.size > MAX_EVIDENCE_SIZE) {
      throw new Error("Cada archivo debe pesar entre 1 byte y 5 MB.");
    }
  }
}

function readOwnAccess(userId, emergencyId) {
  try {
    const stored = JSON.parse(
      sessionStorage.getItem(savedKey(userId, emergencyId)) || "null",
    );
    if (!stored || !stored.responseId || !stored.viewToken) return null;
    return stored;
  } catch {
    return null;
  }
}

export async function sendEmergencyResponse({
  emergencyId,
  user,
  description,
  files,
}) {
  if (!user?.id || !user.name || !user.role) {
    throw new Error("Debes identificarte antes de responder.");
  }
  if (!description.trim() || description.trim().length > 500) {
    throw new Error(
      "La descripción es obligatoria y no debe superar 500 caracteres.",
    );
  }
  validateEvidence(files);
  const form = new FormData();
  form.append("responderId", user.id);
  form.append("responderName", user.name);
  form.append("responderRole", user.role);
  form.append("description", description.trim());
  files.forEach((file) => form.append("evidence", file));

  const response = await fetch(
    `/api/emergencias/${encodeURIComponent(emergencyId)}/respuestas`,
    {
      method: "POST",
      body: form,
    },
  );
  const result = await parseApiResponse(response);
  sessionStorage.setItem(
    savedKey(user.id, emergencyId),
    JSON.stringify({
      responseId: result.response.responseId,
      viewToken: result.viewToken,
    }),
  );
  return result.response;
}

export async function loadOwnEmergencyResponse({ emergencyId, userId }) {
  const saved = readOwnAccess(userId, emergencyId);
  if (!saved) return null;
  const response = await fetch(
    `/api/emergencias/${encodeURIComponent(emergencyId)}/respuestas/${encodeURIComponent(saved.responseId)}`,
    { headers: { "X-Response-Token": saved.viewToken } },
  );
  if (response.status === 403 || response.status === 404) {
    sessionStorage.removeItem(savedKey(userId, emergencyId));
    return null;
  }
  const result = await parseApiResponse(response);
  return result.response;
}

export async function downloadOwnEvidence({ emergencyId, userId, evidence }) {
  const saved = readOwnAccess(userId, emergencyId);
  if (!saved)
    throw new Error("No se encontró tu autorización de acceso a la evidencia.");
  const response = await fetch(
    `/api/evidencias/${encodeURIComponent(evidence.id)}`,
    {
      headers: { "X-Response-Token": saved.viewToken },
    },
  );
  if (!response.ok) {
    throw new Error("No se pudo descargar la evidencia.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = evidence.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

export function clearOwnEmergencyResponses(userId) {
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(`${STORAGE_PREFIX}${userId}_`)) keys.push(key);
  }
  keys.forEach((key) => sessionStorage.removeItem(key));
}
