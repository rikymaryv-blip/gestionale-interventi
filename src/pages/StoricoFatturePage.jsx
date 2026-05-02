import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"

export default function StoricoFatturePage() {

  const navigate = useNavigate()

  const [fatture, setFatture] = useState([])
  const [clienti, setClienti] = useState([])
  const [filtroCliente, setFiltroCliente] = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {

    // 🔹 carica fatture
    const { data: fattureData } = await supabase
      .from("fatture")
      .select("*")
      .order("data", { ascending: false })

    setFatture(fattureData || [])

    // 🔹 carica clienti per filtro
    const { data: clientiData } = await supabase
      .from("clienti")
      .select("nome")
      .order("nome")

    setClienti(clientiData || [])
  }

  // 🔥 filtro lato JS
  const fattureFiltrate = fatture.filter(f =>
    !filtroCliente ||
    f.cliente?.toLowerCase().includes(filtroCliente.toLowerCase())
  )

  return (
    <div style={{ padding: 20 }}>

      <h2>📂 Storico Fatture</h2>

      {/* 🔍 FILTRO CLIENTE */}
      <select
        value={filtroCliente}
        onChange={(e) => setFiltroCliente(e.target.value)}
        style={{ padding: 8, width: 300 }}
      >
        <option value="">-- Tutti i clienti --</option>

        {clienti.map((c, i) => (
          <option key={i} value={c.nome}>
            {c.nome}
          </option>
        ))}
      </select>

      <hr style={{ margin: "20px 0" }} />

      {fattureFiltrate.length === 0 && (
        <p>Nessuna fattura trovata</p>
      )}

      {fattureFiltrate.map(f => (
        <div key={f.id} style={{
          border: "2px solid black",
          marginTop: 10,
          padding: 10
        }}>

          <b>Fattura #{f.numero || f.id}</b><br />
          Cliente: {f.cliente}<br />
          Data: {f.data ? dayjs(f.data).format("DD/MM/YYYY") : ""}

          <br /><br />

          {/* 🔥 BOTTONE APRI */}
          <button onClick={() => navigate(`/fattura/${f.id}`)}>
            🔍 Apri Fattura
          </button>

        </div>
      ))}

    </div>
  )
}