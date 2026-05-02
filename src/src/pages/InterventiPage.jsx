import { useEffect, useState } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../supabaseClient"
import MaterialeSelector from "../components/MaterialeSelector"

dayjs.locale("it")

export default function InterventiPage() {
  const [interventi, setInterventi] = useState([])
  const [clienti, setClienti] = useState([])

  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    cliente_id: "",
    data: dayjs().format("YYYY-MM-DD"),
    descrizione: "",
    materiali: []
  })

  const [errori, setErrori] = useState({})

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    const { data } = await supabase
      .from("interventi")
      .select(`
        id,
        data,
        descrizione,
        clienti(nome),
        materiali_bollettino(codice, descrizione, quantita)
      `)
      .order("data", { ascending: false })

    const { data: cli } = await supabase
      .from("clienti")
      .select("*")
      .eq("attivo", true)

    setInterventi(data || [])
    setClienti(cli || [])
  }

  function resetForm() {
    setForm({
      cliente_id: "",
      data: dayjs().format("YYYY-MM-DD"),
      descrizione: "",
      materiali: []
    })
    setErrori({})
  }

  // 💣 VALIDAZIONE CORRETTA
  function valida() {
    let err = {}

    if (!form.cliente_id) err.cliente = true
    if (!form.descrizione) err.descrizione = true

    setErrori(err)
    return Object.keys(err).length === 0
  }

  async function salvaIntervento() {
    if (!valida()) return

    const { data: int } = await supabase
      .from("interventi")
      .insert({
        cliente_id: form.cliente_id,
        data: form.data,
        descrizione: form.descrizione
      })
      .select()
      .single()

    const mats = form.materiali.map(m => ({
      intervento_id: int.id,
      codice: m.codice,
      descrizione: m.descrizione,
      quantita: Number(m.quantita) || 1
    }))

    if (mats.length > 0) {
      await supabase.from("materiali_bollettino").insert(mats)
    }

    resetForm()
    setShowForm(false)
    loadAll()
  }

  async function eliminaIntervento(id) {
    if (!confirm("Eliminare intervento?")) return

    await supabase.from("materiali_bollettino").delete().eq("intervento_id", id)
    await supabase.from("interventi").delete().eq("id", id)

    loadAll()
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Interventi</h2>

      <button onClick={() => setShowForm(!showForm)}>
        ➕ Nuovo Intervento
      </button>

      {showForm && (
        <div style={{ border: "1px solid #ccc", padding: 15, marginTop: 20 }}>

          <h3>Nuovo Intervento</h3>

          {/* CLIENTE */}
          <select
            value={form.cliente_id}
            onChange={e => setForm({ ...form, cliente_id: e.target.value })}
            style={errori.cliente ? inputErrore : {}}
          >
            <option value="">Seleziona cliente</option>
            {clienti.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          {/* DATA */}
          <input
            type="date"
            value={form.data}
            onChange={e => setForm({ ...form, data: e.target.value })}
          />

          {/* DESCRIZIONE */}
          <input
            placeholder="Descrizione"
            value={form.descrizione}
            onChange={e => setForm({ ...form, descrizione: e.target.value })}
            style={errori.descrizione ? inputErrore : {}}
          />

          <h4>Materiali</h4>

          <MaterialeSelector
            onAdd={(item) => {
              setErrori({})
              setForm({
                ...form,
                materiali: [...form.materiali, item]
              })
            }}
          />

          {/* LISTA MATERIALI */}
          {form.materiali.map((m, i) => (
            <div key={i} style={rowMateriale}>
              <div style={infoMateriale}>
                {m.codice} - {m.descrizione}
              </div>

              <button
                onClick={() => {
                  const newMat = form.materiali.filter((_, idx) => idx !== i)
                  setForm({ ...form, materiali: newMat })
                }}
              >
                ❌
              </button>
            </div>
          ))}

          <br />
          <button onClick={salvaIntervento}>💾 Salva</button>

        </div>
      )}

      {/* LISTA */}
      {interventi.map(i => (
        <div key={i.id} style={{ border: "1px solid #ccc", marginTop: 10, padding: 10 }}>
          <p><strong>{i.clienti?.nome}</strong></p>
          <p>{dayjs(i.data).format("DD/MM/YYYY")}</p>
          <p>{i.descrizione}</p>

          {i.materiali_bollettino?.map((m, idx) => (
            <div key={idx}>
              {m.codice} - {m.descrizione} (x{m.quantita})
            </div>
          ))}

          <button onClick={() => eliminaIntervento(i.id)}>🗑️</button>
        </div>
      ))}
    </div>
  )
}

/* STILI */
const rowMateriale = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 5
}

const infoMateriale = {
  flex: 1
}

const inputErrore = {
  border: "2px solid red"
}