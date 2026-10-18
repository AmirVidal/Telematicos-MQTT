import { useEffect, useRef, useState, useCallback } from 'react'
import { connect, subscribe, publish, disconnect } from '../services/mqttService'

export function useMqtt(topic) {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const unsubscribeRef = useRef(null)

  useEffect(() => {
    const client = connect()

    const onConnect = () => setConnected(true)
    const onError = () => setConnected(false)

    client.on('connect', onConnect)
    client.on('close', onError)
    client.on('error', onError)

    unsubscribeRef.current = subscribe(topic, (t, message) => {
      setMessages((prev) => [...prev, { topic: t, message, ts: Date.now() }])
    })

    return () => {
      client.off('connect', onConnect)
      client.off('close', onError)
      client.off('error', onError)
      if (unsubscribeRef.current) unsubscribeRef.current()
    }
  }, [topic])

  const send = useCallback(
    (targetTopic, message) => {
      publish(targetTopic, message)
    },
    []
  )

  return { messages, connected, send }
}
