import { useCallback, useEffect, useRef, useState } from 'react'
import { createClientId, createMqttConnection, MQTT_URL } from '../services/mqttClient'
import { createPresenceClient, createPresenceWill } from '../services/presenceClient'
import { publishMessage } from '../services/messagePublisher'
import { parseReceivedMessage } from '../services/messageReceiver'
import { getChannelTopic } from '../config/channelOptions'

export function useMqtt(user = null, url = MQTT_URL, selectedChannelId = null) {
  const [clientId] = useState(createClientId)
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)
  const [connectedUsers, setConnectedUsers] = useState([])
  const [receivedMessages, setReceivedMessages] = useState([])
  const [subscribedChannelId, setSubscribedChannelId] = useState(null)
  const clientRef = useRef(null)
  const subscriptionQueueRef = useRef(Promise.resolve())

  const userId = user?.id
  const userName = user?.name
  const userRole = user?.role

  useEffect(() => {
    let active = true

    const connection = createMqttConnection({
      url,
      clientId,
      will: userId ? createPresenceWill(clientId) : undefined,

      onStatus: (nextStatus) => {
        if (!active) return

        setStatus(nextStatus)

        if (nextStatus === 'disconnected') {
          setConnectedUsers([])
        }
      },

      onError: (nextError) => {
        if (active) {
          setError(nextError?.message ?? null)
        }
      }
    })

    clientRef.current = connection.client

    const presence = userId
      ? createPresenceClient({
          client: connection.client,
          clientId,
          user: {
            id: userId,
            name: userName,
            role: userRole
          },
          onUsers: (users) => {
            if (active) setConnectedUsers(users)
          },
          onError: (presenceError) => {
            if (active) setError(presenceError.message)
          }
        })
      : null

    return () => {
      active = false
      if (clientRef.current === connection.client) {
        clientRef.current = null
      }

      if (presence) {
        presence.stop(() => connection.stop())
      } else {
        connection.stop()
      }
    }
  }, [url, clientId, userId, userName, userRole])

  useEffect(() => {
    const client = clientRef.current

    if (!client || status !== 'connected' || !selectedChannelId) {
      return
    }

    const topic = getChannelTopic(selectedChannelId)

    if (!topic) {
      return
    }

    let active = true

    function handleMessage(receivedTopic, payload) {
      if (!active || receivedTopic !== topic) return

      try {
        const message = parseReceivedMessage(receivedTopic, payload)
        setReceivedMessages((previous) => {
          if (previous.some((item) => item.id === message.id)) {
            return previous
          }

          return [...previous, message].slice(-200)
        })
      } catch (receiveError) {
        console.warn('HU08: mensaje MQTT descartado:', receiveError.message)
      }
    }

    function subscribeAsync() {
      return new Promise((resolve) => {
        if (!active || !client.connected) {
          resolve()
          return
        }

        client.subscribe(topic, { qos: 1 }, (subscribeError) => {
          if (subscribeError) {
            if (active) {
              setError(subscribeError.message)
            }
          } else if (active) {
            setSubscribedChannelId(selectedChannelId)
          }

          resolve()
        })
      })
    }

    function unsubscribeAsync() {
      return new Promise((resolve) => {
        if (!client.connected) {
          resolve()
          return
        }

        client.unsubscribe(topic, (unsubscribeError) => {
          if (unsubscribeError) {
            console.warn('error al cancelar suscripción:', unsubscribeError.message)
          }
          resolve()
        })
      })
    }

    client.on('message', handleMessage)

    // Ejecutar las suscripciones en orden
    subscriptionQueueRef.current = subscriptionQueueRef.current.catch(() => {}).then(subscribeAsync)

    return () => {
      active = false
      client.removeListener('message', handleMessage)

      // Cancelar esta suscripción antes de procesar la siguiente
      subscriptionQueueRef.current = subscriptionQueueRef.current
        .catch(() => {})
        .then(unsubscribeAsync)
    }
  }, [status, selectedChannelId])

  const sendMessage = useCallback(
    async (channelId, content) => {
      const client = clientRef.current

      if (!client || !client.connected) {
        throw new Error('No hay conexión con el broker MQTT.')
      }

      if (!userId || !userName || !userRole) {
        throw new Error('El usuario no está identificado.')
      }

      return publishMessage({
        client,
        user: {
          id: userId,
          name: userName,
          role: userRole
        },
        channelId,
        content
      })
    },
    [userId, userName, userRole]
  )

  return {
    url,
    clientId,
    status,
    error,
    connectedUsers,
    sendMessage,
    receivedMessages,
    subscribedChannelId:
      status === 'connected' && subscribedChannelId === selectedChannelId
        ? subscribedChannelId
        : null
  }
}
