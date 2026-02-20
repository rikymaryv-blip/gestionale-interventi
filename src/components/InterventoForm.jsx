import { useEffect, useState } from "react"
import {
  createIntervento,
  updateIntervento,
  salvaOreOperatore,
  getClienti,
  getOperatori
} from "../services/interventiService"

export default function InterventoForm({
  editing,
  onSaved,
  reloadClientiKey
}) {
  const [descrizione, setDescrizione] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [data, setData] = useState("")
  const [clienti, setClienti] = useState([])
  const [operatoriDisponibili, setOperatoriDisponibili] = useState([])
  const [operatori, setOperatori] = useState([
    { operatore_id: "", ore: "" }
  ])

  useEffect(() => {
    loadClienti()
    loadOperatori()
  }, [])

  // 🔥 ricarica clienti quando viene creato uno nuovo
  useEffect(() => {
    loadClienti()
  }, [reloadClientiKey])

  useEffect(() => {
    if (editing) {
      setDescrizione(editing.descrizione || "")
      setClienteId(editing.cliente_id || "")
      setData(editing.data || "")
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
    setOperatori([...operatori, { operatore_id: "", ore: "" }])
  }

  function handleOperatoreChange(index, field, value) {
    const updated = [...operatori]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setOperatori(updated)
  }

  function reset() {
    setDescrizione("")
    setClienteId("")
    setData("")
    setOperatori([{ operatore_id: "", ore: "" }])
  }

  async function handleSubmit(e) {
    e.preventDefault()

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

    reset()
    if (onSaved) await onSaved()
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
      />

      <input
        type="text"
        placeholder="Descrizione"
        value={descrizione}
        onChange={(e) => setDescrizione(e.target.value)}
      />

      <select
        value={clienteId}
        onChange={(e) => setClienteId(e.target.value)}
      >
        <option value="">Seleziona cliente</option>
        {clienti.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      {!editing && (
        <>
          <hr />
          <h3>Operatori</h3>

          {operatori.map((op, index) => (
            <div key={index}>
              <select
                value={op.operatore_id}
                onChange={(e) =>
                  handleOperatoreChange(
                    index,
                    "operatore_id",
                    e.target.value
                  )
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
                placeholder="Ore"
                value={op.ore}
                onChange={(e) =>
                  handleOperatoreChange(
                    index,
                    "ore",
                    e.target.value === ""
                      ? ""
                      : Number(e.target.value)
                  )
                }
              />
            </div>
          ))}

          <button type="button" onClick={aggiungiOperatore}>
            + Operatore
          </button>
        </>
      )}

      <br />
      <br />

      <button type="submit">
        {editing ? "Aggiorna" : "Salva"}
      </button>
    </form>
  )
}