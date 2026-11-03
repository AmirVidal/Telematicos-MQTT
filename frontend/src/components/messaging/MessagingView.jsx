import { useEffect, useLayoutEffect, useRef } from 'react'
import ChannelSelector from '../ChannelSelector'
import ReceivedMessages from '../ReceivedMessages'
import MessageComposer from '../MessageComposer'
import './MessagingView.css'

export default function MessagingView({
  selectedChannelId,
  onSelectChannel,
  selectedChannel,
  receivedMessages,
  currentUserId,
  connected,
  onSend
}) {
  const messagesContainerRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)

  const channelMessages = receivedMessages.filter(
    (message) => message.channelId === selectedChannelId
  )

  const messageCount = channelMessages.length

  function handleMessagesScroll() {
    const container = messagesContainerRef.current
    if (!container) return

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight

    shouldAutoScrollRef.current = distanceFromBottom < 80
  }

  useLayoutEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.scrollTop = container.scrollHeight
    shouldAutoScrollRef.current = true
  }, [selectedChannelId])

  useEffect(() => {
    const container = messagesContainerRef.current

    if (!container || !shouldAutoScrollRef.current) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [messageCount])
  return (
    <section className="mensajeria-vista" aria-label="Mensajería MQTT">
      <div className="mensajeria-distribucion">
        <aside className="mensajeria-canales">
          <ChannelSelector
            selectedChannelId={selectedChannelId}
            onSelectChannel={onSelectChannel}
            compact
          />
        </aside>

        <div className="mensajeria-conversacion">
          <div className="mensajeria-conversacion-cabecera">
            <div>
              <h3>{selectedChannel?.name ?? 'Selecciona un canal'}</h3>
              <p>{selectedChannel ? 'Mensajes de este canal' : 'Elige un canal para comenzar'}</p>
            </div>
          </div>

          <div
            className="mensajeria-conversacion-mensajes"
            ref={messagesContainerRef}
            onScroll={handleMessagesScroll}
          >
            <ReceivedMessages
              messages={channelMessages}
              currentUserId={currentUserId}
              channelName={selectedChannel?.name ?? null}
              compact
            />
          </div>

          <div className="mensajeria-conversacion-envio">
            <MessageComposer
              channelId={selectedChannelId}
              channelName={selectedChannel?.name ?? 'Sin seleccionar'}
              connected={connected}
              onSend={onSend}
              compact
            />
          </div>
        </div>
      </div>
    </section>
  )
}
