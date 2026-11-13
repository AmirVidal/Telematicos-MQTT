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
    description: 'Comunicación entre todas las áreas',
    order: 1
  },
  {
    channelId: 'seguridad',
    name: 'Seguridad',
    description: 'Coordinación del personal de seguridad',
    order: 2
  },
  {
    channelId: 'mantenimiento',
    name: 'Mantenimiento',
    description: 'Solicitudes y coordinación de mantenimiento',
    order: 3
  },
  {
    channelId: 'recepcion',
    name: 'Recepción',
    description: 'Coordinación de recepción',
    order: 4
  },
  {
    channelId: 'limpieza',
    name: 'Limpieza',
    description: 'Coordinación del personal de limpieza',
    order: 5
  },
  {
    channelId: 'administracion',
    name: 'Administración',
    description: 'Comunicaciones administrativas',
    order: 6
  }
]

export const incidentTypes = [
  { typeId: 'incendio', label: 'Incendio', order: 1 },
  { typeId: 'intrusion', label: 'Intrusión', order: 2 },
  { typeId: 'falla_electrica', label: 'Falla eléctrica', order: 3 },
  { typeId: 'fuga_agua', label: 'Fuga de agua', order: 4 },
  { typeId: 'otro', label: 'Otro incidente', order: 5 }
]

export const roles = [
  { roleId: 'seguridad', label: 'Seguridad', order: 1 },
  { roleId: 'mantenimiento', label: 'Mantenimiento', order: 2 },
  { roleId: 'recepcion', label: 'Recepción', order: 3 },
  { roleId: 'limpieza', label: 'Limpieza', order: 4 },
  { roleId: 'administracion', label: 'Administración', order: 5 }
]
