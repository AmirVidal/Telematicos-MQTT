export const buildings = [
  {
    buildingId: 'principal',
    name: 'Edificio principal',
    address: ''
  }
]

export const channels = [
  {
    channelId: 'general',
    name: 'General',
    description: 'Comunicacion entre todas las areas',
    order: 1
  },
  {
    channelId: 'seguridad',
    name: 'Seguridad',
    description: 'Coordinacion del personal de seguridad',
    order: 2
  },
  {
    channelId: 'mantenimiento',
    name: 'Mantenimiento',
    description: 'Solicitudes y coordinacion de mantenimiento',
    order: 3
  },
  {
    channelId: 'recepcion',
    name: 'Recepcion',
    description: 'Coordinacion de recepcion',
    order: 4
  },
  {
    channelId: 'limpieza',
    name: 'Limpieza',
    description: 'Coordinacion del personal de limpieza',
    order: 5
  },
  {
    channelId: 'administracion',
    name: 'Administracion',
    description: 'Comunicaciones administrativas',
    order: 6
  }
]

export const incidentTypes = [
  { typeId: 'incendio', label: 'Incendio', order: 1 },
  { typeId: 'intrusion', label: 'Intrusion', order: 2 },
  { typeId: 'falla_electrica', label: 'Falla electrica', order: 3 },
  { typeId: 'fuga_agua', label: 'Fuga de agua', order: 4 },
  { typeId: 'otro', label: 'Otro incidente', order: 5 }
]

export const roles = [
  { roleId: 'seguridad', label: 'Seguridad', order: 1 },
  { roleId: 'mantenimiento', label: 'Mantenimiento', order: 2 },
  { roleId: 'recepcion', label: 'Recepcion', order: 3 },
  { roleId: 'limpieza', label: 'Limpieza', order: 4 },
  { roleId: 'administracion', label: 'Administracion', order: 5 }
]

export const staffUsers = [
  { userId: 'seguridad', name: 'Carlos Ramirez', role: 'seguridad', online: false, firstSeenAt: new Date(), lastSeenAt: new Date(), lastBuildingId: 'principal' },
  { userId: 'mantenimiento', name: 'Juan Perez', role: 'mantenimiento', online: false, firstSeenAt: new Date(), lastSeenAt: new Date(), lastBuildingId: 'principal' },
  { userId: 'mantenimiento2', name: 'Ana Gomez', role: 'mantenimiento', online: false, firstSeenAt: new Date(), lastSeenAt: new Date(), lastBuildingId: 'principal' },
  { userId: 'recepcion', name: 'Laura Fernandez', role: 'recepcion', online: false, firstSeenAt: new Date(), lastSeenAt: new Date(), lastBuildingId: 'principal' },
  { userId: 'limpieza', name: 'Pedro Sanchez', role: 'limpieza', online: false, firstSeenAt: new Date(), lastSeenAt: new Date(), lastBuildingId: 'principal' },
  { userId: 'administracion', name: 'Maria Torres', role: 'administracion', online: false, firstSeenAt: new Date(), lastSeenAt: new Date(), lastBuildingId: 'principal' }
]