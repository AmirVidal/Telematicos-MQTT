const SESSION_KEY = 'mqtt_user_session'

export const USER_ROLES = Object.freeze({
  SEGURIDAD: 'seguridad',
  MANTENIMIENTO: 'mantenimiento',
  RECEPCION: 'recepcion',
  LIMPIEZA: 'limpieza',
  ADMINISTRACION: 'administracion'
})

const VALID_ROLES = Object.values(USER_ROLES)

export function validateUser(name, role) {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('El nombre es obligatorio.')
  }

  const normalizedName = name.trim().replace(/\s+/g, ' ')

  if (normalizedName.length < 3 || normalizedName.length > 50) {
    throw new Error('El nombre debe tener entre 3 y 50 caracteres.')
  }

  if (!/^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u.test(normalizedName)) {
    throw new Error('El nombre contiene caracteres no permitidos.')
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error('El tipo de personal seleccionado no es válido.')
  }

  return normalizedName
}

export function createUserSession(name, role) {
  const normalizedName = validateUser(name, role)

  const user = {
    id: crypto.randomUUID(),
    name: normalizedName,
    role
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))

  return user
}

export function getUserSession() {
  const stored = sessionStorage.getItem(SESSION_KEY)

  if (!stored) return null

  try {
    const user = JSON.parse(stored)

    if (typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) {
      throw new Error('Identificador inválido.')
    }

    validateUser(user.name, user.role)

    return user
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearUserSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
