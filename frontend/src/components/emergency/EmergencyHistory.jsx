
import { useEffect, useState } from 'react'
import {
  EMERGENCY_TYPES,
  getEmergencyTypeLabel
} from '../../config/emergencyOptions'
import {
  getEmergencyHistory,
  exportEmergencyHistory
} from '../../services/emergencyHistoryService'
import './EmergencyHistory.css'

const EMPTY_FILTERS = {
  type: '',
  status: '',
  from: '',
  to: ''
}

const STATUS_LABELS = {
  activa: 'Activa',
  en_atencion: 'En atención',
  resuelta: 'Resuelta'
}


function validateDateRange(filters, requireDates = false) {
  const today = getTodayDate()

  if (requireDates && !filters.from && !filters.to) {
    return 'Primero debes seleccionar una fecha inicial y una fecha final para realizar la búsqueda.'
  }

  if (requireDates && !filters.from) {
    return 'Primero debes seleccionar la fecha inicial (Desde).'
  }

  if (requireDates && !filters.to) {
    return 'Primero debes seleccionar la fecha final (Hasta).'
  }

  if (filters.from && filters.from > today) {
    return 'La fecha inicial no puede ser posterior al día actual.'
  }

  if (filters.to && filters.to > today) {
    return 'La fecha final no puede ser posterior al día actual.'
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    return 'La fecha inicial no puede ser mayor que la fecha final.'
  }

  return ''
}


function formatDate(value) {
  if (!value) return 'No registrada'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Fecha inválida'
    : date.toLocaleString('es-BO')
}
    

function getTodayDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}


   export default function EmergencyHistory() {
     const [filters, setFilters] = useState({ ...EMPTY_FILTERS })
     const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS })
     const [page, setPage] = useState(1)
     const [records, setRecords] = useState([])
     const [pagination, setPagination] = useState(null)
     const [selected, setSelected] = useState(null)
     const [loading, setLoading] = useState(true)
     const [error, setError] = useState('')
     const [notice, setNotice] = useState('')
     const [revision, setRevision] = useState(0)
     const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError('')

      try {
        const result = await getEmergencyHistory(appliedFilters, page)

        if (controller.signal.aborted) return

        setRecords(result.records)
        setPagination(result.pagination)
      } catch (err) {
        if (controller.signal.aborted) return

        setRecords([])
        setPagination(null)
        setError(err.message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [appliedFilters, page, revision])

  async function handleExport() {
    const validationMessage = validateDateRange(appliedFilters)

    if (validationMessage) {
      setNotice('')
      setError(validationMessage)
      return
    }

    setExporting(true)
    setError('')
    setNotice('')

    try {
      await exportEmergencyHistory(appliedFilters)
      setNotice('El historial se exportó correctamente en formato CSV.')
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  function updateFilter(key, value) {
    setFilters(previous => ({ ...previous, [key]: value }))
    setError('')
    setNotice('')
  }

  function applyFilters(event) {
    event.preventDefault()

    const validationMessage = validateDateRange(filters, true)

    if (validationMessage) {
      setNotice('')
      setError(validationMessage)
      return
    }

    setError('')
    setNotice('Búsqueda iniciada con el rango de fechas seleccionado.')
    setPage(1)
    setAppliedFilters({ ...filters })
    setRevision(previous => previous + 1)
  }

  function clearFilters() {
    setFilters({ ...EMPTY_FILTERS })
    setAppliedFilters({ ...EMPTY_FILTERS })
    setError('')
    setNotice('Filtros limpiados. Se muestran todas las emergencias disponibles.')
    setPage(1)
    setRevision(previous => previous + 1)
  }

  function refreshHistory() {
    setError('')
    setNotice('Actualizando el historial...')
    setRevision(previous => previous + 1)
  }

  return (
    <section className="history-view" aria-label="Historial de emergencias">

      <header className="history-header">
        <div>
          <h2>Historial de emergencias</h2>
          <p>Consulta los registros históricos guardados en el sistema.</p>
        </div>

        <div className="history-header-actions">
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || exporting || Boolean(error)}
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>

          <button
            type="button"
            onClick={refreshHistory}
            disabled={loading}
          >
            Actualizar
          </button>
        </div>
      </header>

      <form className="history-filters" onSubmit={applyFilters}>
        <label>
          Tipo de emergencia
          <select
            value={filters.type}
            onChange={event => updateFilter('type', event.target.value)}
          >
            <option value="">Todos</option>
            {EMERGENCY_TYPES.map(type => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Estado
          <select
            value={filters.status}
            onChange={event => updateFilter('status', event.target.value)}
          >
            <option value="">Todos</option>
            <option value="activa">Activa</option>
            <option value="en_atencion">En atención</option>
            <option value="resuelta">Resuelta</option>
          </select>
        </label>

        
         <label>
           Desde
          <input
           type="date"
           value={filters.from}
           max={getTodayDate()}
           aria-invalid={Boolean(error) && !filters.from}
           onChange={event => updateFilter('from', event.target.value)}
           />
         </label>

<label>
  Hasta
  <input
    type="date"
    value={filters.to}
    min={filters.from || undefined}
    max={getTodayDate()}
    aria-invalid={Boolean(error) && !filters.to}
    onChange={event => updateFilter('to', event.target.value)}
  />
</label>


        <div className="history-filter-actions">
          <button type="submit">Buscar</button>
          <button type="button" onClick={clearFilters}>
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <p id="history-feedback" className="history-error" role="alert">
          {error}
        </p>
      )}

      {!error && notice && (
        <p className="history-notice" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <p role="status">Cargando historial...</p>
      ) : !error && (
        <>
          <div className="history-results">
            <strong>
              {pagination?.total ?? 0} emergencia(s) encontradas
            </strong>

            <div className="history-table-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th>Reportado por</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map(record => (
                    <tr key={record.emergencyId}>
                      <td>{formatDate(record.timestamp)}</td>
                      <td>{getEmergencyTypeLabel(record.emergencyType)}</td>
                      <td>{record.location}</td>
                      <td>{STATUS_LABELS[record.status] ?? record.status}</td>
                      <td>{record.senderName ?? 'No registrado'}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelected(record)}
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}

                  {records.length === 0 && (
                    <tr>
                      <td colSpan="6">
                        No existen registros con esos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="history-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(previous => previous - 1)}
            >
              Anterior
            </button>

            <span>
              Página {pagination?.page ?? 1} de{' '}
              {Math.max(1, pagination?.totalPages ?? 0)}
            </span>

            <button
              type="button"
              disabled={page >= (pagination?.totalPages ?? 0)}
              onClick={() => setPage(previous => previous + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}

      {selected && (
        <div
          className="history-modal-backdrop"
          onClick={() => setSelected(null)}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-detail-title"
            onClick={event => event.stopPropagation()}
          >
            <h3 id="history-detail-title">Detalle de emergencia</h3>

            <dl>
              <dt>Identificador</dt>
              <dd className="history-break">{selected.emergencyId}</dd>

              <dt>Tipo</dt>
              <dd>{getEmergencyTypeLabel(selected.emergencyType)}</dd>

              <dt>Ubicación</dt>
              <dd>{selected.location}</dd>

              <dt>Descripción</dt>
              <dd className="history-break">{selected.description}</dd>

              <dt>Estado</dt>
              <dd>{STATUS_LABELS[selected.status] ?? selected.status}</dd>

              <dt>Reportado por</dt>
              <dd>{selected.senderName ?? 'No registrado'}</dd>

              <dt>Rol</dt>
              <dd>{selected.senderRole ?? 'No registrado'}</dd>

              <dt>Fecha de alerta</dt>
              <dd>{formatDate(selected.timestamp)}</dd>

              <dt>Fecha de resolución</dt>
              <dd>{formatDate(selected.resolvedAt)}</dd>
            </dl>

            <button type="button" onClick={() => setSelected(null)}>
              Cerrar
            </button>
          </section>
        </div>
      )}
    </section>
  )
}
