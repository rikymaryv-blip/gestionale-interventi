import { useEffect, useState } from "react"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"

export default function ArchivioInterventiPage() {

  const [interventi, setInterventi] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {

    const { data } = await supabase
      .from("interventi")
      .select(`
        id,
        data,
        descrizione,
        clienti(nome),
        cantieri(nome)
      `)
      .not("fattura_id", "is", null) // 🔥 SOLO ARCHIVIATI

    setInterventi(data || [])
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 Archivio Interventi</h2>

      {interventi.map(i => (
        <div key={i.id} style={{
          border: "1px solid #ccc",
          marginTop: 10,
          padding: 10
        }}>
          📅 {dayjs(i.data).format("DD/MM/YYYY")} <br />
          👤 {i.clienti?.nome} <br />
          🏗️ {i.cantieri?.nome} <br />
          📝 {i.descrizione}
        </div>
      ))}
    </div>
  )
}