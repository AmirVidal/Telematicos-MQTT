
import { useState } from 'react'
import {
  INCIDENT_TYPES,
  MAX_INCIDENT_LOCATION_LENGTH,
  MAX_INCIDENT_DESCRIPTION_LENGTH
} from '../config/incidentOptions'

export default function IncidentReportForm({ connected, onSend }) {
  const [type, setType] = useState(INCIDENT_TYPES[0].id)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending || !connected) return

    setSending(true)
    setFeedback(null)

    try {
      await onSend({ type, location, description })

      setLocation('')
      setDescription('')
      setFeedback({
        type: 'success',
        message: 'Incidente reportado mediante MQTT.'
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo enviar el reporte.'
      })
    } finally {
      setSending(false)
    }
  }

  const canSend =
    connected &&
    !sending &&
    Boolean(location.trim()) &&
    Boolean(description.trim())

  return (
    <section className="tarjeta soporte-solicitud incidente-formulario">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">INCIDENTES</p>
          <h2>Reportar incidente</h2>
        </div>
        <span className="etiqueta-protocolo">QoS 1</span>
      </div>

      <p className="soporte-descripcion">
        Registra un incidente ocurrido en las instalaciones del edificio.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="incident-type">Tipo de incidente</label>
        <select
          id="incident-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          disabled={sending}
          required
        >
          {INCIDENT_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label htmlFor="incident-location">Ubicación</label>
        <input
          id="incident-location"
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          maxLength={MAX_INCIDENT_LOCATION_LENGTH}
          placeholder="Ej. Laboratorio 2, segundo piso"
          disabled={sending}
          required
        />

        <label htmlFor="incident-description">Descripción</label>
        <textarea
          id="incident-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_INCIDENT_DESCRIPTION_LENGTH}
          placeholder="Describe lo ocurrido..."
          rows={4}
          disabled={sending}
          required
        />

        <div className="soporte-footer">
          <span className="soporte-contador">
            {description.length}/{MAX_INCIDENT_DESCRIPTION_LENGTH} caracteres
          </span>

          <button
            type="submit"
            className="soporte-boton"
            disabled={!canSend}
          >
            {sending ? 'Enviando...' : 'Reportar incidente'}
          </button>
        </div>

        {feedback && (
          <p
            className={`soporte-feedback soporte-feedback--${feedback.type}`}
            role="status"
          >
            {feedback.message}
          </p>
        )}

        {!connected && (
          <p className="soporte-feedback soporte-feedback--error">
            El broker MQTT está desconectado.
          </p>
        )}
      </form>
    </section>
  )
}
