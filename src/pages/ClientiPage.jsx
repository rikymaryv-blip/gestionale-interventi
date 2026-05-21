import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"

dayjs.extend(utc)

const CODICE_ADMIN = "1234"

const cantiereVuoto = {
  nome: "",
  telefono: "",
  email: "",
}

export default function ClientiPage() {
  const [clienti, setClienti] = useState([])
  const [cantieri, setCantieri] = useState({})
  const [search, setSearch] = useState("")
  const [clienteAperto, setClienteAperto] = useState(null)

  const [form, setForm] = useState({
    id: null,
    nome: "",
    indirizzo: "",
    piva: "",
  })

  const [cantieriForm, setCantieriForm] = useState([{ ...cantiereVuoto }])

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

    const { data: can, error: errorCantieri } = await supabase
      .from("cantieri")
      .select("*")
      .order("nome")

    if (errorCantieri) {
      alert("Errore cantieri")
      return
    }

    const grouped = {}

    can?.forEach((c) => {
      if (!grouped[c.cliente_id]) grouped[c.cliente_id] = []
      grouped[c.cliente_id].push(c)
    })

    setCantieri(grouped)
  }

  function resetForm() {
    setForm({
      id: null,
      nome: "",
      indirizzo: "",
      piva: "",
    })

    setCantieriForm([{ ...cantiereVuoto }])
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

  function aggiornaCantiereForm(index, campo, valore) {
    setCantieriForm((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [campo]: valore } : c))
    )
  }

  function aggiungiRigaCantiere() {
    setCantieriForm((prev) => [...prev, { ...cantiereVuoto }])
  }

  function rimuoviRigaCantiere(index) {
    if (cantieriForm.length === 1) {
      setCantieriForm([{ ...cantiereVuoto }])
      return
    }

    setCantieriForm((prev) => prev.filter((_, i) => i !== index))
  }

  async function salvaCliente() {
    if (!form.nome.trim()) return alert("Nome cliente obbligatorio")

    const cantieriValidi = cantieriForm.filter((c) => c.nome.trim())

    const { data: esistenti } = await supabase
      .from("clienti")
      .select("id, nome")
      .eq("attivo", true)

    const duplicato = esistenti?.find(
      (c) =>
        c.nome?.toLowerCase() === form.nome.trim().toLowerCase() &&
        c.id !== form.id
    )

    if (duplicato) {
      alert("Cliente già esistente")
      return
    }

    let clienteId = form.id

    if (form.id) {
      const { error } = await supabase
        .from("clienti")
        .update({
          nome: form.nome.trim(),
          indirizzo: form.indirizzo,
          piva: form.piva,
        })
        .eq("id", form.id)

      if (error) {
        alert("Errore cliente: " + error.message)
        return
      }
    } else {
      const { data, error } = await supabase
        .from("clienti")
        .insert([
          {
            nome: form.nome.trim(),
            indirizzo: form.indirizzo,
            piva: form.piva,
            attivo: true,
          },
        ])
        .select("id")
        .single()

      if (error) {
        alert("Errore cliente: " + error.message)
        return
      }

      clienteId = data.id
    }

    if (cantieriValidi.length > 0) {
      const righeCantieri = cantieriValidi.map((c) => ({
        cliente_id: clienteId,
        nome: c.nome.trim(),
        telefono: c.telefono || "",
        email: c.email || "",
      }))

      const { error: errorCantieri } = await supabase
        .from("cantieri")
        .insert(righeCantieri)

      if (errorCantieri) {
        alert("Cliente salvato, ma errore cantieri: " + errorCantieri.message)
        return
      }
    }

    alert("Cliente salvato correttamente")
    resetForm()
    loadClienti()
  }

  async function eliminaCliente(id) {
    const cliente = clienti.find((c) => c.id === id)
    if (!cliente) return

    const conferma = prompt(
      `ATTENZIONE!\n\nStai per eliminare il cliente:\n${cliente.nome}\n\nPer confermare scrivi ELIMINA`
    )

    if (conferma !== "ELIMINA") {
      alert("Eliminazione annullata")
      return
    }

    const codice = prompt("Inserisci codice autorizzazione:")
    if (codice !== CODICE_ADMIN) {
      alert("Codice errato")
      return
    }

    const { error } = await supabase
      .from("clienti")
      .update({ attivo: false })
      .eq("id", id)

    if (error) {
      alert("Errore eliminazione cliente: " + error.message)
      return
    }

    loadClienti()
  }

  async function eliminaCantiere(cantiere) {
    const conferma = confirm(
      `Vuoi eliminare solo questo cantiere?\n\n${cantiere.nome}`
    )

    if (!conferma) return

    const { error } = await supabase
      .from("cantieri")
      .delete()
      .eq("id", cantiere.id)

    if (error) {
      alert("Errore eliminazione cantiere: " + error.message)
      return
    }

    loadClienti()
  }

  function modificaCliente(cliente) {
    if (!puoModificare(cliente)) return

    setForm({
      id: cliente.id,
      nome: cliente.nome || "",
      indirizzo: cliente.indirizzo || "",
      piva: cliente.piva || "",
    })

    setCantieriForm([{ ...cantiereVuoto }])

    setTimeout(() => {
      const el = document.getElementById("campo-nome")
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.focus()
        el.select()
      }
    }, 100)
  }

  const clientiFiltrati = clienti.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={page}>
      <h2>Anagrafica Clienti</h2>

      <input
        placeholder="🔍 Cerca cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={searchInput}
      />

      <div style={formBox}>
        <h3>{form.id ? "Modifica cliente" : "Nuovo cliente completo"}</h3>

        <input
          id="campo-nome"
          placeholder="Nome cliente"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          style={input}
        />

        <input
          placeholder="Indirizzo"
          value={form.indirizzo}
          onChange={(e) => setForm({ ...form, indirizzo: e.target.value })}
          style={input}
        />

        <input
          placeholder="Partita IVA"
          value={form.piva}
          onChange={(e) => setForm({ ...form, piva: e.target.value })}
          style={input}
        />

        <div style={cantieriFormBox}>
          <h4>Cantieri da salvare con il cliente</h4>

          {cantieriForm.map((cantiere, index) => (
            <div key={index} style={cantiereFormCard}>
              <strong>Cantiere {index + 1}</strong>

              <input
                placeholder="Nome cantiere"
                value={cantiere.nome}
                onChange={(e) =>
                  aggiornaCantiereForm(index, "nome", e.target.value)
                }
                style={input}
              />

              <input
                placeholder="Telefono cantiere"
                value={cantiere.telefono}
                onChange={(e) =>
                  aggiornaCantiereForm(index, "telefono", e.target.value)
                }
                style={input}
              />

              <input
                placeholder="Mail bollettini"
                value={cantiere.email}
                onChange={(e) =>
                  aggiornaCantiereForm(index, "email", e.target.value)
                }
                style={input}
              />

              <button
                onClick={() => rimuoviRigaCantiere(index)}
                style={deleteCantiereBtn}
              >
                🗑️ Rimuovi riga cantiere
              </button>
            </div>
          ))}

          <button onClick={aggiungiRigaCantiere} style={addBtn}>
            ➕ Aggiungi altro cantiere
          </button>
        </div>

        <div style={buttonRow}>
          <button onClick={salvaCliente} style={saveBtn}>
            💾 Salva cliente completo
          </button>

          <button onClick={resetForm} style={cancelBtn}>
            Pulisci campi
          </button>
        </div>
      </div>

      <hr />

      <h3>Clienti salvati</h3>

      {clientiFiltrati.map((c) => {
        const aperto = clienteAperto === c.id

        return (
          <div key={c.id} style={clienteCard}>
            <div
              style={clienteHeader}
              onClick={() => setClienteAperto(aperto ? null : c.id)}
            >
              <strong>{c.nome}</strong>
              <span>{aperto ? "▲" : "▼"}</span>
            </div>

            {aperto && (
              <div style={clienteDettagli}>
                <div>
                  <strong>Indirizzo:</strong> {c.indirizzo || "-"}
                </div>

                <div>
                  <strong>P.IVA:</strong> {c.piva || "-"}
                </div>

                <div style={buttonRow}>
                  <button onClick={() => modificaCliente(c)} style={editBtn}>
                    ✏️ Modifica cliente
                  </button>

                  <button
                    onClick={() => eliminaCliente(c.id)}
                    style={deleteBtn}
                  >
                    🗑️ Elimina cliente
                  </button>
                </div>

                <div style={cantieriBox}>
                  <strong>🏗️ Cantieri</strong>

                  {(cantieri[c.id] || []).length === 0 && (
                    <p>Nessun cantiere inserito.</p>
                  )}

                  {(cantieri[c.id] || []).map((can) => (
                    <div key={can.id} style={cantiereCard}>
                      <div>
                        <strong>{can.nome}</strong>
                      </div>

                      <small>
                        <strong>Telefono:</strong> {can.telefono || "-"}
                      </small>
                      <br />

                      <small>
                        <strong>Mail bollettini:</strong> {can.email || "-"}
                      </small>

                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => eliminaCantiere(can)}
                          style={deleteCantiereBtn}
                        >
                          🗑️ Elimina solo cantiere
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const page = {
  padding: 20,
}

const searchInput = {
  width: "100%",
  marginBottom: 15,
  padding: 10,
  boxSizing: "border-box",
}

const formBox = {
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: 15,
  marginBottom: 20,
  background: "#f8f8f8",
}

const input = {
  width: "100%",
  padding: 10,
  marginBottom: 8,
  boxSizing: "border-box",
}

const cantieriFormBox = {
  marginTop: 15,
  padding: 12,
  border: "1px dashed #999",
  borderRadius: 8,
  background: "#fff",
}

const cantiereFormCard = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 10,
  marginBottom: 12,
  background: "#fafafa",
}

const buttonRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
}

const saveBtn = {
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: "bold",
}

const cancelBtn = {
  padding: "8px 12px",
  cursor: "pointer",
}

const editBtn = {
  padding: "7px 10px",
  cursor: "pointer",
}

const deleteBtn = {
  padding: "7px 10px",
  cursor: "pointer",
  background: "#ffe0e0",
  border: "1px solid #cc0000",
  borderRadius: 5,
}

const deleteCantiereBtn = {
  padding: "6px 10px",
  cursor: "pointer",
  background: "#fff0f0",
  border: "1px solid #cc0000",
  borderRadius: 5,
}

const addBtn = {
  padding: "8px 12px",
  cursor: "pointer",
  width: "100%",
  marginTop: 5,
}

const clienteCard = {
  border: "1px solid #ccc",
  marginTop: 10,
  borderRadius: 8,
  background: "white",
  overflow: "hidden",
}

const clienteHeader = {
  padding: 14,
  background: "#f1f1f1",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
}

const clienteDettagli = {
  padding: 12,
}

const cantieriBox = {
  marginTop: 15,
  paddingTop: 10,
  borderTop: "1px solid #ddd",
}

const cantiereCard = {
  borderBottom: "1px solid #eee",
  padding: "8px 0",
}