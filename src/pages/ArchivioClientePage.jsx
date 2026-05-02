import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"

export default function ArchivioClientePage() {

  const navigate = useNavigate()

  const [clienti, setClienti] = useState([])
  const [clienteSelezionato, setClienteSelezionato] = useState("")
  const [archivio, setArchivio] = useState([])

  useEffect(() => {
    loadClienti()
  }, [])

  async function loadClienti() {
    const { data } = await supabase
      .from("clienti")
      .select("id, nome")
      .order("nome")

    setClienti(data || [])
  }

  async function caricaArchivio(clienteNome) {

    if (!clienteNome) return

    // 🔥 PRENDE SOLO QUEL CLIENTE (FIX VERO)
    const { data, error } = await supabase
      .from("fatture")
      .select(`
        id,
        numero,
        cliente,
        data,
        fatture_dettaglio (
          id,
          intervento_id,
          data,
          descrizione,
          cantiere
        )
      `)
      .eq("cliente", clienteNome) // ✅ QUESTO È IL FIX
      .order("data", { ascending: false })

    if (error) {
      console.error("ERRORE:", error)
      return
    }

    console.log("ARCHIVIO:", data)

    setArchivio(data || [])
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>📂 Archivio Cliente</h2>

      <select
        value={clienteSelezionato}
        onChange={(e) => {
          const nome = e.target.value
          setClienteSelezionato(nome)
          caricaArchivio(nome)
        }}
        style={{ padding: 8, width: 300 }}
      >
        <option value="">-- Seleziona cliente --</option>

        {clienti.map(c => (
          <option key={c.id} value={c.nome}>
            {c.nome}
          </option>
        ))}
      </select>

      <hr style={{ margin: "20px 0" }} />

      {archivio.length === 0 && (
        <p>Nessun dato trovato</p>
      )}

      {archivio.map(f => (
        <div key={f.id} style={{
          border: "2px solid black",
          marginTop: 20,
          padding: 10
        }}>

          <h3>📄 Fattura #{f.numero || f.id}</h3>

          <p>
            Cliente: {f.cliente} <br />
            Data: {f.data ? dayjs(f.data).format("DD/MM/YYYY") : ""}
          </p>

          <button onClick={() => navigate(`/fattura/${f.id}`)}>
            🔍 Apri Fattura
          </button>

          <h4>📦 Bollettini</h4>

          {f.fatture_dettaglio?.length === 0 && (
            <p>Nessun bollettino</p>
          )}

          {f.fatture_dettaglio?.map(b => (
            <div key={b.id} style={{
              border: "1px solid #ccc",
              marginTop: 10,
              padding: 10
            }}>
              📅 {dayjs(b.data).format("DD/MM/YYYY")} <br />
              🏗️ {b.cantiere || "Nessun cantiere"} <br />
              📝 {b.descrizione}

              <br />

              <button onClick={() => navigate(`/bollettino/${b.intervento_id}`)}>
                🔍 Apri Bollettino
              </button>
            </div>
          ))}

        </div>
      ))}

    </div>
  )
}