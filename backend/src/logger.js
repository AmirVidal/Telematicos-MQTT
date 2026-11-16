import { config } from './config.js'

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = LEVELS[config.logLevel] ?? LEVELS.info

function write(level, message, meta = {}) {
  if (LEVELS[level] < threshold) return

  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...meta
  }

  const output = JSON.stringify(entry)
  const method = level === 'debug' ? 'log' : level

  console[method](output)
}

export const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta)
}
