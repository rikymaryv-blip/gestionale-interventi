import { useState } from "react"
import { createCliente } from "../services/interventiService"

function ClienteForm({ onCreated }) {
  const [nome, setNome] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!nome.trim()) {
      alert("Inserisci nome cliente")
      return
    }

    setLoading(true)

    const { data, error } = await createCliente(nome.trim())

    setLoading(false)

    if (error) {
      alert("Errore creazione cliente")
      return
    }

    setNome("")

    if (onCreated) onCreated()
  }

  return (
    <div style={{ marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Nuovo cliente"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        style={{ marginRight: "10px" }}
      />

      <button onClick={handleCreate} disabled={loading}>
        {loading ? "Salvataggio..." : "Aggiungi Cliente"}
      </button>
    </div>
  )
}

export default ClienteForm