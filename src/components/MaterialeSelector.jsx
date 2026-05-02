import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function MaterialeSelector({ onAdd }) {

  const [prod, setProd] = useState("")
  const [query, setQuery] = useState("")
  const [risultati, setRisultati] = useState([])

  // 🔥 ricerca automatica (FIX DEFINITIVO)
  useEffect(() => {

    const delay = setTimeout(async () => {

      const { data, error } = await supabase
        .rpc("search_materiali_advanced", {
          prod,
          q: query
        })

      if (error) {
        console.error("ERRORE:", error)
        return
      }

      setRisultati(data || [])

    }, 300) // debounce (non blocca)

    return () => clearTimeout(delay)

  }, [prod, query])

  return (
    <div>

      {/* 🔵 CAMPO 1 */}
      <input
        placeholder="Produttore / codice (es: VIW)"
        value={prod}
        onChange={e => setProd(e.target.value)}
        style={{ width: "100%", marginBottom: 5 }}
      />

      {/* 🔵 CAMPO 2 */}
      <input
        placeholder="Descrizione (es: presa bianca)"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: "100%", marginBottom: 5 }}
      />

      {/* 🔵 RISULTATI */}
      <div style={{
        maxHeight: 250,
        overflow: "auto",
        border: "1px solid #ddd"
      }}>
        {risultati.map((m) => (
          <div
            key={m.codice}
            onClick={() => {
              onAdd({
                codice: m.codice,
                descrizione: m.descrizione,
                quantita: 1
              })

              setProd("")
              setQuery("")
            }}
            style={{
              padding: 6,
              borderBottom: "1px solid #eee",
              cursor: "pointer"
            }}
          >
            <strong>{m.codice}</strong> — {m.descrizione}
          </div>
        ))}
      </div>

    </div>
  )
}