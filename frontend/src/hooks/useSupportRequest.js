
import { useCallback } from 'react'
import { publishSupportRequest } from '../services/supportRequestPublisher'

export function useSupportRequest(clientRef, user) {
  const sendSupportRequest = useCallback(
    async (description) => {
      const client = clientRef.current

      if (!client || !client.connected) {
        throw new Error('No hay conexión con el broker MQTT.')
      }

      if (!user?.id || !user?.name || !user?.role) {
        throw new Error('El usuario no está identificado.')
      }

      return publishSupportRequest({
        client,
        user,
        description
      })
    },
    [clientRef, user]
  )

  return { sendSupportRequest }
}
