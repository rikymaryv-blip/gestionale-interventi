import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

const CODICE_ADMIN = "1234"

export default function ClientiPage() {

  const [clienti, setClienti] = useState([])
  const [cantieri, setCantieri] = useState({})
  const [search, setSearch] = useState("")

  const [form, setForm] = useState({
    id: null,
    nome: "",
    telefono: "",
    email: "",
    indirizzo: "",
    piva: ""
  })

  const [nuovoCantiere, setNuovoCantiere] = useState({})

  useEffect(() => {
    loadClienti()
  }, [])

  async function loadClienti() {

    const { data, error } = await supabase
      .from("clienti")
      .select("*")
      .eq("attivo", true)
      .order("nome")

    if (error) {
      alert("Errore clienti")
      return
    }

    setClienti(data || [])

    const { data: can } = await supabase
      .from("cantieri")
      .select("*")

    const grouped = {}
    can?.forEach(c => {
      if (!grouped[c.cliente_id]) grouped[c.cliente_id] = []
      grouped[c.cliente_id].push(c)
    })

    setCantieri(grouped)
  }

  function puoModificare(cliente) {

    if (!cliente.created_at) return true

    const created = dayjs.utc(cliente.created_at)
    const now = dayjs()

    const diffMinuti = now.diff(created, "minute")

    if (diffMinuti <= 5) return true

    const codice = prompt("Codice autorizzazione:")
    if (codice !== CODICE_ADMIN) {
      alert("Codice errato")
      return false
    }

    return true
  }

  async function salvaCliente() {

    if (!form.nome) return alert("Nome obbligatorio")

    const { data: esistenti } = await supabase
      .from("clienti")
      .select("id, nome")
      .eq("attivo", true)

    const duplicato = esistenti?.find(c =>
      c.nome?.toLowerCase() === form.nome.trim().toLowerCase() &&
      c.id !== form.id
    )

    if (duplicato) {
      alert("Cliente già esistente")
      return
    }

    let res

    if (form.id) {
      res = await supabase
        .from("clienti")
        .update({
          nome: form.nome,
          telefono: form.telefono,
          email: form.email,
          indirizzo: form.indirizzo,
          piva: form.piva
        })
        .eq("id", form.id)
    } else {
      res = await supabase
        .from("clienti")
        .insert([{
          nome: form.nome.trim(),
          telefono: form.telefono,
          email: form.email,
          indirizzo: form.indirizzo,
          piva: form.piva,
          attivo: true
        }])
    }

    if (res.error) {
      alert("Errore: " + res.error.message)
      return
    }

    setForm({
      id: null,
      nome: "",
      telefono: "",
      email: "",
      indirizzo: "",
      piva: ""
    })

    loadClienti()
  }

  async function eliminaCliente(id) {

    const cliente = clienti.find(c => c.id === id)

    if (!puoModificare(cliente)) return

    await supabase
      .from("clienti")
      .update({ attivo: false })
      .eq("id", id)

    loadClienti()
  }

  async function aggiungiCantiere(cliente_id) {

    const c = nuovoCantiere[cliente_id]

    if (!c?.nome) return alert("Nome cantiere obbligatorio")

    const { error } = await supabase
      .from("cantieri")
      .insert([{
        cliente_id,
        nome: c.nome,
        indirizzo: c.indirizzo || "",
        telefono: c.telefono || ""
      }])

    if (error) {
      alert("Errore cantiere: " + error.message)
      return
    }

    setNuovoCantiere(prev => ({
      ...prev,
      [cliente_id]: { nome: "", indirizzo: "", telefono: "" }
    }))

    loadClienti()
  }

  const clientiFiltrati = clienti.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: 20 }}>

      <h2>Anagrafica Clienti</h2>

      {/* 🔍 RICERCA */}
      <input
        placeholder="🔍 Cerca cliente..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      {/* FORM */}
      <input
        id="campo-nome"
        placeholder="Nome"
        value={form.nome}
        onChange={e => setForm({ ...form, nome: e.target.value })}
      />

      <input
        placeholder="Telefono"
        value={form.telefono}
        onChange={e => setForm({ ...form, telefono: e.target.value })}
      />

      <input
        placeholder="Email"
        value={form.email}
        onChange={e => setForm({ ...form, email: e.target.value })}
      />

      <input
        placeholder="Indirizzo"
        value={form.indirizzo}
        onChange={e => setForm({ ...form, indirizzo: e.target.value })}
      />

      <input
        placeholder="P.IVA"
        value={form.piva}
        onChange={e => setForm({ ...form, piva: e.target.value })}
      />

      <br /><br />

      <button onClick={salvaCliente}>💾 Salva</button>

      <hr />

      {/* LISTA CLIENTI */}
      {clientiFiltrati.map(c => (
        <div key={c.id} style={{
          border: "1px solid #ccc",
          padding: 10,
          marginTop: 10,
          borderRadius: 6
        }}>

          <h3>{c.nome}</h3>

          <div>{c.telefono}</div>
          <div>{c.email}</div>
          <div>{c.indirizzo}</div>

          <div style={{ marginTop: 10 }}>
            <button onClick={() => {
              if (!puoModificare(c)) return

              setForm(c)

              // 🔥 SCROLL + FOCUS AUTOMATICO
              setTimeout(() => {
                const el = document.getElementById("campo-nome")
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" })
                  el.focus()
                  el.select()
                }
              }, 100)
            }}>
              ✏️ Modifica
            </button>

            <button onClick={() => eliminaCliente(c.id)}>
              🗑️ Elimina
            </button>
          </div>

          {/* CANTIERI */}
          <div style={{ marginTop: 10 }}>
            <strong>🏗️ Cantieri</strong>

            {(cantieri[c.id] || []).map(can => (
              <div key={can.id} style={{
                borderBottom: "1px solid #eee",
                padding: 5
              }}>
                <div>{can.nome}</div>
                <small>{can.indirizzo}</small><br />
                <small>{can.telefono}</small>
              </div>
            ))}

            <input
              placeholder="Nome cantiere"
              value={nuovoCantiere[c.id]?.nome || ""}
              onChange={e => setNuovoCantiere({
                ...nuovoCantiere,
                [c.id]: { ...nuovoCantiere[c.id], nome: e.target.value }
              })}
            />

            <input
              placeholder="Indirizzo"
              value={nuovoCantiere[c.id]?.indirizzo || ""}
              onChange={e => setNuovoCantiere({
                ...nuovoCantiere,
                [c.id]: { ...nuovoCantiere[c.id], indirizzo: e.target.value }
              })}
            />

            <input
              placeholder="Telefono"
              value={nuovoCantiere[c.id]?.telefono || ""}
              onChange={e => setNuovoCantiere({
                ...nuovoCantiere,
                [c.id]: { ...nuovoCantiere[c.id], telefono: e.target.value }
              })}
            />

            <button onClick={() => aggiungiCantiere(c.id)}>➕</button>
          </div>

        </div>
      ))}

    </div>
  )
}