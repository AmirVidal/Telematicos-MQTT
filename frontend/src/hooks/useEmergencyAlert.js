import { useCallback } from 'react'

import {
  publishEmergency,
  resolveEmergency
} from '../services/emergencyPublisher'


export function useEmergencyAlert(clientRef, user) {

  const sendEmergency = useCallback(
    (emergency) =>
      publishEmergency({
        client: clientRef.current,
        user,
        emergency
      }),
    [clientRef, user]
  )


  const markEmergencyResolved = useCallback(
    (alertId) =>
      resolveEmergency({
        client: clientRef.current,
        user,
        alertId
      }),
    [clientRef, user]
  )


  return {
    sendEmergency,
    markEmergencyResolved
  }
}