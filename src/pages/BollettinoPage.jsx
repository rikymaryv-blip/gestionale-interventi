import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../supabaseClient"

dayjs.locale("it")

export default function BollettinoPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [intervento, setIntervento] = useState(null)
  const [operatori, setOperatori] = useState([])
  const [materiali, setMateriali] = useState([])
  const [rifirma, setRifirma] = useState(false)
  const [loadingMail, setLoadingMail] = useState(false)

  const canvasRef = useRef(null)
  const drawing = useRef(false)

  useEffect(() => {
    if (id) loadAll()
  }, [id])

  async function loadAll() {
    const { data: intData, error: intError } = await supabase
      .from("interventi")
      .select(`id, data, descrizione, firma_cliente, clienti(nome,email)`)
      .eq("id", id)
      .single()

    if (intError) {
      console.error(intError)
      alert("Errore caricamento intervento: " + intError.message)
      return
    }

    const { data: opData } = await supabase
      .from("ore_operatori")
      .select(`ore, operatori(nome)`)
      .eq("intervento_id", id)

    const { data: matData } = await supabase
      .from("materiali_bollettino")
      .select(`codice, descrizione, quantita, origine, origine_nome`)
      .eq("intervento_id", id)

    setIntervento(intData)
    setOperatori(opData || [])
    setMateriali(matData || [])
  }

  function startDraw(e) {
    e.preventDefault()
    drawing.current = true
    draw(e)
  }

  function endDraw() {
    drawing.current = false
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) ctx.beginPath()
  }

  function draw(e) {
    if (!drawing.current) return

    e.preventDefault()

    const rect = canvasRef.current.getBoundingClientRect()
    const ctx = canvasRef.current.getContext("2d")

    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "black"

    const touch = e.touches?.[0]

    const x = (touch ? touch.clientX : e.clientX) - rect.left
    const y = (touch ? touch.clientY : e.clientY) - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function clearFirma() {
    const ctx = canvasRef.current.getContext("2d")
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  async function salvaFirma() {
    const base64 = canvasRef.current.toDataURL()

    const { error } = await supabase
      .from("interventi")
      .update({ firma_cliente: base64 })
      .eq("id", id)

    if (error) {
      alert("Errore salvataggio firma")
      return
    }

    alert("✅ Firma salvata")
    setRifirma(false)
    loadAll()
  }

  function stampa() {
    window.print()
  }

  async function generaPDF() {
    const res = await fetch(
      "https://olmekymxlopdilkhucvf.supabase.co/functions/v1/genera-bollettino",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          intervento_id: id
        })
      }
    )

    if (!res.ok) {
      alert("Errore PDF")
      return
    }

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "bollettino.pdf"
    a.click()
  }

  async function apriGmailCliente() {
    if (loadingMail) return

    if (!intervento?.clienti?.email) {
      alert("Email cliente mancante")
      return
    }

    setLoadingMail(true)

    try {
      const res = await fetch(
        "https://olmekymxlopdilkhucvf.supabase.co/functions/v1/genera-bollettino",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            intervento_id: id,
            salva_storage: true
          })
        }
      )

      const result = await res.json()

      if (!res.ok) {
        console.error(result)
        alert("Errore creazione PDF")
        return
      }

      const emailCliente = intervento.clienti.email
      const cliente = intervento.clienti.nome || ""

      const data = intervento.data
        ? dayjs(intervento.data).format("DD/MM/YYYY")
        : ""

      const oggetto = `Bollettino intervento ${data}`

      const testo = `Buongiorno ${cliente},

ecco il link del bollettino intervento:

${result.url}

Descrizione:
${intervento.descrizione || "-"}

Cordiali saluti.`

      const gmailUrl =
        "https://mail.google.com/mail/?view=cm&fs=1" +
        `&to=${encodeURIComponent(emailCliente)}` +
        `&cc=${encodeURIComponent("riky.maryv@gmail.com")}` +
        `&su=${encodeURIComponent(oggetto)}` +
        `&body=${encodeURIComponent(testo)}`

      window.open(gmailUrl, "_blank")

    } catch (err) {
      console.error(err)
      alert("Errore apertura Gmail")
    } finally {
      setLoadingMail(false)
    }
  }

  function labelOrigine(m) {
    if (m.origine === "bolla") return "📦 Bolla"
    if (m.origine === "carrello") return "📥 Carrello"
    if (m.origine === "preferito") return "⭐ Preferito"
    if (m.origine === "manuale") return "✍️ Manuale"
    return ""
  }

  const box = {
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
    background: "#fafafa"
  }

  const th = {
    border: "1px solid #ccc",
    padding: 6,
    background: "#eee",
    textAlign: "left"
  }

  const td = {
    border: "1px solid #ccc",
    padding: 6
  }

  const tdQty = {
    ...td,
    textAlign: "center",
    fontWeight: "bold",
    width: 60
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>

      <h1 style={{ textAlign: "center", marginBottom: 30 }}>
        📄 BOLLETTINO INTERVENTO
      </h1>

      <div style={box}>
        <p><b>Cliente:</b> {intervento?.clienti?.nome || "-"}</p>
        <p><b>Email:</b> {intervento?.clienti?.email || "-"}</p>
        <p><b>Data:</b> {intervento?.data ? dayjs(intervento.data).format("DD/MM/YYYY") : "-"}</p>
        <p><b>Descrizione:</b> {intervento?.descrizione || "-"}</p>
      </div>

      <div style={box}>
        <h3>👷 Operatori</h3>

        {operatori.map((o, i) => (
          <div key={i}>
            {o.operatori?.nome || "-"} — <b>{o.ore}h</b>
          </div>
        ))}
      </div>

      <div style={box}>
        <h3>📦 Materiali</h3>

        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 10
        }}>
          <thead>
            <tr>
              <th style={th}>Q.tà</th>
              <th style={th}>Codice</th>
              <th style={th}>Descrizione</th>
            </tr>
          </thead>

          <tbody>
            {materiali.map((m, i) => (
              <tr key={i}>
                <td style={tdQty}>{m.quantita}</td>
                <td style={td}>{m.codice || "-"}</td>
                <td style={td}>
                  {m.descrizione || "-"}

                  {(m.origine || m.origine_nome) && (
                    <div style={{
                      fontSize: 12,
                      color: "#666",
                      marginTop: 3
                    }}>
                      {labelOrigine(m)} {m.origine_nome || ""}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={box}>
        <h3>✍️ Firma Cliente</h3>

        {intervento?.firma_cliente && !rifirma ? (
          <div>
            <img
              src={intervento.firma_cliente}
              style={{
                width: "100%",
                border: "1px solid black",
                borderRadius: 4
              }}
            />

            <br /><br />

            <button onClick={() => setRifirma(true)}>
              ✏️ Rifirma
            </button>
          </div>

        ) : (
          <div>
            <div
              style={{
                width: "100%",
                overflow: "hidden",
                touchAction: "none",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "auto",
                position: "relative"
              }}
            >
              <canvas
                ref={canvasRef}
                width={600}
                height={180}
                style={{
                  border: "2px solid black",
                  width: "100%",
                  borderRadius: 8,
                  background: "white",
                  touchAction: "none",
                  display: "block"
                }}
                onMouseDown={startDraw}
                onMouseUp={endDraw}
                onMouseMove={draw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  endDraw()
                }}
                onTouchMove={draw}
              />
            </div>

            <br /><br />

            <button onClick={clearFirma}>Pulisci</button>
            <button onClick={salvaFirma}>💾 Salva Firma</button>
          </div>
        )}
      </div>

      <hr />

      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap"
      }}>
        <button onClick={stampa}>
          🖨️ Stampa
        </button>

        <button onClick={generaPDF}>
          📄 PDF
        </button>

        <button
          onClick={apriGmailCliente}
          disabled={loadingMail}
          style={{
            background: "#198754",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: 5,
            cursor: loadingMail ? "not-allowed" : "pointer"
          }}
        >
          {loadingMail ? "Creazione..." : "📧 Apri Gmail"}
        </button>

        <button onClick={() => navigate(-1)}>
          ← Indietro
        </button>
      </div>

    </div>
  )
}