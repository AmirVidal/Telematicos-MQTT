import './Sidebar.css'

const opciones = [
  { id: 'mensajeria', nombre: 'Mensajería', icono: '✉' },
  { id: 'emergencias', nombre: 'Emergencias', icono: '⚠' },
  { id: 'incidentes', nombre: 'Incidentes', icono: '▤' },
  { id: 'soporte', nombre: 'Soporte', icono: '⚒' },
  { id: 'personal', nombre: 'Personal', icono: '♙' }
]

export default function Sidebar({ seccionActiva, onCambiarSeccion }) {
  return (
    <aside className="dashboard-sidebar">
      <nav aria-label="Navegación principal">
        <p className="dashboard-sidebar-titulo">MENÚ PRINCIPAL</p>

        <ul className="dashboard-sidebar-lista">
          {opciones.map((opcion) => (
            <li key={opcion.id}>
              <button
                type="button"
                className={`dashboard-sidebar-opcion ${
                  seccionActiva === opcion.id ? 'dashboard-sidebar-opcion--activa' : ''
                }`}
                onClick={() => onCambiarSeccion(opcion.id)}
                aria-current={seccionActiva === opcion.id ? 'page' : undefined}
              >
                <span className="dashboard-sidebar-icono" aria-hidden="true">
                  {opcion.icono}
                </span>
                <span>{opcion.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
