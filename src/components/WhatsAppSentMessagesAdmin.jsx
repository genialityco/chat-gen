import React, { useEffect, useState } from "react";

function ackColor(ack) {
  switch (ack) {
    case 3: return "#4caf50"; // Leído
    case 2: return "#1976d2"; // Entregado
    case 1: return "#ffa726"; // Enviado
    case 0: return "#888";
    default: return "#e53935"; // Error
  }
}

export default function WhatsAppSentMessagesAdmin() {
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [textFilter, setTextFilter] = useState("");

const API_URL = "https://apiwhatsapp.geniality.com.co";

// "https://apiwhatsapp.geniality.com.co"
// "http://localhost:3000";

const fetchMensajes = async () => {
  setLoading(true);
  let url = `${API_URL}/sent-messages`;
  if (phoneFilter) url += "?phone=" + encodeURIComponent(phoneFilter);
  const res = await fetch(url);
  const data = await res.json();
  setMensajes(Array.isArray(data) ? data : []);
  setLoading(false);
};


  useEffect(() => {
    fetchMensajes();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h2>Historial de Mensajes Enviados</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          placeholder="Filtrar por teléfono"
          value={phoneFilter}
          onChange={e => setPhoneFilter(e.target.value)}
          style={{ padding: 6, flex: 1 }}
        />
        <input
          placeholder="Filtrar por texto"
          value={textFilter}
          onChange={e => setTextFilter(e.target.value)}
          style={{ padding: 6, flex: 2 }}
        />
        <button onClick={fetchMensajes} style={{ padding: 6 }}>Buscar</button>
      </div>

      {loading && <div>Cargando...</div>}

      <table border="1" cellPadding="6" style={{ width: "100%", fontSize: 15 }}>
        <thead style={{ background: "#f1f1f1" }}>
          <tr>
            <th>Teléfono</th>
            <th>Mensaje</th>
            <th>Imagen</th>
            <th>Fecha</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {mensajes
            .filter(m =>
              (!phoneFilter || (m.phone && m.phone.includes(phoneFilter))) &&
              (!textFilter || (m.content && m.content.toLowerCase().includes(textFilter.toLowerCase())))
            )
            .map((m, i) => (
              <tr key={m.messageId || i}>
                <td>{m.phone}</td>
                <td>{m.content}</td>
                <td>
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt="" style={{ maxHeight: 45, maxWidth: 70, borderRadius: 5 }} />
                  ) : m.imageBase64 ? (
                    <img src={m.imageBase64} alt="" style={{ maxHeight: 45, maxWidth: 70, borderRadius: 5 }} />
                  ) : (
                    <span style={{ color: "#bbb" }}>—</span>
                  )}
                </td>
                <td>{m.date ? new Date(m.date).toLocaleString() : ""}</td>
                <td>
                  <span
                    style={{
                      color: "#fff",
                      background: ackColor(m.ack),
                      padding: "3px 10px",
                      borderRadius: 12,
                      fontWeight: 500,
                    }}
                  >
                    {m.ackText || "?"}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
