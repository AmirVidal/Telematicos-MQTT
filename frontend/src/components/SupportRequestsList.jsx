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

export default function SupportRequestsList({
  requests = [],
  currentUserId = null
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
          <h2>Solicitudes recibidas</h2>
        </div>
        <span className="etiqueta-protocolo">comandos/soporte</span>
      </div>

      {sortedRequests.length === 0 ? (
        <p className="soporte-lista-vacia">
          Aún no se han recibido solicitudes de soporte.
        </p>
      ) : (
        <ul className="lista-soporte">
          {sortedRequests.map((request) => {
            const isOwnRequest =
              currentUserId && request.requesterId === currentUserId

            return (
              <li
                key={request.id}
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
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
