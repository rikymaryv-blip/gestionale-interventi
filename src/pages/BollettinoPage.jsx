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

  const canvasRef = useRef(null)
  const drawing = useRef(false)

  useEffect(() => {
    if (id) loadAll()
  }, [id])

  async function loadAll() {
    const { data: intData } = await supabase
      .from("interventi")
      .select(`id, data, descrizione, firma_cliente, clienti(nome)`)
      .eq("id", id)
      .single()

    const { data: opData } = await supabase
      .from("ore_operatori")
      .select(`ore, operatori(nome)`)
      .eq("intervento_id", id)

    const { data: matData } = await supabase
      .from("materiali_bollettino")
      .select(`codice, descrizione, quantita`)
      .eq("intervento_id", id)

    setIntervento(intData)
    setOperatori(opData || [])
    setMateriali(matData || [])
  }

  // ✏️ FIRMA
  function startDraw(e) {
    drawing.current = true
    draw(e)
  }

  function endDraw() {
    drawing.current = false
    const ctx = canvasRef.current.getContext("2d")
    ctx.beginPath()
  }

  function draw(e) {
    if (!drawing.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const ctx = canvasRef.current.getContext("2d")

    ctx.lineWidth = 2
    ctx.lineCap = "round"

    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top

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

    await supabase
      .from("interventi")
      .update({ firma_cliente: base64 })
      .eq("id", id)

    alert("✅ Firma salvata")
    setRifirma(false)
    loadAll()
  }

  // 🖨️ STAMPA VELOCE
  function stampa() {
    window.print()
  }

  // 📄 PDF (già tuo)
  async function generaPDF() {
    const res = await fetch(
      "https://olmekymxlopdilkhucvf.supabase.co/functions/v1/genera-bollettino",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervento_id: id })
      }
    )

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "bollettino.pdf"
    a.click()
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>

      <h1 style={{ textAlign: "center" }}>BOLLETTINO INTERVENTO</h1>

      <p><b>Cliente:</b> {intervento?.clienti?.nome}</p>
      <p><b>Data:</b> {dayjs(intervento?.data).format("DD/MM/YYYY")}</p>
      <p><b>Descrizione:</b> {intervento?.descrizione}</p>

      <h3>Operatori</h3>
      {operatori.map((o, i) => (
        <div key={i}>
          {o.operatori?.nome} - {o.ore}h
        </div>
      ))}

      <h3>Materiali</h3>
      {materiali.map((m, i) => (
        <div key={i}>
          {m.codice} - {m.descrizione} x {m.quantita}
        </div>
      ))}

      <h3>Firma Cliente</h3>

      {intervento?.firma_cliente && !rifirma ? (
        <div>
          <img
            src={intervento.firma_cliente}
            style={{ width: "100%", border: "1px solid black" }}
          />

          <br />

          <button onClick={() => setRifirma(true)}>
            ✏️ Rifirma
          </button>
        </div>

      ) : (
        <div>
          <canvas
            ref={canvasRef}
            width={600}
            height={150}
            style={{ border: "1px solid black", width: "100%" }}
            onMouseDown={startDraw}
            onMouseUp={endDraw}
            onMouseMove={draw}
            onTouchStart={startDraw}
            onTouchEnd={endDraw}
            onTouchMove={draw}
          />

          <br />

          <button onClick={clearFirma}>Pulisci</button>
          <button onClick={salvaFirma}>💾 Salva Firma</button>
        </div>
      )}

      <hr />

      <button onClick={stampa}>🖨️ Stampa</button>
      <button onClick={generaPDF}>📄 PDF</button>
      <button onClick={() => navigate(-1)}>← Indietro</button>

    </div>
  )
}