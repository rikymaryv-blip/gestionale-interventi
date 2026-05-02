import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import MaterialeSelector from "./MaterialeSelector"

export default function InterventoForm({ onSaved }) {

  const [descrizione, setDescrizione] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [data, setData] = useState("")

  const [clienti, setClienti] = useState([])
  const [materiali, setMateriali] = useState([])

  useEffect(() => {
    loadClienti()

    // 🔥 imposta data automatica oggi
    const oggi = new Date().toISOString().split("T")[0]
    setData(oggi)

  }, [])

  async function loadClienti() {
    const { data } = await supabase
      .from("clienti")
      .select("id, nome")
      .eq("attivo", true)
      .order("nome")

    setClienti(data || [])
  }

  function aggiungiMateriale(m) {
    setMateriali(prev => {
      const esiste = prev.find(x => x.codice === m.codice)

      if (esiste) {
        return prev.map(x =>
          x.codice === m.codice
            ? { ...x, quantita: x.quantita + 1 }
            : x
        )
      }

      return [...prev, m]
    })
  }

  async function salvaIntervento() {
    try {

      if (!clienteId) {
        alert("Seleziona cliente")
        return
      }

      if (!data) {
        alert("Data obbligatoria")
        return
      }

      // 🔥 SALVA INTERVENTO
      const { data: intervento, error } = await supabase
        .from("interventi")
        .insert({
          cliente_id: clienteId,
          descrizione,
          data
        })
        .select()

      if (error) throw error

      const id = intervento?.[0]?.id

      // 🔥 SALVA MATERIALI (se presenti)
      if (materiali.length > 0) {

        const mat = materiali.map(m => ({
          intervento_id: id,
          codice: m.codice,
          descrizione: m.descrizione,
          quantita: Number(m.quantita || 1),
          prezzo: Number(m.prezzo || 0),
          totale: Number(m.quantita || 1) * Number(m.prezzo || 0),
          origine: "listino"
        }))

        const { error: errMat } = await supabase
          .from("materiali_bollettino")
          .insert(mat)

        if (errMat) throw errMat
      }

      alert("SALVATO ✅")

      // 🔥 RESET
      setDescrizione("")
      setClienteId("")
      setMateriali([])

      // 🔥 aggiorna lista sopra
      if (onSaved) onSaved()

    } catch (err) {
      console.error("❌ ERRORE:", err)
      alert("ERRORE: " + err.message)
    }
  }

  return (
    <div style={{ marginBottom: "20px" }}>

      <h2>Nuovo Intervento</h2>

      {/* CLIENTE */}
      <select
        value={clienteId}
        onChange={e => setClienteId(e.target.value)}
      >
        <option value="">Seleziona cliente</option>
        {clienti.map(c => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      {/* DATA */}
      <input
        type="date"
        value={data}
        onChange={e => setData(e.target.value)}
      />

      {/* DESCRIZIONE */}
      <input
        placeholder="Descrizione"
        value={descrizione}
        onChange={e => setDescrizione(e.target.value)}
      />

      {/* MATERIALI */}
      <h3>Materiali</h3>
      <MaterialeSelector onAdd={aggiungiMateriale} />

      {materiali.map((m, i) => (
        <div key={i}>
          {m.codice} - {m.descrizione} (x{m.quantita})
        </div>
      ))}

      <button onClick={salvaIntervento}>
        SALVA
      </button>

    </div>
  )
}