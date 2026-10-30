import { useMemo } from 'react'

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return ''
  }

  try {
    const date = new Date(timestamp)
    if (Number.isNaN(date.getTime())) {
      return timestamp
    }
    return date.toLocaleString()
  } catch {
    return timestamp
  }
}

export default function ReceivedMessages({
  messages = [],
  currentUserId = null,
  channelName = null,
  compact = false
}) {
  const sortedMessages = useMemo(() => {
    if (!Array.isArray(messages)) {
      return []
    }

    return [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()

      if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
        return 0
      }
      if (Number.isNaN(timeA)) {
        return 1
      }
      if (Number.isNaN(timeB)) {
        return -1
      }

      return timeA - timeB
    })
  }, [messages])

  return (
    <section className="tarjeta mensajes-recibidos">
      {!compact && (
        <div className="tarjeta-cabecera">
          <div>
            <p className="seccion-etiqueta">MENSAJES RECIBIDOS</p>
            <h2>Mensajes en tiempo real</h2>
          </div>

          {channelName && <span className="etiqueta-canal">{channelName}</span>}
        </div>
      )}

      {sortedMessages.length === 0 ? (
        <p className="mensajes-vacios">Aún no se han recibido mensajes en este canal.</p>
      ) : (
        <ul className="lista-mensajes">
          {sortedMessages.map((message) => {
            const authorName = message.author?.name || message.senderName || 'Desconocido'
            const authorRole = message.author?.role || message.senderRole || ''
            const authorId = message.author?.id || message.senderId || null
            const isOwnMessage = currentUserId && authorId === currentUserId

            return (
              <li
                key={message.id}
                className={`mensaje-item ${isOwnMessage ? 'mensaje-item--propio' : ''}`}
              >
                <div className="mensaje-cabecera">
                  <div>
                    <span className="mensaje-autor">{authorName}</span>
                    {authorRole ? <span className="mensaje-rol"> · {authorRole}</span> : null}
                  </div>
                  <time className="mensaje-fecha" dateTime={message.timestamp}>
                    {formatTimestamp(message.timestamp)}
                  </time>
                </div>
                <p className="mensaje-contenido">{message.content}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
