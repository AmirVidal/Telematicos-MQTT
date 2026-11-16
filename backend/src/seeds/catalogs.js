export const buildings = [
  {
    buildingId: "principal",
    name: "Edificio principal",
    address: "",
  },
];

export const channels = [
  {
    channelId: "general",
    name: "General",
    description: "Comunicacion entre todas las areas",
    order: 1,
  },
  {
    channelId: "seguridad",
    name: "Seguridad",
    description: "Coordinacion del personal de seguridad",
    order: 2,
  },
  {
    channelId: "mantenimiento",
    name: "Mantenimiento",
    description: "Solicitudes y coordinacion de mantenimiento",
    order: 3,
  },
  {
    channelId: "recepcion",
    name: "Recepcion",
    description: "Coordinacion de recepcion",
    order: 4,
  },
  {
    channelId: "limpieza",
    name: "Limpieza",
    description: "Coordinacion del personal de limpieza",
    order: 5,
  },
  {
    channelId: "administracion",
    name: "Administracion",
    description: "Comunicaciones administrativas",
    order: 6,
  },
];

export const incidentTypes = [
  { typeId: "incendio", label: "Incendio", order: 1 },
  { typeId: "intrusion", label: "Intrusion", order: 2 },
  { typeId: "falla_electrica", label: "Falla electrica", order: 3 },
  { typeId: "fuga_agua", label: "Fuga de agua", order: 4 },
  { typeId: "otro", label: "Otro incidente", order: 5 },
];

export const roles = [
  { roleId: "seguridad", label: "Seguridad", order: 1 },
  { roleId: "mantenimiento", label: "Mantenimiento", order: 2 },
  { roleId: "recepcion", label: "Recepcion", order: 3 },
  { roleId: "limpieza", label: "Limpieza", order: 4 },
  { roleId: "administracion", label: "Administracion", order: 5 },
];

export const staffUsers = [
  {
    userId: "ba7d8d48-5050-454f-8434-d386c90297f9",
    name: "Carlos Ramirez",
    role: "seguridad",
    online: false,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    lastBuildingId: "principal",
  },
  {
    userId: "fefececa-cac5-4b5c-b669-fa65db2951e1",
    name: "Juan Perez",
    role: "mantenimiento",
    online: false,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    lastBuildingId: "principal",
  },
  {
    userId: "f42bae18-c553-409d-8d01-71a4599f0fc9",
    name: "Ana Gomez",
    role: "mantenimiento",
    online: false,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    lastBuildingId: "principal",
  },
  {
    userId: "df831c73-5baf-40f2-8f52-9d028eaa8e43",
    name: "Laura Fernandez",
    role: "recepcion",
    online: false,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    lastBuildingId: "principal",
  },
  {
    userId: "9a99e4e8-7a17-46a6-87f4-63467c8d0eea",
    name: "Pedro Sanchez",
    role: "limpieza",
    online: false,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    lastBuildingId: "principal",
  },
  {
    userId: "7fe426b7-0041-4551-811c-702f63ac9404",
    name: "Maria Torres",
    role: "administracion",
    online: false,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    lastBuildingId: "principal",
  },
];
