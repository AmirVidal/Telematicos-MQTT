import { createServer } from "node:http";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import { config } from "./config.js";
import { ROLES } from "./constants.js";
import { Event } from "./models/Event.js";
import { EmergencyResponse } from "./models/EmergencyResponse.js";
import { SupportRequest } from "./models/SupportRequest.js";
import { SupportMessage } from "./models/SupportMessage.js";
import { SupportResolution } from "./models/SupportResolution.js";
import { logger } from "./logger.js";
import { timingSafeEqual as compareTokens } from 'node:crypto'
import { queryEmergencyHistory, HistoryError } from './emergencyHistory.js'
import { exportEmergencyCsv } from './emergencyCsv.js'
import { Emergency } from './models/Emergency.js'

const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_FILES * MAX_FILE_BYTES + 128 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const SUPPORT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORT_ACTIVE_STATUSES = ["pendiente", "en_proceso"];
const SUPPORT_EVIDENCE_BUCKET = "support_evidence";
const MAX_SUPPORT_TEXT = 1000;
const MAX_JSON_BYTES = 64 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(payload));
}

function requireId(id, label) {
  if (!UUID.test(id || "")) throw new HttpError(400, `${label} no válido.`);
}

function safeText(value, maxLength, label) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new HttpError(
      400,
      `${label} es obligatorio y debe tener máximo ${maxLength} caracteres.`,
    );
  }
  return value.trim();
}

function detectMime(buffer) {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF")
    return "application/pdf";
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString() === "RIFF" &&
    buffer.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "image/jpeg";
  return null;
}

async function parseForm(req) {
  const contentType = req.headers["content-type"] || "";
  if (!contentType.startsWith("multipart/form-data;")) {
    throw new HttpError(415, "Envía un formulario multipart/form-data.");
  }
  const length = Number(req.headers["content-length"]);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    throw new HttpError(413, "Los archivos exceden el tamaño permitido.");
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES)
      throw new HttpError(413, "Los archivos exceden el tamaño permitido.");
    chunks.push(chunk);
  }
  try {
    return await new Request("http://localhost/upload", {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: Buffer.concat(chunks),
    }).formData();
  } catch {
    throw new HttpError(400, "No se pudo interpretar el formulario enviado.");
  }
}

function requireToken(req, response) {
  const token = req.headers["x-response-token"];
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
    throw new HttpError(403, "No tienes acceso a esta respuesta.");
  }
  const submitted = Buffer.from(
    createHash("sha256").update(token).digest("hex"),
    "hex",
  );
  const stored = Buffer.from(response.accessTokenHash || "", "hex");
  if (
    stored.length !== submitted.length ||
    !timingSafeEqual(stored, submitted)
  ) {
    throw new HttpError(403, "No tienes acceso a esta respuesta.");
  }
}

function publicResponse(response) {
  return {
    responseId: response.responseId,
    emergencyId: response.emergencyId,
    responderName: response.responderName,
    responderRole: response.responderRole,
    description: response.description,
    evidence: response.evidence.map((item) => ({
      id: item.fileId.toString(),
      filename: item.filename,
      mimeType: item.mimeType,
      size: item.size,
    })),
    createdAt: response.createdAt,
  };
}

async function uploadEvidence(
  files,
  {
    bucketName = "emergency_evidence",
    allowedTypes = FILE_TYPES,
    invalidMessage = "Solo se admiten archivos JPG, PNG, WebP o PDF válidos.",
  } = {},
) {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName,
  });
  const saved = [];
  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = detectMime(buffer);
      if (!mimeType || mimeType !== file.type || !allowedTypes.has(mimeType)) {
        throw new HttpError(415, invalidMessage);
      }
      if (!buffer.length || buffer.length > MAX_FILE_BYTES) {
        throw new HttpError(
          413,
          "Cada evidencia debe tener un tamaño de hasta 5 MB.",
        );
      }
      const filename = (file.name || "evidencia")
        .replace(/[\\/\x00-\x1f]/g, "_")
        .slice(0, 120);
      const stream = bucket.openUploadStream(filename, {
        metadata: { mimeType },
        contentType: mimeType,
      });
      await new Promise((resolve, reject) => {
        stream.on("error", reject);
        stream.on("finish", resolve);
        stream.end(buffer);
      });
      saved.push({
        fileId: stream.id,
        filename,
        mimeType,
        size: buffer.length,
      });
    }
  } catch (error) {
    await Promise.allSettled(saved.map((item) => bucket.delete(item.fileId)));
    throw error;
  }
  return { bucket, saved };
}

