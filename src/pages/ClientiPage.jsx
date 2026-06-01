import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import { useNavigate } from "react-router-dom"

dayjs.extend(utc)

const CODICE_ADMIN = "1234"

const cantiereVuoto = {
  nome: "",
  telefono: "",
  email: "",
}

export default function ClientiPage() {
  const navigate = useNavigate()

  const [clienti, setClienti] = useState([])
  const [cantieri, setCantieri] = useState({})
  const [search, setSearch] = useState("")
  const [clienteAperto, setClienteAperto] = useState(null)
  const [loading, setLoading] = useState(false)

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
    setLoading(true)

    const { data, error } = await supabase
      .from("clienti")
      .select("*")
      .eq("attivo", true)
      .order("nome")

    if (error) {
      setLoading(false)
      alert("Errore clienti")
      return
    }

    setClienti(data || [])

    const { data: can, error: errorCantieri } = await supabase
      .from("cantieri")
      .select("*")
      .order("nome")

    setLoading(false)

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

    setTimeout(() => {
      document.getElementById("campo-nome")?.focus()
    }, 100)
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
    if (!form.nome.trim()) {
      alert("Nome cliente obbligatorio")
      return
    }

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

    alert("✅ Cliente salvato")
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
    setClienteAperto(cliente.id)

    setTimeout(() => {
      const el = document.getElementById("campo-nome")
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.focus()
        el.select()
      }
    }, 100)
  }

  function apriChiudiCliente(id) {
    setClienteAperto((prev) => (prev === id ? null : id))
  }

  const clientiFiltrati = clienti.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={page}>
      <div style={topBar}>
        <h2 style={{ margin: 0 }}>👥 Anagrafica clienti</h2>

        <div style={topButtons}>
          <button onClick={() => navigate("/interventi")} style={lightBtn}>
            ↩️ Interventi
          </button>

          <button onClick={loadClienti} style={lightBtn}>
            🔄 Aggiorna
          </button>
        </div>
      </div>

      <div style={layout}>
        <div style={leftColumn}>
          <div style={searchBox}>
            <input
              placeholder="🔍 Cerca cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={searchInput}
              autoFocus
            />

            <div style={countLine}>
              {loading
                ? "Caricamento..."
                : `${clientiFiltrati.length} clienti trovati`}
            </div>
          </div>

          {clientiFiltrati.map((c) => {
            const aperto = clienteAperto === c.id
            const listaCantieri = cantieri[c.id] || []

            return (
              <div key={c.id} style={clienteCard}>
                <div style={clienteHeader}>
                  <div
                    onClick={() => apriChiudiCliente(c.id)}
                    style={{ flex: 1, cursor: "pointer" }}
                  >
                    <strong>{c.nome}</strong>
                    <div style={smallText}>
                      🏗️ {listaCantieri.length} cantieri
                      {c.piva ? ` | P.IVA ${c.piva}` : ""}
                    </div>
                  </div>

                  <div style={cardActions}>
                    <button onClick={() => modificaCliente(c)} style={miniBtn}>
                      ✏️
                    </button>

                    <button onClick={() => apriChiudiCliente(c.id)} style={miniBtn}>
                      {aperto ? "▲" : "▼"}
                    </button>
                  </div>
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

                      {listaCantieri.length === 0 && (
                        <p>Nessun cantiere inserito.</p>
                      )}

                      {listaCantieri.map((can) => (
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

        <div style={rightColumn}>
          <h3 style={{ marginTop: 0 }}>
            {form.id ? "✏️ Modifica cliente" : "➕ Nuovo cliente"}
          </h3>

          {form.id && (
            <div style={editNotice}>
              Stai modificando: <strong>{form.nome}</strong>
            </div>
          )}

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
            <div style={cantieriTitle}>
              <strong>Cantieri da aggiungere</strong>

              <button onClick={aggiungiRigaCantiere} style={miniAddBtn}>
                ➕
              </button>
            </div>

            {cantieriForm.map((cantiere, index) => (
              <div key={index} style={cantiereFormCard}>
                <div style={cantiereFormHeader}>
                  <strong>Cantiere {index + 1}</strong>

                  <button
                    onClick={() => rimuoviRigaCantiere(index)}
                    style={miniDangerBtn}
                  >
                    ❌
                  </button>
                </div>

                <input
                  placeholder="Nome cantiere"
                  value={cantiere.nome}
                  onChange={(e) =>
                    aggiornaCantiereForm(index, "nome", e.target.value)
                  }
                  style={input}
                />

                <input
                  placeholder="Telefono"
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
              </div>
            ))}
          </div>

          <div style={sideActions}>
            <button onClick={salvaCliente} style={saveBtn}>
              💾 Salva cliente
            </button>

            <button onClick={resetForm} style={cancelBtn}>
              🧹 Nuovo / pulisci
            </button>

            <button onClick={() => navigate("/interventi")} style={lightBtnFull}>
              ↩️ Torna a interventi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const page = {
  padding: 12,
  maxWidth: 1600,
  margin: "0 auto",
  boxSizing: "border-box",
}

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
  flexWrap: "wrap",
}

const topButtons = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
}

const layout = {
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: 14,
  alignItems: "start",
}

const leftColumn = {
  minWidth: 0,
}

const rightColumn = {
  position: "sticky",
  top: 10,
  background: "#fff",
  border: "2px solid #1976d2",
  borderRadius: 12,
  padding: 12,
}

const searchBox = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 10,
  marginBottom: 10,
}

const searchInput = {
  width: "100%",
  padding: 11,
  boxSizing: "border-box",
  border: "1px solid #ccc",
  borderRadius: 8,
  fontSize: 16,
}

const countLine = {
  marginTop: 6,
  fontSize: 13,
  color: "#555",
  fontWeight: "bold",
}

const input = {
  width: "100%",
  padding: 10,
  marginBottom: 8,
  boxSizing: "border-box",
  borderRadius: 7,
  border: "1px solid #ccc",
}

const clienteCard = {
  border: "1px solid #ccc",
  marginTop: 8,
  borderRadius: 9,
  background: "white",
  overflow: "hidden",
}

const clienteHeader = {
  padding: 12,
  background: "#f6f6f6",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
}

const smallText = {
  fontSize: 13,
  color: "#555",
  marginTop: 3,
}

const cardActions = {
  display: "flex",
  gap: 6,
}

const miniBtn = {
  padding: "7px 9px",
  borderRadius: 6,
  border: "1px solid #ccc",
  cursor: "pointer",
}

const clienteDettagli = {
  padding: 12,
}

const buttonRow = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 10,
}

const editBtn = {
  padding: "8px 10px",
  cursor: "pointer",
  borderRadius: 6,
  border: "1px solid #ccc",
}

const deleteBtn = {
  padding: "8px 10px",
  cursor: "pointer",
  background: "#ffe0e0",
  border: "1px solid #cc0000",
  borderRadius: 6,
}

const cantieriBox = {
  marginTop: 12,
  paddingTop: 10,
  borderTop: "1px solid #ddd",
}

const cantiereCard = {
  borderBottom: "1px solid #eee",
  padding: "8px 0",
}

const deleteCantiereBtn = {
  padding: "6px 10px",
  cursor: "pointer",
  background: "#fff0f0",
  border: "1px solid #cc0000",
  borderRadius: 5,
}

const editNotice = {
  background: "#fff3cd",
  border: "1px solid #ffeeba",
  color: "#856404",
  padding: 8,
  borderRadius: 8,
  marginBottom: 10,
}

const cantieriFormBox = {
  marginTop: 10,
  padding: 10,
  border: "1px dashed #999",
  borderRadius: 8,
  background: "#fafafa",
}

const cantieriTitle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
}

const cantiereFormCard = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 8,
  marginBottom: 10,
  background: "#fff",
}

const cantiereFormHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 6,
}

const sideActions = {
  marginTop: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const saveBtn = {
  background: "#198754",
  color: "white",
  border: "none",
  padding: "12px 14px",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
}

const cancelBtn = {
  background: "#f5f5f5",
  color: "#111",
  border: "1px solid #ccc",
  padding: "12px 14px",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
}

const lightBtn = {
  background: "#f5f5f5",
  color: "#111",
  border: "1px solid #ccc",
  padding: "9px 12px",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
}

const lightBtnFull = {
  ...lightBtn,
  width: "100%",
}

const miniAddBtn = {
  background: "#198754",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
}

const miniDangerBtn = {
  background: "#ffe0e0",
  border: "1px solid #cc0000",
  padding: "5px 8px",
  borderRadius: 6,
  cursor: "pointer",
}
