/**
 * Jerarquía de topics MQTT
 *
 * edificio/{edificioId}/
 *   ├── personal/{personalId}/
 *   │     ├── estado        → estado operativo del personal
 *   │     ├── posicion      → ubicación física en el edificio
 *   │     └── presencia     → online/offline (LWT)
 *   ├── alertas/
 *   │     └── {tipo}        → alertas del sistema (incendio, intrusion, falla...)
 *   ├── comandos/
 *   │     ├── {zona}        → comandos dirigidos a una zona
 *   │     └── broadcast     → comandos a todo el personal
 *   ├── telemetria/
 *   │     └── {dispositivo} → datos de sensores, HVAC, iluminación...
 *   └── mensajeria/
 *         ├── {salaId}      → salas de chat/grupos operativos
 *         └── privado/{de}/{para} → mensajes directos
 */

const BASE = 'edificio'

const edificio = (edificioId) => `${BASE}/${edificioId}`

export const topics = {
  personal: {
    base: (edificioId) => `${edificio(edificioId)}/personal`,
    estado: (edificioId, personalId) =>
      `${edificio(edificioId)}/personal/${personalId}/estado`,
    posicion: (edificioId, personalId) =>
      `${edificio(edificioId)}/personal/${personalId}/posicion`,
    presencia: (edificioId, personalId) =>
      `${edificio(edificioId)}/personal/${personalId}/presencia`,
  },
  alertas: {
    base: (edificioId) => `${edificio(edificioId)}/alertas`,
    tipo: (edificioId, tipo) =>
      `${edificio(edificioId)}/alertas/${tipo}`,
  },
  comandos: {
    base: (edificioId) => `${edificio(edificioId)}/comandos`,
    zona: (edificioId, zona) =>
      `${edificio(edificioId)}/comandos/${zona}`,
    broadcast: (edificioId) =>
      `${edificio(edificioId)}/comandos/broadcast`,
    soporte: (edificioId) =>
      `${edificio(edificioId)}/comandos/soporte`,
  },
  telemetria: {
    base: (edificioId) => `${edificio(edificioId)}/telemetria`,
    dispositivo: (edificioId, dispositivo) =>
      `${edificio(edificioId)}/telemetria/${dispositivo}`,
  },
  mensajeria: {
    base: (edificioId) => `${edificio(edificioId)}/mensajeria`,
    sala: (edificioId, salaId) =>
      `${edificio(edificioId)}/mensajeria/${salaId}`,
    privado: (edificioId, de, para) =>
      `${edificio(edificioId)}/mensajeria/privado/${de}/${para}`,
  },
}

export const TIPOS_ALERTA = [
  'incendio',
  'intrusion',
  'falla_electrica',
  'fuga_agua',
  'evacuacion',
  'general',
]

export const ESTADOS_PERSONAL = [
  'disponible',
  'ocupado',
  'en_ruta',
  'fuera_de_servicio',
]
