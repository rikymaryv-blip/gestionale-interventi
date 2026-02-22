import { useEffect, useState, useRef } from "react"
import {
  createIntervento,
  updateIntervento,
  salvaOreOperatore,
  salvaMateriale,
  getClienti,
  getOperatori
} from "../services/interventiService"

import MaterialeSelector from "./MaterialeSelector"

export default function InterventoForm({
  editing,
  onSaved,
  reloadClientiKey
}) {

  const oggi = new Date().toISOString().split("T")[0]

  const [descrizione, setDescrizione] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [data, setData] = useState(oggi)
  const [clienti, setClienti] = useState([])
  const [operatoriDisponibili, setOperatoriDisponibili] = useState([])
  const [operatori, setOperatori] = useState([
    { operatore_id: "", ore: 8 }
  ])
  const [materiali, setMateriali] = useState([])

  const inputRefs = useRef([])

  useEffect(() => {
    loadClienti()
    loadOperatori()
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    loadClienti()
  }, [reloadClientiKey])

  useEffect(() => {
    if (editing) {
      setDescrizione(editing.descrizione || "")
      setClienteId(editing.cliente_id || "")
      setData(editing.data || oggi)
    }
  }, [editing])

  async function loadClienti() {
    const { data } = await getClienti()
    setClienti(data || [])
  }

  async function loadOperatori() {
    const { data } = await getOperatori()
    setOperatoriDisponibili(data || [])
  }

  function aggiungiOperatore() {
    setOperatori([...operatori, { operatore_id: "", ore: 8 }])
  }

  function handleOperatoreChange(index, field, value) {
    const updated = [...operatori]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setOperatori(updated)
  }

  function handleMaterialeSelect(articolo) {
    const nuovoMateriale = {
      codice: articolo.codice,
      descrizione: articolo.descrizione,
      quantita: 1,
      prezzo: articolo.prezzo || 0
    }

    setMateriali([...materiali, nuovoMateriale])
  }

  function removeMateriale(index) {
    const updated = [...materiali]
    updated.splice(index, 1)
    setMateriali(updated)
  }

  function handleKeyDown(e, index) {
    if (e.key === "Enter") {
      e.preventDefault()
      const next = inputRefs.current[index + 1]
      if (next) {
        next.focus()
      } else {
        handleSubmit()
      }
    }
  }

  function reset() {
    setDescrizione("")
    setClienteId("")
    setData(oggi)
    setOperatori([{ operatore_id: "", ore: 8 }])
    setMateriali([])
    inputRefs.current[0]?.focus()
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault()

    if (!descrizione || !clienteId || !data) {
      alert("Compila tutti i campi")
      return
    }

    let result

    if (editing) {
      result = await updateIntervento(
        editing.id,
        descrizione,
        clienteId,
        data
      )
    } else {
      result = await createIntervento(
        descrizione,
        clienteId,
        data
      )
    }

    if (result.error) {
      alert("Errore salvataggio")
      return
    }

    const intervento = result.data

    // Salvataggio operatori
    if (!editing) {
      for (let op of operatori) {
        if (op.operatore_id && op.ore) {
          await salvaOreOperatore(
            intervento.id,
            op.operatore_id,
            op.ore
          )
        }
      }
    }

    // Salvataggio materiali
    for (let m of materiali) {
      await salvaMateriale(intervento.id, m)
    }

    reset()
    if (onSaved) await onSaved()
  }

  return (
    <form onSubmit={handleSubmit}>

      <input
        ref={(el) => (inputRefs.current[0] = el)}
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, 0)}
      />

      <input
        ref={(el) => (inputRefs.current[1] = el)}
        type="text"
        placeholder="Descrizione"
        value={descrizione}
        onChange={(e) => setDescrizione(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, 1)}
      />

      <select
        ref={(el) => (inputRefs.current[2] = el)}
        value={clienteId}
        onChange={(e) => setClienteId(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, 2)}
      >
        <option value="">Seleziona cliente</option>
        {clienti.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      <hr />
      <h3>Operatori</h3>

      {operatori.map((op, index) => (
        <div key={index}>
          <select
            value={op.operatore_id}
            onChange={(e) =>
              handleOperatoreChange(index, "operatore_id", e.target.value)
            }
          >
            <option value="">Seleziona operatore</option>
            {operatoriDisponibili.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={op.ore}
            onChange={(e) =>
              handleOperatoreChange(
                index,
                "ore",
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />
        </div>
      ))}

      <button type="button" onClick={aggiungiOperatore}>
        + Operatore
      </button>

      <hr />
      <h3>Materiale</h3>

      <MaterialeSelector onSelect={handleMaterialeSelect} />

      {materiali.map((m, index) => (
        <div key={index} style={{ marginTop: "8px" }}>
          <strong>{m.codice}</strong> - {m.descrizione}

          <input
            type="number"
            value={m.quantita}
            style={{ width: "60px", marginLeft: "10px" }}
            onChange={(e) => {
              const updated = [...materiali]
              updated[index].quantita = Number(e.target.value)
              setMateriali(updated)
            }}
          />

          <span style={{ marginLeft: "10px" }}>
            € {m.prezzo}
          </span>

          <button
            type="button"
            style={{ marginLeft: "10px" }}
            onClick={() => removeMateriale(index)}
          >
            X
          </button>
        </div>
      ))}

      <br /><br />

      <button type="submit">
        {editing ? "Aggiorna" : "Salva"}
      </button>

    </form>
  )
}