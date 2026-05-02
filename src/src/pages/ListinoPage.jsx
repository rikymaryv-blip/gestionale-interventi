import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"

export default function InterventiPage() {

  const [interventi, setInterventi] = useState([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    caricaInterventi()
  }, [])

  // 🔥 CARICA INTERVENTI
  async function caricaInterventi() {
    setLoading(true)

    const { data, error } = await supabase
      .from("interventi")
      .select(`
        *,
        clienti ( nome )
      `)
      .order("data", { ascending: false })

    if (error) {
      console.error("Errore caricamento:", error)
    } else {
      setInterventi(data || [])
    }

    setLoading(false)
  }

  // 🔍 CERCA
  async function cerca() {
    if (!query) return caricaInterventi()

    const { data } = await supabase
      .from("interventi")
      .select(`
        *,
        clienti ( nome )
      `)
      .or(`descrizione.ilike.%${query}%`)
      .limit(100)

    setInterventi(data || [])
  }

  // ❌ ELIMINA
  async function elimina(id) {
    if (!confirm("Sei sicuro di eliminare?")) return

    await supabase.from("interventi").delete().eq("id", id)

    caricaInterventi()
  }

  return (
    <div style={{ padding: "20px" }}>

      <h1>Interventi</h1>

      {/* 🔍 RICERCA */}
      <div style={{ marginBottom: "15px" }}>
        <input
          placeholder="Cerca intervento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={cerca} style={{ marginLeft: "5px" }}>
          Cerca
        </button>
      </div>

      {loading && <div>Caricamento...</div>}

      {/* 📋 LISTA */}
      <table border="1" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Descrizione</th>
            <th>Azioni</th>
          </tr>
        </thead>

        <tbody>
          {interventi.map((i) => (
            <tr key={i.id}>

              <td>
                {i.data
                  ? dayjs(i.data).format("DD/MM/YYYY")
                  : ""}
              </td>

              <td>{i.clienti?.nome}</td>

              <td>{i.descrizione}</td>

              <td>

                {/* 🔥 BOLLETTINO (FIX VERO) */}
                <button
                  onClick={() => navigate(`/bollettino/${i.id}`)}
                  style={{ marginRight: "5px" }}
                >
                  📄 Bollettino
                </button>

                {/* ELIMINA */}
                <button
                  onClick={() => elimina(i.id)}
                  style={{ marginRight: "5px" }}
                >
                  🗑️ Elimina
                </button>

              </td>

            </tr>
          ))}
        </tbody>
      </table>

    </div>
  )
}