import {
  CHANNELS,
  getChannel,
  getChannelTopic
} from '../config/channelOptions'

export default function ChannelSelector({
  selectedChannelId,
  onSelectChannel
}) {
  const channel = getChannel(selectedChannelId)
  const topic = getChannelTopic(selectedChannelId)

  return (
    <section
      className="tarjeta selector-canal"
      aria-labelledby="titulo-selector-canal"
    >
      <div className="tarjeta-cabecera">
        <div>
          <p className="seccion-etiqueta">
            Selección de canal
          </p>
          <h2 id="titulo-selector-canal">
            Canal de comunicación
          </h2>
        </div>
      </div>

      <label
        className="selector-canal-etiqueta"
        htmlFor="canal-mqtt"
      >
        Selecciona un canal
      </label>

      <select
        id="canal-mqtt"
        className="selector-canal-lista"
        value={selectedChannelId}
        onChange={(event) =>
          onSelectChannel(event.target.value)
        }
      >
        <option value="">
          Selecciona un canal de comunicación
        </option>

        {CHANNELS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>

      {channel ? (
        <div
          className="selector-canal-seleccion"
          role="status"
          aria-live="polite"
        >
          <strong>
            Canal seleccionado: {channel.name}
          </strong>

          <p>{channel.description}</p>

          <span>Topic MQTT:</span>
          <code>{topic}</code>
        </div>
      ) : (
        <p className="selector-canal-ayuda">
          Elige el canal en el que deseas participar.
        </p>
      )}
    </section>
  )
}