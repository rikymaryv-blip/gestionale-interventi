import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import SignatureCanvas from "react-signature-canvas"

export default function BollettinoPage() {

  const { id } = useParams()
  const navigate = useNavigate()
  const sigCanvas = useRef(null)

  const [intervento, setIntervento] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)

  useEffect(() => {
    loadIntervento()
  }, [])

  async function loadIntervento() {

    const { data } = await supabase
      .from("interventi")
      .select(`
        *,
        clienti ( nome ),
        ore_operatori (
          ore,
          operatori ( nome )
        )
      `)
      .eq("id", id)
      .single()

    const { data: materiali } = await supabase
      .from("materiali_bollettino")
      .select("*")
      .eq("intervento_id", id)

    setIntervento({
      ...data,
      materiali_bollettino: materiali || []
    })
  }

  function salvaFirma() {
    const firmaBase64 = sigCanvas.current
      .getTrimmedCanvas()
      .toDataURL("image/png")

    console.log("Firma:", firmaBase64)
    alert("Firma acquisita (per ora solo console)")
  }

  // ===============================
  // GENERA SOLO PDF
  // ===============================
  async function generaBollettino() {

    setLoading(true)

    try {

      const response = await fetch(
        "https://olmekymxlopdilkhucvf.supabase.co/functions/v1/genera-bollettino",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            intervento_id: intervento.id,
            invia_mail: false   // 👈 NON INVIA MAIL
          })
        }
      )

      const result = await response.json()

      if (response.ok && result.success) {

        if (result.pdfUrl) {
          setPdfUrl(result.pdfUrl)
        }

        alert("PDF generato e salvato ✅")

      } else {
        alert("Errore nella generazione ❌")
        console.error(result)
      }

    } catch (err) {
      console.error(err)
      alert("Errore di connessione ❌")
    }

    setLoading(false)
  }

  // ===============================
  // INVIA MAIL (PDF GIÀ SALVATO)
  // ===============================
  async function inviaMail() {

    setLoading(true)

    try {

      const response = await fetch(
        "https://olmekymxlopdilkhucvf.supabase.co/functions/v1/genera-bollettino",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            intervento_id: intervento.id,
            invia_mail: true   // 👈 QUI INVIA
          })
        }
      )

      const result = await response.json()

      if (response.ok && result.success) {
        alert("Mail inviata con successo 📧")
      } else {
        alert("Errore invio mail ❌")
        console.error(result)
      }

    } catch (err) {
      console.error(err)
      alert("Errore di connessione ❌")
    }

    setLoading(false)
  }

  if (!intervento) return <div>Caricamento...</div>

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px" }}>

      {/* BOTTONI SUPERIORI */}
      <div style={{ marginBottom: "30px" }}>

        <button 
          onClick={generaBollettino}
          disabled={loading}
          style={{
            marginRight: "10px",
            backgroundColor: "#28a745",
            color: "white",
            padding: "8px 14px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          {loading ? "Generazione..." : "💾 Genera PDF"}
        </button>

        {pdfUrl && (
          <button
            onClick={() => window.open(pdfUrl, "_blank")}
            style={{
              marginRight: "10px",
              backgroundColor: "#007bff",
              color: "white",
              padding: "8px 14px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            📄 Scarica PDF
          </button>
        )}

        <button
          onClick={inviaMail}
          disabled={loading}
          style={{
            marginRight: "10px",
            backgroundColor: "#ffc107",
            color: "black",
            padding: "8px 14px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          📧 Invia Mail
        </button>

        <button onClick={() => navigate(-1)}>
          🔙 Torna indietro
        </button>

      </div>

      <h1 style={{ textAlign: "center" }}>
        BOLLETTINO INTERVENTO
      </h1>

      <hr style={{ margin: "30px 0" }} />

      <div style={{ marginBottom: "20px" }}>
        <strong>Data:</strong> {dayjs(intervento.data).format("DD/MM/YYYY")} <br />
        <strong>Cliente:</strong> {intervento.clienti?.nome} <br />
        <strong>Cantiere:</strong> {intervento.cantiere || ""}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <strong>Descrizione lavori:</strong>
        <div style={{ marginTop: "8px" }}>
          {intervento.descrizione}
        </div>
      </div>

      {/* MATERIALI */}
      {intervento.materiali_bollettino?.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <strong>Materiali:</strong>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Codice</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Descrizione</th>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Quantità</th>
              </tr>
            </thead>
            <tbody>
              {intervento.materiali_bollettino.map((m, index) => (
                <tr key={index}>
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.codice}</td>
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.descrizione}</td>
                  <td style={{ border: "1px solid #ccc", padding: "8px" }}>{m.quantita}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FIRMA */}
      <div style={{ marginTop: "40px" }}>
        <strong>Firma Cliente:</strong>

        <div style={{ border: "1px solid #000", marginTop: "10px" }}>
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width: 500,
              height: 200
            }}
          />
        </div>

        <div style={{ marginTop: "10px" }}>
          <button onClick={() => sigCanvas.current.clear()} style={{ marginRight: "10px" }}>
            Pulisci
          </button>

          <button onClick={salvaFirma}>
            Salva Firma
          </button>
        </div>
      </div>

    </div>
  )
}