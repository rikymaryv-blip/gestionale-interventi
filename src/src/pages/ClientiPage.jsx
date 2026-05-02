import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function ClientiPage() {
  const [clienti, setClienti] = useState([])
  const [form, setForm] = useState({
    nome: "",
    telefono: "",
    email: "",
    indirizzo: "",
    piva: ""
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    loadClienti()
  }, [])

  async function loadClienti() {
    const { data, error } = await supabase
      .from("clienti")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      console.error("Errore caricamento clienti:", error)
      return
    }

    setClienti(data || [])
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.nome.trim()) {
      alert("Il nome cliente è obbligatorio")
      return
    }

    let response

    if (editingId) {
      response = await supabase
        .from("clienti")
        .update(form)
        .eq("id", editingId)
    } else {
      response = await supabase
        .from("clienti")
        .insert([form])
    }

    if (response.error) {
      console.error(response.error)
      alert("Errore durante il salvataggio")
      return
    }

    // reset form
    setForm({
      nome: "",
      telefono: "",
      email: "",
      indirizzo: "",
      piva: ""
    })

    setEditingId(null)

    // ricarica lista
    loadClienti()
  }

  function handleEdit(cliente) {
    setForm({
      nome: cliente.nome || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      indirizzo: cliente.indirizzo || "",
      piva: cliente.piva || ""
    })
    setEditingId(cliente.id)
  }

  async function handleDelete(id) {
    const conferma = window.confirm("Vuoi eliminare questo cliente?")
    if (!conferma) return

    const { error } = await supabase
      .from("clienti")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Impossibile eliminare: cliente collegato a interventi.")
      console.error(error)
      return
    }

    loadClienti()
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h2>Anagrafica Clienti</h2>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "10px",
          marginBottom: "30px"
        }}
      >
        <input name="nome" placeholder="Nome Cliente" value={form.nome} onChange={handleChange} />
        <input name="telefono" placeholder="Telefono" value={form.telefono} onChange={handleChange} />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
        <input name="indirizzo" placeholder="Indirizzo" value={form.indirizzo} onChange={handleChange} />
        <input name="piva" placeholder="P.IVA / CF" value={form.piva} onChange={handleChange} />

        <button
          type="submit"
          style={{
            gridColumn: "span 5",
            padding: "10px",
            background: "#2d89ef",
            color: "white",
            border: "none",
            cursor: "pointer"
          }}
        >
          {editingId ? "Aggiorna Cliente" : "Salva Cliente"}
        </button>
      </form>

      {/* TABELLA */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px"
          }}
        >
          <thead style={{ backgroundColor: "#f5f5f5" }}>
            <tr>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>Telefono</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Indirizzo</th>
              <th style={thStyle}>P.IVA</th>
              <th style={thStyle}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clienti.map(cliente => (
              <tr key={cliente.id}>
                <td style={tdStyle}>{cliente.nome}</td>
                <td style={tdStyle}>{cliente.telefono}</td>
                <td style={tdStyle}>{cliente.email}</td>
                <td style={tdStyle}>{cliente.indirizzo}</td>
                <td style={tdStyle}>{cliente.piva}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleEdit(cliente)} style={btnStyle}>
                    Modifica
                  </button>
                  <button onClick={() => handleDelete(cliente.id)} style={{ ...btnStyle, background: "#d9534f" }}>
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle = {
  padding: "10px",
  border: "1px solid #ddd",
  textAlign: "left"
}

const tdStyle = {
  padding: "10px",
  border: "1px solid #ddd"
}

const btnStyle = {
  marginRight: "6px",
  padding: "5px 8px",
  background: "#6c757d",
  color: "white",
  border: "none",
  cursor: "pointer"
}