async function postResponse(req, res, emergencyId) {
  requireId(emergencyId, "Identificador de emergencia");
  const activeTopic = `edificio/${config.buildingId}/alertas/emergencias/activas/${emergencyId}`;
  const exists = await Event.exists({
    eventId: emergencyId,
    buildingId: config.buildingId,
    category: "alertas",
    "payload.type": "emergencia",
  });
  if (!exists)
    throw new HttpError(
      404,
      "La emergencia todavía no está registrada en MongoDB.",
    );
  // No se pueden consultar las respuestas de otros usuarios: solo se entrega la respuesta creada.
  const form = await parseForm(req);
  const description = safeText(
    form.get("description"),
    500,
    "La descripción de la atención",
  );
  const responderId = safeText(
    form.get("responderId"),
    64,
    "El identificador del usuario",
  );
  requireId(responderId, "Identificador del usuario");
  const responderName = safeText(
    form.get("responderName"),
    50,
    "El nombre del responsable",
  );
  const responderRole = safeText(
    form.get("responderRole"),
    40,
    "El rol del responsable",
  );
  if (!ROLES.includes(responderRole))
    throw new HttpError(400, "El rol no es válido.");
      const storedEmergency = await Emergency.findOne({
      emergencyId,
      buildingId: config.buildingId
    })
      .select('assignedRole status')
      .lean()

    if (!storedEmergency) {
      throw new HttpError(
        404,
        'No se encontró la emergencia.'
      )
    }

    if (storedEmergency.status === 'resuelta') {
      throw new HttpError(
        409,
        'La emergencia ya fue resuelta.'
      )
    }

    if (!storedEmergency.assignedRole) {
      throw new HttpError(
        409,
        'La emergencia todavía no tiene un rol responsable.'
      )
    }

    if (storedEmergency.assignedRole !== responderRole) {
      throw new HttpError(
        403,
        'Tu rol no está asignado para atender esta emergencia.'
      )
    }
  const evidenceFiles = form.getAll("evidence");
  if (
    evidenceFiles.length < 1 ||
    evidenceFiles.length > MAX_FILES ||
    evidenceFiles.some((f) => typeof f?.arrayBuffer !== "function")
  ) {
    throw new HttpError(400, `Adjunta entre 1 y ${MAX_FILES} evidencias.`);
  }
  if (
    evidenceFiles.some(
      (f) => f.size > MAX_FILE_BYTES || !FILE_TYPES.has(f.type),
    )
  ) {
    throw new HttpError(
      413,
      "Los archivos deben ser JPG, PNG, WebP o PDF y pesar hasta 5 MB.",
    );
  }

  const { bucket, saved } = await uploadEvidence(evidenceFiles);
  const viewToken = randomBytes(32).toString("hex");
  try {
    const response = await EmergencyResponse.create({
      responseId: randomUUID(),
      emergencyId,
      buildingId: config.buildingId,
      responderId,
      responderName,
      responderRole,
      description,
      evidence: saved,
      accessTokenHash: createHash("sha256").update(viewToken).digest("hex"),
    });
    json(res, 201, { response: publicResponse(response), viewToken });
  } catch (error) {
    await Promise.allSettled(saved.map((item) => bucket.delete(item.fileId)));
    throw error;
  }
}

async function getResponse(req, res, emergencyId, responseId) {
  requireId(emergencyId, "Identificador de emergencia");
  requireId(responseId, "Identificador de respuesta");
  const response = await EmergencyResponse.findOne({
    emergencyId,
    responseId,
  }).select("+accessTokenHash");
  if (!response) throw new HttpError(404, "Respuesta no encontrada.");
  requireToken(req, response);
  json(res, 200, { response: publicResponse(response) });
}

