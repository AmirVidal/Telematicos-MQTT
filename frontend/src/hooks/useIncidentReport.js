
import { useCallback } from 'react'
import { publishIncident } from '../services/incidentPublisher'

export function useIncidentReport(clientRef, user) {
  const sendIncident = useCallback(
    (incident) => publishIncident({
      client: clientRef.current,
      user,
      incident
    }),
    [clientRef, user]
  )

  return { sendIncident }
}
