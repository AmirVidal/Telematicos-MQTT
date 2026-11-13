import { useState } from 'react'
import { MAX_MESSAGE_LENGTH } from '../services/messagePublisher'

export default function MessageComposer({
  channelId,
  channelName,
  connected,
  onSend,
  compact = false
}) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending) return

    setFeedback(null)
    setSending(true)

    try {
      await onSend(channelId, content)

      setContent('')
      setFeedback({
        type: 'success',
        message: 'Mensaje publicado correctamente en MQTT.'
      })
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'No se pudo enviar el mensaje.'
      })
    } finally {
      setSending(false)
    }
  }

  const canSend =
    connected &&
    Boolean(channelId) &&
    Boolean(content.trim()) &&
    content.trim().length <= MAX_MESSAGE_LENGTH &&
    !sending

  return (
    <section className="tarjeta message-composer">
      {!compact && (
        <>
          <div className="tarjeta-cabecera">
            <div>
              <p className="seccion-etiqueta">ENVÍO DE MENSAJES</p>
              <h2>Enviar mensaje MQTT</h2>
            </div>

            <span className="etiqueta-protocolo">QoS 1</span>
          </div>

          <p className="message-composer-description">
            Canal de destino: <strong>{channelName || 'Sin seleccionar'}</strong>
          </p>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="message-content">Contenido del mensaje</label>

        <textarea
          id="message-content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value)
            setFeedback(null)
          }}
          placeholder="Escribe el mensaje que deseas enviar..."
          maxLength={MAX_MESSAGE_LENGTH}
          rows={4}
          disabled={sending}
          required
        />

        <div className="message-composer-footer">
          <span className="message-character-count">
            {content.length}/{MAX_MESSAGE_LENGTH} caracteres
          </span>

          <button type="submit" className="message-send-button" disabled={!canSend}>
            {sending ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </div>

        {feedback && (
          <p className={`message-feedback message-feedback--${feedback.type}`} role="status">
            {feedback.message}
          </p>
        )}

        {!connected && (
          <p className="message-feedback message-feedback--error">
            El broker MQTT está desconectado.
          </p>
        )}
      </form>
    </section>
  )
}
