import React, { useState } from "react";
import * as XLSX from "xlsx";
import WhatsAppSentMessagesAdmin from "./WhatsAppSentMessagesAdmin";

export default function WhatsAppBulkSender() {
  const [rows, setRows] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);

  // Descargar template
  // Descargar template mejorado
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["phone", "message", "imageUrl", "imageBase64"],
      [
        "3112223344",
        "Hola con imagen URL",
        "https://ejemplo.com/imagen.jpg",
        "",
      ],
      ["3201234567", "Hola con base64", "", "data:image/png;base64,iVBOR..."],
      ["3003334444", "Solo texto", "", ""],
      ["3005556666", "", "https://ejemplo.com/sin-mensaje.jpg", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template-masivo-whatsapp.xlsx");
  };

  // Descargar informe final
  const handleDownloadReport = () => {
    if (!results.length) return;
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, "reporte-envio-masivo.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsedRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headers = parsedRows[0];
      const rowObjects = parsedRows
        .slice(1)
        .map((row) => {
          let obj = {};
          headers.forEach((h, idx) => {
            obj[h?.toLowerCase()] = row[idx]?.toString().trim() || "";
          });
          return obj;
        })
        // Filtra solo si tiene teléfono y al menos mensaje o imagen
        .filter((r) => r.phone && (r.message || r.imageurl || r.imagebase64));

      setRows(rowObjects);
      setResults([]);
    };
    reader.readAsBinaryString(file);
  };

  // Función para eñ tiempo ala zar entre 0 y 1 segundo
  const randomDelay = () =>
    new Promise((res) => setTimeout(res, Math.random() * 1000));

  const sendMessages = async () => {
    setSending(true);
    let res = [];
    for (let i = 0; i < rows.length; i++) {
      const { phone, message, imageurl, imagebase64 } = rows[i];

      // Construye el payload solo con los campos usados
      let payload = {
        phone: `57${phone.replace(/^57/, "")}`,
      };
      if (message) payload.message = message;
      if (imageurl) payload.imageUrl = imageurl;
      if (imagebase64) payload.imageBase64 = imagebase64;

      try {
        const response = await fetch("https://apiwhatsapp.geniality.com.co/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          res.push({
            phone,
            message,
            imageurl,
            imagebase64,
            status: "Enviado",
          });
        } else {
          const errorText = await response.text();
          res.push({
            phone,
            message,
            imageurl,
            imagebase64,
            status: "Error",
            error: errorText,
          });
        }
      } catch (err) {
        res.push({
          phone,
          message,
          imageurl,
          imagebase64,
          status: "Error",
          error: err.message,
        });
      }
      setResults([...res]);
      await randomDelay();
    }
    setSending(false);
  };

  return (
    <div style={{ maxWidth: 700, margin: "auto", padding: 20 }}>
      <h2>Enviar mensajes masivos de WhatsApp</h2>

      <div style={{ marginBottom: 16 }}>
        <button onClick={handleDownloadTemplate}>Descargar template</button>
      </div>

      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />

      {rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button onClick={sendMessages} disabled={sending}>
            {sending ? "Enviando..." : "Enviar mensajes"}
          </button>
          <table
            border="1"
            cellPadding="5"
            style={{ width: "100%", margin: "1em 0" }}
          >
            <thead>
              <tr>
                <th>Teléfono</th>
                <th>Mensaje</th>
                <th>Imagen (preview)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                // Elige la fuente de la imagen: URL o base64
                const imgSrc = r.imageurl
                  ? r.imageurl
                  : r.imagebase64
                  ? r.imagebase64
                  : "";

                return (
                  <tr key={idx}>
                    <td>{r.phone}</td>
                    <td>{r.message}</td>
                    <td>
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt="preview"
                          style={{
                            maxHeight: 60,
                            maxWidth: 90,
                            borderRadius: 4,
                            boxShadow: "0 1px 4px #888",
                            cursor: "pointer",
                            objectFit: "contain",
                          }}
                          // Preview ampliado al hacer click (opcional)
                          onClick={() => window.open(imgSrc, "_blank")}
                          title="Haz clic para ver en grande"
                        />
                      ) : (
                        <span style={{ color: "#bbb" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4>Resultados:</h4>
          <ul>
            {results.map((r, i) => (
              <li key={i}>
                {r.phone}: {r.status}
                {r.error && <span style={{ color: "red" }}> ({r.error})</span>}
              </li>
            ))}
          </ul>
          <button onClick={handleDownloadReport} style={{ marginTop: 8 }}>
            Descargar informe final (Excel)
          </button>
        </div>
      )}
      <div
        style={{
          background: "#e7f3ff",
          border: "1px solid #b3d8fd",
          borderRadius: 8,
          padding: 16,
          marginBlock: 20,
          color: "#21527a",
        }}
      >
        <strong>¿Cómo adjuntar imágenes como base64?</strong>
        <ul style={{ marginTop: 6 }}>
          <li>
            Convertir imagen a <b>base64</b> con:
            <br />
            <a
              href="https://www.base64-image.de/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.base64-image.de/
            </a>{" "}
            &nbsp;|&nbsp;
            <a
              href="https://www.imgtobase64.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://www.imgtobase64.com/
            </a>
          </li>
          <li>
            Cargar la imagen y copiar el texto generado (ejemplo:{" "}
            <i>data:image/png;base64,iV...</i>), pégarlo en la columna{" "}
            <b>imageBase64</b> del Excel.
          </li>
          <li>
            Otra opci+ón, poner la <b>URL pública</b> de la imagen en la columna{" "}
            <b>imageUrl</b>.
          </li>
        </ul>
      </div>
      <WhatsAppSentMessagesAdmin />
    </div>
  );
}
