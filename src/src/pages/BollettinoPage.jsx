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
  const [loading, setLoading] = useState(true)

  const canvasRef = useRef(null)
  const drawing = useRef(false)

  useEffect(() => {
    if (id) loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)

    const { data: intData } = await supabase
      .from("interventi")
      .select(`id, data, descrizione, clienti(nome)`)
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

    setLoading(false)
  }

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

  if (loading) return <div style={{ padding: 20 }}>Caricamento...</div>
  if (!intervento) return <div style={{ padding: 20 }}>Errore caricamento</div>

  return (
    <div style={container}>
      
      <h1 style={{ textAlign: "center" }}>BOLLETTINO INTERVENTO</h1>

      {/* INFO */}
      <div style={box}>
        <p><strong>Cliente:</strong> {intervento.clienti?.nome}</p>
        <p><strong>Data:</strong> {dayjs(intervento.data).format("DD/MM/YYYY")}</p>
        <p><strong>Descrizione:</strong> {intervento.descrizione}</p>
      </div>

      {/* OPERATORI */}
      <div style={box}>
        <h3>Operatori</h3>
        {operatori.map((op, i) => (
          <div key={i}>
            {op.operatori?.nome} — {op.ore}h
          </div>
        ))}
      </div>

      {/* 💣 MATERIALI MIGLIORATI */}
      <div style={box}>
        <h3>Materiali</h3>

        {/* intestazione */}
        <div style={rowHeader}>
          <div style={colQta}>Qta</div>
          <div style={colCodice}>Codice</div>
          <div style={colDesc}>Descrizione</div>
        </div>

        {materiali.map((m, i) => (
          <div key={i} style={rowMateriale}>

            <div style={colQta}>
              {m.quantita}
            </div>

            <div style={colCodice}>
              {m.codice}
            </div>

            <div style={colDesc}>
              {m.descrizione}
            </div>

          </div>
        ))}
      </div>

      {/* FIRMA */}
      <div style={box}>
        <h3>Firma Cliente</h3>

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

        <button onClick={clearFirma}>Pulisci firma</button>
      </div>

      {/* AZIONI */}
      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate("/")}>← Indietro</button>
      </div>

    </div>
  )
}

/* STILI */
const container = {
  maxWidth: 800,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial"
}

const box = {
  border: "1px solid #ccc",
  padding: 15,
  marginBottom: 20,
  borderRadius: 6
}

/* 💣 STILI NUOVI MATERIALI */
const rowHeader = {
  display: "flex",
  fontWeight: "bold",
  borderBottom: "2px solid #000",
  paddingBottom: 4,
  marginBottom: 6
}

const rowMateriale = {
  display: "flex",
  padding: "4px 0",
  borderBottom: "1px solid #ddd"
}

const colQta = {
  width: 60,
  textAlign: "center"
}

const colCodice = {
  width: 150
}

const colDesc = {
  flex: 1
}