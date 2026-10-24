import { useState } from 'react'

const ROLE_LABELS = {
  seguridad: 'Seguridad',
  mantenimiento: 'Mantenimiento',
  recepcion: 'Recepción',
  limpieza: 'Limpieza',
  administracion: 'Administración',
}

export default function ConnectedUsers({
  users,
  currentUserId,
  connectionStatus,
}) {
  const [roleFilter, setRoleFilter] = useState('todos')

  const visibleUsers = users.filter(
    (user) =>
      roleFilter === 'todos' ||
      user.role === roleFilter
  )

  return (
    <section
      className="tarjeta usuarios-conectados"
      aria-labelledby="titulo-usuarios"
    >
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">
            HU06 · Presencia en tiempo real
          </p>
          <h2 id="titulo-usuarios">
            Personal conectado
          </h2>
        </div>

        <span className="contador-usuarios">
          {users.length} en línea
        </span>
      </div>

      <label
        className="usuarios-filtro-label"
        htmlFor="filtro-personal"
      >
        Filtrar por área
      </label>

      <select
        id="filtro-personal"
        className="usuarios-filtro"
        value={roleFilter}
        onChange={(event) =>
          setRoleFilter(event.target.value)
        }
      >
        <option value="todos">
          Todas las áreas
        </option>

        {Object.entries(ROLE_LABELS).map(
          ([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          )
        )}
      </select>

      {connectionStatus !== 'connected' ? (
        <p className="usuarios-vacio">
          Sin conexión con el broker.
          La lista se actualizará al reconectar.
        </p>
      ) : visibleUsers.length === 0 ? (
        <p className="usuarios-vacio">
          No hay usuarios activos en esta selección.
        </p>
      ) : (
        <ul
          className="usuarios-lista"
          aria-live="polite"
        >
          {visibleUsers.map((user) => (
            <li className="usuario-item" key={user.id}>
              <span
                className="usuario-indicador"
                aria-hidden="true"
              />

              <div className="usuario-datos">
                <strong>
                  {user.name}
                  {user.id === currentUserId
                    ? ' (tú)'
                    : ''}
                </strong>

                <span>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>

                {user.sessions > 1 && (
                  <small>
                    {user.sessions} sesiones activas
                  </small>
                )}
              </div>

              <span className="usuario-enlinea">
                En línea
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}