async function getEvidence(req, res, fileId) {
  if (!mongoose.isValidObjectId(fileId))
    throw new HttpError(400, "Archivo no válido.");
  const response = await EmergencyResponse.findOne({
    "evidence.fileId": new mongoose.Types.ObjectId(fileId),
  }).select("+accessTokenHash");
  if (!response) throw new HttpError(404, "Evidencia no encontrada.");
  requireToken(req, response);
  const evidence = response.evidence.find(
    (item) => item.fileId.toString() === fileId,
  );
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "emergency_evidence",
  });
  res.writeHead(200, {
    "Content-Type": evidence.mimeType,
    "Content-Disposition": `attachment; filename="${evidence.filename.replace(/["\\]/g, "_")}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const stream = bucket.openDownloadStream(evidence.fileId);
  stream.on("error", (error) => {
    logger.error("evidence download failed", { error: error.message });
    if (!res.headersSent)
      json(res, 500, { error: "No se pudo descargar la evidencia." });
    else res.destroy();
  });
  stream.pipe(res);
}


function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_JSON_BYTES)
      throw new HttpError(413, "El cuerpo de la solicitud es demasiado grande.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) throw new HttpError(400, "El cuerpo de la solicitud está vacío.");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "El cuerpo debe ser un objeto JSON válido.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new HttpError(400, "El cuerpo debe ser un objeto JSON válido.");
  return parsed;
}

function normalizeSupportName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function supportIdentityFromPayload(payload, idKey, nameKey, roleKey) {
  const userId = payload?.[idKey] ?? payload?.userId;
  const name = payload?.[nameKey] ?? payload?.name;
  const role = payload?.[roleKey] ?? payload?.role;
  requireId(userId, "Identificador de usuario");
  const normalizedName = safeText(name, 50, "El nombre del usuario");
  if (normalizedName.length < 3)
    throw new HttpError(400, "El nombre del usuario no es válido.");
  if (typeof role !== "string" || !ROLES.includes(role))
    throw new HttpError(400, "El rol del usuario no es válido.");
  return { userId, name: normalizedName, role };
}

function supportIdentityFromQuery(url) {
  const params = url.searchParams;
  return supportIdentityFromPayload(
    {
      userId: params.get("userId"),
      name: params.get("name"),
      role: params.get("role"),
    },
    "userId",
    "name",
    "role",
  );
}

function samePerson(identity, document, prefix) {
  const id = document[`${prefix}Id`];
  const name = normalizeSupportName(document[`${prefix}Name`]);
  const role = document[`${prefix}Role`] ?? "";
  return Boolean(
    (identity.userId && id && identity.userId === id) ||
      (name &&
        name === normalizeSupportName(identity.name) &&
        role === identity.role),
  );
}

function isSupportParticipant(document, identity) {
  return (
    samePerson(identity, document, "requester") ||
    samePerson(identity, document, "responder")
  );
}

function identityClauses(prefix, identity) {
  return [
    { [`${prefix}Id`]: identity.userId },
    {
      [`${prefix}Name`]: {
        $regex: `^${escapeRegex(identity.name)}$`,
        $options: "i",
      },
      [`${prefix}Role`]: identity.role,
    },
  ];
}

function publicSupportRequest(document) {
  return {
    id: document.requestId,
    requestId: document.requestId,
    buildingId: document.buildingId,
    requesterId: document.requesterId ?? null,
    requesterName: document.requesterName,
    requesterRole: document.requesterRole ?? "",
    description: document.description,
    status: document.status,
    responderId: document.responderId ?? null,
    responderName: document.responderName ?? null,
    responderRole: document.responderRole ?? "",
    respondedAt: document.respondedAt ?? null,
    resolvedAt: document.resolvedAt ?? null,
    timestamp: document.timestamp,
    receivedAt: document.receivedAt,
  };
}

function publicSupportMessage(document) {
  return {
    id: document.messageId,
    messageId: document.messageId,
    requestId: document.requestId,
    senderId: document.senderId,
    senderName: document.senderName,
    senderRole: document.senderRole,
    content: document.content,
    timestamp: document.timestamp,
    createdAt: document.createdAt,
  };
}

function publicSupportResolution(document) {
  return {
    resolutionId: document.resolutionId,
    requestId: document.requestId,
    buildingId: document.buildingId,
    responderId: document.responderId,
    responderName: document.responderName,
    responderRole: document.responderRole,
    requesterId: document.requesterId ?? null,
    requesterName: document.requesterName,
    requesterRole: document.requesterRole ?? "",
    requestDescription: document.requestDescription,
    requestCreatedAt: document.requestCreatedAt,
    problem: document.problem,
    resolution: document.resolution,
    evidence: (document.evidence ?? []).map((item) => ({
      id: item.fileId.toString(),
      filename: item.filename,
      mimeType: item.mimeType,
      size: item.size,
    })),
    resolvedAt: document.resolvedAt,
  };
}

async function getSupportRequests(req, res, url) {
  const identity = supportIdentityFromQuery(url);
  const canSeeAll = ["mantenimiento", "administracion"].includes(identity.role);
  const filter = canSeeAll
    ? { status: { $in: SUPPORT_ACTIVE_STATUSES } }
    : {
        status: { $in: SUPPORT_ACTIVE_STATUSES },
        $or: identityClauses("requester", identity),
      };
  const documents = await SupportRequest.find(filter)
    .sort({ timestamp: -1 })
    .limit(300)
    .lean();
  json(res, 200, { requests: documents.map(publicSupportRequest) });
}

async function respondSupportRequest(req, res, requestId) {
  requireId(requestId, "Identificador de solicitud");
  const body = await readJsonBody(req);
  const identity = supportIdentityFromPayload(
    body,
    "responderId",
    "responderName",
    "responderRole",
  );
  if (identity.role !== "mantenimiento")
    throw new HttpError(
      403,
      "Solo el personal de mantenimiento puede responder solicitudes de soporte.",
    );
  const request = await SupportRequest.findOne({ requestId });
  if (!request) throw new HttpError(404, "Solicitud de soporte no encontrada.");
  if (request.status === "resuelta")
    throw new HttpError(409, "La solicitud de soporte ya fue resuelta.");
  if (request.responderName && !samePerson(identity, request, "responder"))
    throw new HttpError(
      409,
      `La solicitud ya fue tomada por ${request.responderName}.`,
    );
  if (!request.responderName) {
    request.responderId = identity.userId;
    request.responderName = identity.name;
    request.responderRole = identity.role;
    request.status = "en_proceso";
    request.respondedAt = new Date();
    await request.save();
  }
  json(res, 200, { request: publicSupportRequest(request) });
}

async function getSupportChats(req, res, url) {
  const identity = supportIdentityFromQuery(url);
  const documents = await SupportRequest.find({
    responderName: { $exists: true, $ne: null },
    $or: [
      ...identityClauses("requester", identity),
      ...identityClauses("responder", identity),
    ],
  })
    .sort({ respondedAt: -1, timestamp: -1 })
    .limit(300)
    .lean();
  json(res, 200, { chats: documents.map(publicSupportRequest) });
}

async function getSupportChatMessages(req, res, url, requestId) {
  requireId(requestId, "Identificador de solicitud");
  const identity = supportIdentityFromQuery(url);
  const request = await SupportRequest.findOne({ requestId }).lean();
  if (!request) throw new HttpError(404, "Solicitud de soporte no encontrada.");
  if (!isSupportParticipant(request, identity))
    throw new HttpError(403, "No tienes acceso a esta conversación.");
  const messages = await SupportMessage.find({ requestId })
    .sort({ timestamp: 1 })
    .limit(1000)
    .lean();
  json(res, 200, {
    request: publicSupportRequest(request),
    messages: messages.map(publicSupportMessage),
  });
}

async function postSupportChatMessage(req, res, requestId) {
  requireId(requestId, "Identificador de solicitud");
  const body = await readJsonBody(req);
  const identity = supportIdentityFromPayload(
    body,
    "senderId",
    "senderName",
    "senderRole",
  );
  const request = await SupportRequest.findOne({ requestId });
  if (!request) throw new HttpError(404, "Solicitud de soporte no encontrada.");
  if (!isSupportParticipant(request, identity))
    throw new HttpError(403, "No tienes acceso a esta conversación.");
  if (!request.responderName)
    throw new HttpError(409, "La conversación todavía no ha sido iniciada.");
  if (request.status === "resuelta")
    throw new HttpError(409, "La solicitud de soporte ya fue resuelta.");
  const content = safeText(body.content, 500, "El mensaje");
  const message = await SupportMessage.create({
    messageId: randomUUID(),
    requestId,
    buildingId: request.buildingId,
    senderId: identity.userId,
    senderName: identity.name,
    senderRole: identity.role,
    content,
    timestamp: new Date(),
  });
  json(res, 201, { message: publicSupportMessage(message) });
}

async function postSupportResolution(req, res, requestId) {
  requireId(requestId, "Identificador de solicitud");
  const form = await parseForm(req);
  const identity = supportIdentityFromPayload(
    {
      responderId: form.get("responderId"),
      responderName: form.get("responderName"),
      responderRole: form.get("responderRole"),
    },
    "responderId",
    "responderName",
    "responderRole",
  );
  if (identity.role !== "mantenimiento")
    throw new HttpError(
      403,
      "Solo el personal de mantenimiento puede resolver solicitudes de soporte.",
    );
  const problem = safeText(
    form.get("problem"),
    MAX_SUPPORT_TEXT,
    "El problema encontrado",
  );
  const solution = safeText(
    form.get("resolution"),
    MAX_SUPPORT_TEXT,
    "La solución aplicada",
  );
  const request = await SupportRequest.findOne({ requestId });
  if (!request) throw new HttpError(404, "Solicitud de soporte no encontrada.");
  if (request.status === "resuelta")
    throw new HttpError(409, "La solicitud de soporte ya fue resuelta.");
  if (request.responderName && !samePerson(identity, request, "responder"))
    throw new HttpError(
      403,
      "La solicitud está asignada a otro usuario de mantenimiento.",
    );
  const evidenceFiles = form.getAll("evidence");
  if (
    evidenceFiles.length < 1 ||
    evidenceFiles.length > MAX_FILES ||
    evidenceFiles.some((file) => typeof file?.arrayBuffer !== "function")
  )
    throw new HttpError(400, `Adjunta entre 1 y ${MAX_FILES} imágenes.`);
  if (
    evidenceFiles.some(
      (file) => file.size > MAX_FILE_BYTES || !SUPPORT_IMAGE_TYPES.has(file.type),
    )
  )
    throw new HttpError(
      413,
      "Las imágenes deben ser JPG, PNG o WebP y pesar hasta 5 MB.",
    );

  const { bucket, saved } = await uploadEvidence(evidenceFiles, {
    bucketName: SUPPORT_EVIDENCE_BUCKET,
    allowedTypes: SUPPORT_IMAGE_TYPES,
    invalidMessage: "Solo se admiten imágenes JPG, PNG o WebP válidas.",
  });
  try {
    const now = new Date();
    const resolutionDocument = await SupportResolution.create({
      resolutionId: randomUUID(),
      requestId,
      buildingId: request.buildingId,
      responderId: identity.userId,
      responderName: identity.name,
      responderRole: identity.role,
      requesterId: request.requesterId ?? null,
      requesterName: request.requesterName,
      requesterRole: request.requesterRole ?? "",
      requestDescription: request.description,
      requestCreatedAt: request.timestamp,
      problem,
      resolution: solution,
      evidence: saved,
      resolvedAt: now,
    });
    await SupportRequest.updateOne(
      { requestId },
      {
        $set: {
          status: "resuelta",
          responderId: identity.userId,
          responderName: identity.name,
          responderRole: identity.role,
          respondedAt: request.respondedAt ?? now,
          resolvedAt: now,
        },
      },
    );
    json(res, 201, {
      resolution: publicSupportResolution(resolutionDocument),
    });
  } catch (error) {
    await Promise.allSettled(saved.map((item) => bucket.delete(item.fileId)));
    throw error;
  }
}

async function getSupportResolutions(req, res, url) {
  const identity = supportIdentityFromQuery(url);
  const canSeeAll = ["mantenimiento", "administracion"].includes(identity.role);
  const filter = canSeeAll
    ? {}
    : { $or: identityClauses("requester", identity) };
  const documents = await SupportResolution.find(filter)
    .sort({ resolvedAt: -1 })
    .limit(300)
    .lean();
  json(res, 200, { resolutions: documents.map(publicSupportResolution) });
}

async function getSupportEvidence(req, res, resolutionId, fileId) {
  requireId(resolutionId, "Identificador de resolución");
  if (!mongoose.isValidObjectId(fileId))
    throw new HttpError(400, "Archivo no válido.");
  const resolutionDocument = await SupportResolution.findOne({
    resolutionId,
  }).lean();
  if (!resolutionDocument)
    throw new HttpError(404, "Resolución no encontrada.");
  const evidence = (resolutionDocument.evidence ?? []).find(
    (item) => item.fileId.toString() === fileId,
  );
  if (!evidence) throw new HttpError(404, "Evidencia no encontrada.");
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: SUPPORT_EVIDENCE_BUCKET,
  });
  res.writeHead(200, {
    "Content-Type": evidence.mimeType,
    "Content-Disposition": `inline; filename="${evidence.filename.replace(/["\\]/g, "_")}"`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const stream = bucket.openDownloadStream(evidence.fileId);
  stream.on("error", (error) => {
    logger.error("support evidence download failed", { error: error.message });
    if (!res.headersSent)
      json(res, 500, { error: "No se pudo descargar la evidencia." });
    else res.destroy();
  });
  stream.pipe(res);
}

