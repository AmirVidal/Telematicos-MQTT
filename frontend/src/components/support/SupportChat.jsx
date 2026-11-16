import { useEffect, useRef, useState } from 'react'
import { MAX_SUPPORT_CHAT_LENGTH } from '../../services/supportService'

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isOwnMessage(message, user) {
  if (!user) return false

  return Boolean(
    (user.id && message.senderId && user.id === message.senderId) ||
      (normalizeName(message.senderName) === normalizeName(user.name) &&
        message.senderRole === user.role)
  )
}

function formatTimestamp(timestamp) {
  if (!timestamp) return ''

  try {
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
  } catch {
    return ''
  }
}

export default function SupportChat({
  request,
  messages = [],
  currentUser,
  isMaintenance = false,
  onSendMessage,
  onResolve,
  sending = false,
  loading = false
}) {
  const [content, setContent] = useState('')
  const listRef = useRef(null)
  const isResolved = request?.status === 'resuelta'
  const messageCount = messages.length

  useEffect(() => {
    const container = listRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messageCount, request?.requestId])

  async function handleSubmit(event) {
    event.preventDefault()

    if (sending || isResolved) return

    try {
      await onSendMessage(content)
      setContent('')
    } catch {
      // El error se muestra en el panel principal de soporte.
    }
  }

  if (!request) {
    return (
      <section className="tarjeta soporte-chat soporte-chat--vacio">
        <p>Selecciona una conversación para ver los mensajes.</p>
      </section>
    )
  }

  return (
    <section className="tarjeta soporte-chat" aria-label="Chat de soporte">
      <header className="soporte-chat-cabecera">
        <div>
          <p className="seccion-etiqueta">CHAT DE SOPORTE</p>
          <h2>{request.description}</h2>
          <p className="soporte-chat-participantes">
            Solicitante: <strong>{request.requesterName}</strong>
            {request.responderName ? (
              <>
                {' · '}Mantenimiento: <strong>{request.responderName}</strong>
              </>
            ) : null}
          </p>
        </div>

        <div className="soporte-chat-acciones">
          <span
            className={`solicitud-estado ${
              isResolved
                ? 'solicitud-estado--resuelta'
                : 'solicitud-estado--en_proceso'
            }`}
          >
            {isResolved ? 'Resuelta' : 'En proceso'}
          </span>

          {isMaintenance && !isResolved ? (
            <button
              type="button"
              className="soporte-boton soporte-boton--exito"
              onClick={() => onResolve?.(request)}
            >
              Marcar como resuelto
            </button>
          ) : null}
        </div>
      </header>

      <div className="soporte-chat-mensajes" ref={listRef}>
        {loading ? (
          <p className="soporte-lista-vacia">Cargando mensajes...</p>
        ) : messages.length === 0 ? (
          <p className="soporte-lista-vacia">
            Aún no hay mensajes. Escribe el primero para coordinar la solución.
          </p>
        ) : (
          messages.map((message) => {
            const own = isOwnMessage(message, currentUser)

            return (
              <article
                key={message.id || message.messageId}
                className={`soporte-mensaje ${own ? 'soporte-mensaje--propio' : ''}`}
              >
                <header>
                  <strong>{message.senderName}</strong>
                  <span>{message.senderRole}</span>
                  <time dateTime={message.timestamp}>
                    {formatTimestamp(message.timestamp)}
                  </time>
                </header>
                <p>{message.content}</p>
              </article>
            )
          })
        )}
      </div>

      {isResolved ? (
        <p className="soporte-chat-cerrado" role="status">
          La solicitud fue marcada como resuelta. La conversación queda disponible
          únicamente para consulta.
        </p>
      ) : (
        <form className="soporte-chat-envio" onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_SUPPORT_CHAT_LENGTH}
            rows={2}
            placeholder="Escribe un mensaje..."
            disabled={sending}
            required
          />
          <div className="soporte-chat-envio-pie">
            <span>
              {content.length}/{MAX_SUPPORT_CHAT_LENGTH}
            </span>
            <button
              type="submit"
              className="soporte-boton"
              disabled={sending || !content.trim()}
            >
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
