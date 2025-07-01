import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function WhatsAppBulkSender() {
  const [rows, setRows] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);

  // Descargar template
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["phone", "message"],
      ["3112223344", "Hola, ¿cómo estás?"],
      ["3201234567", "¡Recuerda tu cita!"],
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
            obj[h?.toLowerCase()] = row[idx]?.toString().trim();
          });
          return obj;
        })
        .filter((r) => r.phone && r.message);

      setRows(rowObjects);
      setResults([]);
    };
    reader.readAsBinaryString(file);
  };

  const sendMessages = async () => {
    setSending(true);
    let res = [];
    for (let i = 0; i < rows.length; i++) {
      const { phone, message } = rows[i];
      try {
        const response = await fetch("https://apiwhatsapp.geniality.com.co/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: `57${phone.replace(/^57/, "")}`,
            message,
          }),
        });
        if (response.ok) {
          res.push({ phone, message, status: "Enviado" });
        } else {
          const errorText = await response.text();
          res.push({ phone, message, status: "Error", error: errorText });
        }
      } catch (err) {
        res.push({ phone, message, status: "Error", error: err.message });
      }
      setResults([...res]);
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
        <>
          <table border="1" cellPadding="5" style={{ width: "100%", margin: "1em 0" }}>
            <thead>
              <tr>
                <th>Teléfono</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td>{r.phone}</td>
                  <td>{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={sendMessages} disabled={sending}>
            {sending ? "Enviando..." : "Enviar mensajes"}
          </button>
        </>
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
    </div>
  );
}
