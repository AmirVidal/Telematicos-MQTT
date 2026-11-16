function normalizeName(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function samePerson(user, request, prefix) {
  if (!user) return false

  const id = request[`${prefix}Id`]
  const name = normalizeName(request[`${prefix}Name`])
  const role = request[`${prefix}Role`] ?? ''

  return Boolean(
    (user.id && id && user.id === id) ||
      (name && name === normalizeName(user.name) && role === user.role)
  )
}

function otherPartyName(request, user) {
  return samePerson(user, request, 'requester')
    ? request.responderName || 'Mantenimiento'
    : request.requesterName || 'Solicitante'
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

export default function SupportChatsList({
  chats = [],
  currentUser,
  selectedRequestId,
  onSelect
}) {
  return (
    <section className="tarjeta soporte-chats-lista">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">CONVERSACIONES</p>
          <h2>Mis chats de soporte</h2>
        </div>
      </div>

      {chats.length === 0 ? (
        <p className="soporte-lista-vacia">
          Todavía no tienes conversaciones de soporte.
        </p>
      ) : (
        <ul className="soporte-chats">
          {chats.map((chat) => {
            const requestId = chat.requestId || chat.id
            const isResolved = chat.status === 'resuelta'

            return (
              <li key={requestId}>
                <button
                  type="button"
                  className={`soporte-chat-item ${
                    selectedRequestId === requestId
                      ? 'soporte-chat-item--activo'
                      : ''
                  }`}
                  onClick={() => onSelect?.(requestId)}
                >
                  <div className="soporte-chat-item-cabecera">
                    <strong>{otherPartyName(chat, currentUser)}</strong>
                    <span
                      className={`solicitud-estado ${
                        isResolved
                          ? 'solicitud-estado--resuelta'
                          : 'solicitud-estado--en_proceso'
                      }`}
                    >
                      {isResolved ? 'Resuelta' : 'En proceso'}
                    </span>
                  </div>
                  <p>{chat.description}</p>
                  <small>{formatTimestamp(chat.respondedAt || chat.timestamp)}</small>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
