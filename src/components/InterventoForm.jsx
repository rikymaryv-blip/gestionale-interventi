import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import MaterialeSelector from "./MaterialeSelector"

export default function InterventoForm({ onSaved }) {

  const [clienteId, setClienteId] = useState("")
  const [cantiereId, setCantiereId] = useState("")
  const [data, setData] = useState("")
  const [descrizione, setDescrizione] = useState("")

  const [clienti, setClienti] = useState([])
  const [cantieri, setCantieri] = useState([])
  const [materiali, setMateriali] = useState([])

  useEffect(() => {
    loadClienti()
    loadCantieri()

    const oggi = new Date().toISOString().split("T")[0]
    setData(oggi)
  }, [])

  // 🔥 CLIENTI
  async function loadClienti() {
    const { data } = await supabase
      .from("clienti")
      .select("id, nome")
      .order("nome")

    setClienti(data || [])
  }

  // 🔥 CANTIERI (SENZA FILTRO → SICURO)
  async function loadCantieri() {
    const { data } = await supabase
      .from("cantieri")
      .select("*")

    console.log("CANTIERI:", data)

    setCantieri(data || [])
  }

  // 🔥 AGGIUNGI MATERIALE
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

  // 🔥 SALVA
  async function salvaIntervento() {

    if (!clienteId) return alert("Seleziona cliente")

    const { data: intervento } = await supabase
      .from("interventi")
      .insert({
        cliente_id: clienteId,
        cantiere_id: cantiereId || null,
        data,
        descrizione
      })
      .select()

    const id = intervento?.[0]?.id

    // materiali (se presenti)
    if (materiali.length > 0) {
      const mat = materiali.map(m => ({
        intervento_id: id,
        codice: m.codice,
        descrizione: m.descrizione,
        quantita: m.quantita,
        origine: "listino"
      }))

      await supabase.from("materiali_bollettino").insert(mat)
    }

    alert("SALVATO ✅")

    setClienteId("")
    setCantiereId("")
    setDescrizione("")
    setMateriali([])

    if (onSaved) onSaved()
  }

  return (
    <div style={{ marginBottom: 20 }}>

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

      {/* 🔥 CANTIERE */}
      <select
        value={cantiereId}
        onChange={e => setCantiereId(e.target.value)}
      >
        <option value="">Seleziona cantiere</option>

        {cantieri.map(c => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <br /><br />

      {/* DATA */}
      <input
        type="date"
        value={data}
        onChange={e => setData(e.target.value)}
      />

      <br /><br />

      {/* DESCRIZIONE */}
      <input
        placeholder="Descrizione"
        value={descrizione}
        onChange={e => setDescrizione(e.target.value)}
      />

      <br /><br />

      {/* MATERIALI */}
      <h3>Materiali</h3>
      <MaterialeSelector onAdd={aggiungiMateriale} />

      {materiali.map((m, i) => (
        <div key={i}>
          {m.codice} - {m.descrizione} (x{m.quantita})
        </div>
      ))}

      <br />

      <button onClick={salvaIntervento}>
        SALVA
      </button>

    </div>
  )
}