import { useState } from 'react'
import { getEmergencyTypeLabel } from '../config/emergencyOptions'


function displayDate(isoDate) {
  const date = new Date(isoDate)

  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleString()
}


export default function EmergencyAlerts({
  alerts = [],
  activeAlerts = [],
  connected,
  subscriptionStatus,
  canResolve = false,
  onResolve
}) {

  const [resolvingId, setResolvingId] = useState(null)
  const [resolutionError, setResolutionError] = useState('')


  async function handleResolve(alert) {

    if (!canResolve || !onResolve || resolvingId) {
      return
    }

    const confirmed = window.confirm(
      `¿Confirmas que la emergencia en ${alert.location} ya fue resuelta?`
    )

    if (!confirmed) return

    setResolvingId(alert.id)
    setResolutionError('')

    try {

      await onResolve(alert.id)

    } catch (error) {

      setResolutionError(
        error.message || 'No se pudo resolver la emergencia.'
      )

    } finally {

      setResolvingId(null)
    }
  }


  return (
    <section
      className="tarjeta emergencias-panel"
      aria-labelledby="emergencias-titulo"
    >

      <div className="tarjeta-cabecera">

        <div>
          <p className="seccion-etiqueta emergencia-etiqueta">
            ALERTAS PRIORITARIAS
          </p>

          <h2 id="emergencias-titulo">
            Emergencias del edificio
          </h2>
        </div>

        <span className="emergencia-canal">
          Canal general
        </span>

      </div>


      <p className="emergencia-estado-suscripcion">

        {connected && subscriptionStatus === 'active'
          ? 'Escuchando alertas de todas las áreas en tiempo real.'
          : connected && subscriptionStatus === 'failed'
            ? 'No se logró activar la suscripción de emergencias.'
            : connected
              ? 'Activando el canal prioritario...'
              : 'Sin conexión con el canal de emergencias.'}

      </p>


      {/* Emergencias activas */}

      <div className="emergencias-activas-contenedor">

        <h3>
          Emergencias activas ({activeAlerts.length})
        </h3>

        {!connected || subscriptionStatus !== 'active' ? (

          <p className="emergencia-sin-alertas">
            No se puede comprobar el estado de las emergencias
            sin la suscripción MQTT activa.
          </p>

        ) : activeAlerts.length === 0 ? (

          <p className="emergencia-sin-alertas">
            No hay emergencias activas registradas en el broker.
          </p>

        ) : (

          <ul
            className="emergencias-lista"
            aria-live="polite"
          >

            {activeAlerts.map((alert) => (

              <li
                className="emergencia-recibida"
                key={alert.id}
              >

                <div className="emergencia-recibida-cabecera">

                  <strong>
                    ACTIVA · {getEmergencyTypeLabel(alert.emergencyType)}
                  </strong>

                  <time dateTime={alert.timestamp}>
                    {displayDate(alert.timestamp)}
                  </time>

                </div>

                <p>
                  <strong>Ubicación:</strong> {alert.location}
                </p>

                <p>
                  {alert.description}
                </p>

                <p className="emergencia-emisor">
                  Emitida por {alert.senderName}
                  {' '}({alert.senderRole})
                  {' '}· ID: {alert.id}
                </p>

                {canResolve && (

                  <button
                    type="button"
                    className="emergencia-resolver"
                    onClick={() => handleResolve(alert)}
                    disabled={Boolean(resolvingId) || !connected}
                  >
                    {resolvingId === alert.id
                      ? 'Resolviendo...'
                      : 'Marcar como resuelta'}
                  </button>

                )}

              </li>

            ))}

          </ul>

        )}

        {resolutionError && (

          <p
            className="soporte-feedback soporte-feedback--error"
            role="alert"
          >
            {resolutionError}
          </p>

        )}

      </div>


      {/* Historial de la sesión */}

      <h3 className="emergencias-historial-titulo">
        Historial recibido en esta sesión
      </h3>

      {alerts.length === 0 ? (

        <p className="emergencia-sin-alertas">
          No se han recibido alertas en esta sesión.
        </p>

      ) : (

        <ul
          className="emergencias-lista"
          aria-live="assertive"
          aria-relevant="additions"
        >

          {alerts.map((alert) => (

            <li
              className="emergencia-recibida"
              key={alert.id}
            >

              <div className="emergencia-recibida-cabecera">

                <strong>
                  {alert.resolved ? 'RESUELTA' : 'ALERTA'}
                  {' · '}
                  {getEmergencyTypeLabel(alert.emergencyType)}
                </strong>

                <time dateTime={alert.timestamp}>
                  {displayDate(alert.timestamp)}
                </time>

              </div>

              <p>
                <strong>Ubicación:</strong> {alert.location}
              </p>

              <p>
                {alert.description}
              </p>

              <p className="emergencia-emisor">
                Emitida por {alert.senderName}
                {' '}({alert.senderRole})
                {' '}· ID: {alert.id}
              </p>

            </li>

          ))}

        </ul>

      )}

    </section>
  )
}