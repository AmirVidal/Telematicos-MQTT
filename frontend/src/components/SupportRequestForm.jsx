import { useState } from 'react'
import { MAX_SUPPORT_DESCRIPTION_LENGTH } from '../services/supportRequestPublisher'

export default function SupportRequestForm({ connected, onSend }) {
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending) return

    setFeedback(null)
    setSending(true)

    try {
      await onSend(description)

      setDescription('')
      setFeedback({
        type: 'success',
        message: 'Solicitud de soporte enviada correctamente.'
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo enviar la solicitud de soporte.'
      })
    } finally {
      setSending(false)
    }
  }

  const canSend =
    connected &&
    Boolean(description.trim()) &&
    description.trim().length <= MAX_SUPPORT_DESCRIPTION_LENGTH &&
    !sending

  return (
    <section className="tarjeta soporte-solicitud">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">SOLICITUDES DE SOPORTE</p>
          <h2>Enviar solicitud de soporte</h2>
        </div>
        <span className="etiqueta-protocolo">QoS 1</span>
      </div>

      <p className="soporte-descripcion">
        Describe la incidencia o solicitud para que el equipo de soporte la reciba.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="support-description">Descripción de la solicitud</label>

        <textarea
          id="support-description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
            setFeedback(null)
          }}
          placeholder="Ej. Necesito ayuda para acceder al laboratorio..."
          maxLength={MAX_SUPPORT_DESCRIPTION_LENGTH}
          rows={4}
          disabled={sending}
          required
        />

        <div className="soporte-footer">
          <span className="soporte-contador">
            {description.length}/{MAX_SUPPORT_DESCRIPTION_LENGTH} caracteres
          </span>

          <button type="submit" className="soporte-boton" disabled={!canSend}>
            {sending ? 'Enviando...' : 'Enviar solicitud'}
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
