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
import { logger } from "./logger.js";
import { timingSafeEqual as compareTokens } from 'node:crypto'
import { queryEmergencyHistory, HistoryError } from './emergencyHistory.js'


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

async function uploadEvidence(files) {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "emergency_evidence",
  });
  const saved = [];
  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = detectMime(buffer);
      if (!mimeType || mimeType !== file.type || !FILE_TYPES.has(mimeType)) {
        throw new HttpError(
          415,
          "Solo se admiten archivos JPG, PNG, WebP o PDF válidos.",
        );
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
