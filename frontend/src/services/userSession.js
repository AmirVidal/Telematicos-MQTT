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

export const LOGIN_USERS = Object.freeze([
  { username: 'seguridad', password: 'seg123', name: 'Carlos Ramirez', role: USER_ROLES.SEGURIDAD },
  { username: 'mantenimiento', password: 'pass123', name: 'Juan Perez', role: USER_ROLES.MANTENIMIENTO },
  { username: 'mantenimiento2', password: 'pass123', name: 'Ana Gomez', role: USER_ROLES.MANTENIMIENTO },
  { username: 'recepcion', password: 'recep123', name: 'Laura Fernandez', role: USER_ROLES.RECEPCION },
  { username: 'limpieza', password: 'limp123', name: 'Pedro Sanchez', role: USER_ROLES.LIMPIEZA },
  { username: 'administracion', password: 'admin123', name: 'Maria Torres', role: USER_ROLES.ADMINISTRACION }
])

export function authenticateUser(username, password) {
  const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : ''
  const account = LOGIN_USERS.find((candidate) => candidate.username === normalizedUsername)

  if (!account || account.password !== password) {
    throw new Error('Usuario o contrasena incorrectos.')
  }

  const user = {
    id: crypto.randomUUID(),
    name: account.name,
    role: account.role,
    username: account.username,
    password: account.password
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))

  return user
}
