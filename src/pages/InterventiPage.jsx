<h1 style={{color: "red"}}>PAGINA TEST</h1>
import { useEffect, useState } from "react"
import {
  getInterventi,
  deleteIntervento
} from "../services/interventiService"

import InterventoForm from "../components/InterventoForm"
import InterventoList from "../components/InterventoList"
import ClienteForm from "../components/ClienteForm"

export default function InterventiPage() {
  const [interventi, setInterventi] = useState([])
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    loadInterventi()
  }, [])

  async function loadInterventi() {
    const { data } = await getInterventi()
    setInterventi(data || [])
  }

  async function handleDelete(id) {
    if (!window.confirm("Eliminare intervento?")) return

    await deleteIntervento(id)
    await loadInterventi()
  }

  return (
    <div style={{ padding: "30px" }}>
      <h1>Gestionale Interventi</h1>

      <ClienteForm />

      <InterventoForm
        editing={editing}
        onSaved={async () => {
          setEditing(null)
          await loadInterventi()
        }}
      />

      <InterventoList
        interventi={interventi}
        onDelete={handleDelete}
        onEdit={setEditing}
      />
    </div>
  )
}