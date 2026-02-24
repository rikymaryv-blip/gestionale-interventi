import { useEffect, useState } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../supabaseClient"
import MaterialeSelector from "./MaterialeSelector"

dayjs.locale("it")

export default function InterventoForm({ onSaved, interventoDaModificare }) {

  const isEdit = !!interventoDaModificare

  const [data, setData] = useState(dayjs().format("YYYY-MM-DD"))
  const [descrizione, setDescrizione] = useState("")
  const [clienti, setClienti] = useState([])
  const [searchCliente, setSearchCliente] = useState("")
  const [selectedCliente, setSelectedCliente] = useState(null)

  const [operatori, setOperatori] = useState([])
  const [righeOperatori, setRigheOperatori] = useState([
    { operatore_id: "", ore: "" }
  ])

  const [materiali, setMateriali] = useState([])

  useEffect(() => {
    loadClienti()
    loadOperatori()
  }, [])

  // 🔥 PRECARICAMENTO MODIFICA
  useEffect(() => {
    if (!interventoDaModificare) return

    setData(interventoDaModificare.data)
    setDescrizione(interventoDaModificare.descrizione)

    if (interventoDaModificare.clienti) {
      setSearchCliente(interventoDaModificare.clienti.nome)
      setSelectedCliente({
        id: interventoDaModificare.cliente_id,
        nome: interventoDaModificare.clienti.nome
      })
    }

    if (interventoDaModificare.ore_operatori) {
      setRigheOperatori(
        interventoDaModificare.ore_operatori.map(o => ({
          operatore_id: o.operatore_id,
          ore: o.ore
        }))
      )
    }

    if (interventoDaModificare.materiali_bollettino) {
      setMateriali(
        interventoDaModificare.materiali_bollettino.map(m => ({
          codice: m.codice,
          descrizione: m.descrizione,
          quantita: m.quantita,
          prezzo: m.prezzo,
          totale: m.totale
        }))
      )
    }

  }, [interventoDaModificare])

  async function loadClienti() {
    const { data } = await supabase
      .from("clienti")
      .select("*")
      .eq("attivo", true)
      .order("nome", { ascending: true })

    setClienti(data || [])
  }

  async function loadOperatori() {
    const { data } = await supabase
      .from("operatori")
      .select("*")
      .order("nome", { ascending: true })

    setOperatori(data || [])
  }

  const clientiFiltrati = clienti.filter(c =>
    c.nome.toLowerCase().includes(searchCliente.toLowerCase())
  )

  function aggiornaRiga(index, campo, valore) {
    const nuove = [...righeOperatori]
    nuove[index][campo] = valore
    setRigheOperatori(nuove)
  }

  function aggiungiRigaOperatore() {
    setRigheOperatori([
      ...righeOperatori,
      { operatore_id: "", ore: "" }
    ])
  }

  function aggiungiMateriale(articolo) {

    setMateriali(prev => {

      const esiste = prev.find(m => m.codice === articolo.codice)

      if (esiste) {
        return prev.map(m =>
          m.codice === articolo.codice
            ? { ...m, quantita: m.quantita + 1 }
            : m
        )
      }

      const nuovo = {
        codice: articolo.codice,
        descrizione: articolo.descrizione,
        quantita: 1,
        prezzo: articolo.prezzo || 0,
        totale: articolo.prezzo || 0
      }

      return [...prev, nuovo]
    })
  }

  function eliminaMateriale(index) {
    setMateriali(prev => prev.filter((_, i) => i !== index))
  }

  async function salvaIntervento() {

    if (!selectedCliente) {
      alert("Seleziona un cliente")
      return
    }

    let interventoId

    if (isEdit) {

      await supabase
        .from("interventi")
        .update({
          data,
          cliente_id: selectedCliente.id,
          descrizione
        })
        .eq("id", interventoDaModificare.id)

      interventoId = interventoDaModificare.id

      // 🔥 Cancella vecchi operatori e materiali
      await supabase.from("ore_operatori")
        .delete()
        .eq("intervento_id", interventoId)

      await supabase.from("materiali_bollettino")
        .delete()
        .eq("intervento_id", interventoId)

    } else {

      const { data: intervento } = await supabase
        .from("interventi")
        .insert({
          data,
          cliente_id: selectedCliente.id,
          descrizione
        })
        .select()
        .single()

      interventoId = intervento.id
    }

    // 🔥 Reinserisci operatori
    const inserimenti = righeOperatori
      .filter(r => r.operatore_id && r.ore)
      .map(r => ({
        intervento_id: interventoId,
        operatore_id: r.operatore_id,
        ore: Number(r.ore)
      }))

    if (inserimenti.length > 0) {
      await supabase.from("ore_operatori").insert(inserimenti)
    }

    // 🔥 Reinserisci materiali
    if (materiali.length > 0) {

      const materialiDaInserire = materiali.map(m => ({
        intervento_id: interventoId,
        codice: m.codice,
        descrizione: m.descrizione,
        quantita: m.quantita,
        prezzo: m.prezzo,
        totale: m.totale,
        origine: "listino"
      }))

      await supabase
        .from("materiali_bollettino")
        .insert(materialiDaInserire)
    }

    alert(isEdit ? "Intervento aggiornato" : "Intervento salvato")

    setDescrizione("")
    setSearchCliente("")
    setSelectedCliente(null)
    setRigheOperatori([{ operatore_id: "", ore: "" }])
    setMateriali([])

    if (onSaved) onSaved()
  }

  return (
    <div>

      <h2>{isEdit ? "Modifica Intervento" : "Nuovo Intervento"}</h2>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Cliente..."
          value={searchCliente}
          onChange={(e) => {
            setSearchCliente(e.target.value)
            setSelectedCliente(null)
          }}
        />

        {searchCliente && !selectedCliente && (
          <div style={{ border: "1px solid #ccc" }}>
            {clientiFiltrati.map(c => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCliente(c)
                  setSearchCliente(c.nome)
                }}
              >
                {c.nome}
              </div>
            ))}
          </div>
        )}
      </div>

      <textarea
        value={descrizione}
        onChange={(e) => setDescrizione(e.target.value)}
      />

      <h3>Operatori</h3>

      {righeOperatori.map((riga, index) => (
        <div key={index}>
          <select
            value={riga.operatore_id}
            onChange={(e) =>
              aggiornaRiga(index, "operatore_id", e.target.value)
            }
          >
            <option value="">Operatore</option>
            {operatori.map(op => (
              <option key={op.id} value={op.id}>
                {op.nome}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={riga.ore}
            onChange={(e) =>
              aggiornaRiga(index, "ore", e.target.value)
            }
          />
        </div>
      ))}

      <button onClick={aggiungiRigaOperatore}>
        + Operatore
      </button>

      <h3>Materiali</h3>

      <MaterialeSelector onSelect={aggiungiMateriale} />

      {materiali.map((m, index) => (
        <div key={index}>
          {m.codice} - {m.descrizione}
          <input
            type="number"
            value={m.quantita}
            onChange={(e) => {
              const nuova = [...materiali]
              nuova[index].quantita = Number(e.target.value)
              setMateriali(nuova)
            }}
          />
          <button onClick={() => eliminaMateriale(index)}>X</button>
        </div>
      ))}

      <div style={{ marginTop: "20px" }}>
        <button onClick={salvaIntervento}>
          {isEdit ? "Aggiorna Intervento" : "Salva Intervento"}
        </button>
      </div>

    </div>
  )
}