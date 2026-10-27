import {
  useCallback,
  useEffect,
  useState
} from 'react'

import { BUILDING_ID } from '../config/channelOptions'
import { topics } from '../config/mqttTopics'

import {
  publishEmergencyAcknowledgment,
  parseEmergencyAcknowledgment
} from '../services/emergencyAcknowledgmentService'

function addAcknowledgment(previous, acknowledgment) {
  const sameUser = (item) =>
    item.emergencyId === acknowledgment.emergencyId &&
    item.userId === acknowledgment.userId

  const existing = previous.find(sameUser)

  if (
    existing &&
    Date.parse(existing.confirmedAt) <=
      Date.parse(acknowledgment.confirmedAt)
  ) {
    return previous
  }

  return [
    acknowledgment,
    ...previous.filter((item) => !sameUser(item))
  ].slice(0, 500)
}

export function useEmergencyAcknowledgments(clientRef, status) {
  const [acknowledgments, setAcknowledgments] = useState([])
  const [acknowledgmentError, setAcknowledgmentError] = useState('')

  useEffect(() => {
    if (status !== 'connected') {
      setAcknowledgments([])
      setAcknowledgmentError('')
      return
    }

    const client = clientRef.current

    if (!client?.connected) {
      return
    }

    const filter =
      topics.alertas.emergenciasAcusesSuscripcion(BUILDING_ID)

    let active = true

    setAcknowledgments([])
    setAcknowledgmentError('')

    function handleMessage(topic, payload) {
      if (!active) return

      try {
        const acknowledgment =
          parseEmergencyAcknowledgment(topic, payload)

        if (!acknowledgment) return

        setAcknowledgments((previous) =>
          addAcknowledgment(previous, acknowledgment)
        )
      } catch (error) {
        console.warn(
          'HU13: confirmación descartada:',
          error.message
        )
      }
    }

    client.on('message', handleMessage)

    client.subscribe(
      filter,
      { qos: 1 },
      (error, granted) => {
        if (!active) return

        if (
          error ||
          !granted?.length ||
          granted.some((item) => item.qos >= 128)
        ) {
          setAcknowledgmentError(
            'No se pudo activar la recepción de confirmaciones.'
          )
        }
      }
    )

    return () => {
      active = false

      client.removeListener('message', handleMessage)

      if (client.connected) {
        client.unsubscribe(filter)
      }
    }
  }, [clientRef, status])

  const confirmRead = useCallback(
    async ({ alertId, user, clientId }) => {
      const acknowledgment =
        await publishEmergencyAcknowledgment({
          client: clientRef.current,
          alertId,
          user,
          clientId
        })

      setAcknowledgments((previous) =>
        addAcknowledgment(previous, acknowledgment)
      )

      return acknowledgment
    },
    [clientRef]
  )

  return {
    acknowledgments,
    acknowledgmentError,
    confirmRead
  }
}