function requireHistoryToken(req) {
  const expected = process.env.HISTORY_API_TOKEN

  if (!expected || expected.length < 32) {
    throw new HttpError(503, 'La consulta histórica no está configurada.')
  }

  const authorization = req.headers.authorization || ''
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : ''

  const provided = Buffer.from(token)
  const configured = Buffer.from(expected)

  if (
    provided.length !== configured.length ||
    !compareTokens(provided, configured)
  ) {
    throw new HttpError(401, 'No autorizado para consultar el historial.')
  }
}

export function startHttpApi(port = config.apiPort) {
  const server = createServer(async (req, res) => {
    try {
      
      const requestUrl = new URL(req.url, 'http://localhost')
      const path = requestUrl.pathname
      const responseMatch = path.match(
        /^\/api\/emergencias\/([^/]+)\/respuestas(?:\/([^/]+))?$/,
      );
      const evidenceMatch = path.match(/^\/api\/evidencias\/([^/]+)$/);
      const supportRequestActionMatch = path.match(
        /^\/api\/soporte\/solicitudes\/([^/]+)\/(responder|resolver)$/,
      );
      const supportChatMessagesMatch = path.match(
        /^\/api\/soporte\/chats\/([^/]+)\/mensajes$/,
      );
      const supportEvidenceMatch = path.match(
        /^\/api\/soporte\/resueltos\/([^/]+)\/evidencias\/([^/]+)$/,
      );

      if (req.method === "GET" && path === "/api/soporte/solicitudes") {
        await getSupportRequests(req, res, requestUrl);
        return;
      }
      if (
        req.method === "POST" &&
        supportRequestActionMatch?.[2] === "responder"
      ) {
        await respondSupportRequest(req, res, supportRequestActionMatch[1]);
        return;
      }
      if (
        req.method === "POST" &&
        supportRequestActionMatch?.[2] === "resolver"
      ) {
        await postSupportResolution(req, res, supportRequestActionMatch[1]);
        return;
      }
      if (req.method === "GET" && path === "/api/soporte/chats") {
        await getSupportChats(req, res, requestUrl);
        return;
      }
      if (req.method === "GET" && supportChatMessagesMatch) {
        await getSupportChatMessages(
          req,
          res,
          requestUrl,
          supportChatMessagesMatch[1],
        );
        return;
      }
      if (req.method === "POST" && supportChatMessagesMatch) {
        await postSupportChatMessage(
          req,
          res,
          supportChatMessagesMatch[1],
        );
        return;
      }
      if (req.method === "GET" && path === "/api/soporte/resueltos") {
        await getSupportResolutions(req, res, requestUrl);
        return;
      }
      if (req.method === "GET" && supportEvidenceMatch) {
        await getSupportEvidence(
          req,
          res,
          supportEvidenceMatch[1],
          supportEvidenceMatch[2],
        );
        return;
      }

      if (req.method === 'GET' && path === '/api/emergencies/history/export') {
        requireHistoryToken(req)

        const csv = await exportEmergencyCsv(requestUrl, config.buildingId)

        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="historial-emergencias.csv"',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff'
        })

        res.end(csv)
        return
      }
      
      if (req.method === 'GET' && path === '/api/emergencies/history') {
        requireHistoryToken(req)

        const result = await queryEmergencyHistory(
          requestUrl,
          config.buildingId
        )

        json(res, 200, result)
        return
      }
      if (req.method === "POST" && responseMatch && !responseMatch[2]) {
        await postResponse(req, res, responseMatch[1]);
      } else if (req.method === "GET" && responseMatch?.[2]) {
        await getResponse(req, res, responseMatch[1], responseMatch[2]);
      } else if (req.method === "GET" && evidenceMatch) {
        await getEvidence(req, res, evidenceMatch[1]);
      } else if (req.method === "GET" && path === "/api/health") {
        json(res, 200, { ok: true });
      } else {
        json(res, 404, { error: "Ruta no encontrada." });
      }
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status =error instanceof HttpError || error instanceof HistoryError ? error.status : 500;
      if (status === 500)
        logger.error("http api error", { error: error.message });
      json(res, status, {
        error: status === 500 ? "Error interno del servidor." : error.message,
      });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      server.off("error", reject);
      logger.info("http api started", { port });
      resolve(server);
    });
  });
}
