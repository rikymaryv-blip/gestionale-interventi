import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function OperatoriPage() {

  const [operatori, setOperatori] = useState([])
  const [nuovo, setNuovo] = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from("operatori")
      .select("*")
      .order("nome")

    setOperatori(data || [])
  }

  async function aggiungi() {
    if (!nuovo) {
      alert("Inserisci nome")
      return
    }

    await supabase
      .from("operatori")
      .insert([{ nome: nuovo }])

    setNuovo("")
    load()
  }

  async function elimina(id) {
    if (!confirm("Eliminare operatore?")) return

    await supabase
      .from("operatori")
      .delete()
      .eq("id", id)

    load()
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>👷 Operatori</h2>

      <input
        placeholder="Nuovo operatore"
        value={nuovo}
        onChange={(e) => setNuovo(e.target.value)}
      />

      <button onClick={aggiungi}>➕ Aggiungi</button>

      <div style={{ marginTop: 20 }}>
        {operatori.map(o => (
          <div key={o.id} style={{ marginBottom: 5 }}>
            {o.nome}
            <button onClick={() => elimina(o.id)}>❌</button>
          </div>
        ))}
      </div>
    </div>
  )
}