
import mongoose from 'mongoose'
import { Emergency } from './models/Emergency.js'

const STATUSES = new Set([
  'activa',
  'en_atencion',
  'resuelta'
])

export class HistoryError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function parseDate(value, label) {
  if (!value) return null

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HistoryError(400, `${label} debe tener formato AAAA-MM-DD.`)
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new HistoryError(400, `${label} no es una fecha válida.`)
  }

  return date
}

function positiveInteger(value, fallback, maximum, label) {
  if (value === null) return fallback

  if (!/^[1-9]\d*$/.test(value)) {
    throw new HistoryError(400, `${label} debe ser un entero positivo.`)
  }

  const number = Number(value)

  if (!Number.isSafeInteger(number) || number > maximum) {
    throw new HistoryError(400, `${label} excede el límite permitido.`)
  }

  return number
}

export async function queryEmergencyHistory(url, buildingId) {
  if (mongoose.connection.readyState !== 1) {
    throw new HistoryError(
      503,
      'El historial no está disponible. Comprueba la conexión con MongoDB.'
    )
  }

  const parameters = url.searchParams
  const allowed = new Set([
    'type', 'status', 'from', 'to', 'page', 'limit'
  ])

  for (const key of parameters.keys()) {
    if (!allowed.has(key) || parameters.getAll(key).length !== 1) {
      throw new HistoryError(400, 'Parámetros de consulta no válidos.')
    }
  }

  const type = parameters.get('type')
  const status = parameters.get('status')
  const from = parseDate(parameters.get('from'), 'La fecha inicial')
  const to = parseDate(parameters.get('to'), 'La fecha final')
  const page = positiveInteger(parameters.get('page'), 1, 1000000, 'page')
  const limit = positiveInteger(parameters.get('limit'), 20, 100, 'limit')

  if (type && (type.length > 80 || !type.trim())) {
    throw new HistoryError(400, 'Tipo de emergencia no válido.')
  }

  if (status && !STATUSES.has(status)) {
    throw new HistoryError(400, 'Estado de emergencia no válido.')
  }

  if (from && to && from > to) {
    throw new HistoryError(400, 'La fecha inicial no puede superar la final.')
  }

  const filter = { buildingId }

  if (type) filter.emergencyType = type.trim()
  if (status) filter.status = status

  if (from || to) {
    filter.timestamp = {}

    if (from) filter.timestamp.$gte = from

    if (to) {
      const nextDay = new Date(to)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      filter.timestamp.$lt = nextDay
    }
  }

  const skip = (page - 1) * limit

  try {
    const [total, records] = await Promise.all([
      Emergency.countDocuments(filter),
      Emergency.find(filter)
        .select('-_id -__v')
        .sort({ timestamp: -1, emergencyId: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ])

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch {
    throw new HistoryError(
      503,
      'No se pudo consultar el historial de emergencias.'
    )
  }
}
