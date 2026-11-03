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

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso'
}

export default function SupportRequestsList({
  requests = [],
  currentUser = null,
  canRespond = false,
  canResolve = false,
  onRespond,
  onOpenChat,
  onResolve,
  busyRequestId = null
}) {
  const sortedRequests = useMemo(() => {
    if (!Array.isArray(requests)) {
      return []
    }

    return [...requests].sort((a, b) => {
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

      return timeB - timeA
    })
  }, [requests])

  return (
    <section className="tarjeta soporte-lista">
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">SOLICITUDES DE SOPORTE</p>
          <h2>Solicitudes activas</h2>
        </div>
        <span className="etiqueta-protocolo">comandos/soporte</span>
      </div>

      {sortedRequests.length === 0 ? (
        <p className="soporte-lista-vacia">
          No hay solicitudes de soporte pendientes.
        </p>
      ) : (
        <ul className="lista-soporte">
          {sortedRequests.map((request) => {
            const requestId = request.requestId || request.id
            const isOwnRequest = samePerson(currentUser, request, 'requester')
            const isAssignedResponder = samePerson(currentUser, request, 'responder')
            const isParticipant = isOwnRequest || isAssignedResponder
            const isBusy = busyRequestId === requestId
            const status = request.status || 'pendiente'
            const statusLabel = STATUS_LABELS[status] || status
            const assignedToOther =
              request.responderName && !isAssignedResponder

            return (
              <li
                key={requestId}
                className={`solicitud-item ${isOwnRequest ? 'solicitud-item--propio' : ''}`}
              >
                <div className="solicitud-cabecera">
                  <div>
                    <span className="solicitud-autor">
                      {request.requesterName || 'Desconocido'}
                    </span>
                    {request.requesterRole ? (
                      <span className="solicitud-rol"> · {request.requesterRole}</span>
                    ) : null}
                  </div>
                  <time
                    className="solicitud-fecha"
                    dateTime={request.timestamp}
                  >
                    {formatTimestamp(request.timestamp)}
                  </time>
                </div>

                <p className="solicitud-descripcion">{request.description}</p>

                <div className="solicitud-meta">
                  <span className={`solicitud-estado solicitud-estado--${status}`}>
                    {statusLabel}
                  </span>
                  {request.responderName ? (
                    <span className="solicitud-responsable">
                      Atendida por {request.responderName}
                    </span>
                  ) : null}
                </div>

                <div className="solicitud-acciones">
                  {canRespond && !request.responderName ? (
                    <button
                      type="button"
                      className="soporte-boton soporte-boton--secundario"
                      onClick={() => onRespond?.(request)}
                      disabled={isBusy}
                    >
                      {isBusy ? 'Iniciando...' : 'Responder'}
                    </button>
                  ) : null}

                  {request.responderName && isParticipant ? (
                    <button
                      type="button"
                      className="soporte-boton"
                      onClick={() => onOpenChat?.(requestId)}
                    >
                      Abrir chat
                    </button>
                  ) : null}

                  {canResolve && !assignedToOther ? (
                    <button
                      type="button"
                      className="soporte-boton soporte-boton--exito"
                      onClick={() => onResolve?.(request)}
                    >
                      Marcar como resuelto
                    </button>
                  ) : null}
                </div>

                {assignedToOther ? (
                  <p className="solicitud-nota">
                    Esta solicitud ya fue tomada por otro usuario de mantenimiento.
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
