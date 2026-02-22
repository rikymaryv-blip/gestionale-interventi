import { useState, useEffect, useRef } from "react"
import {
  cercaPreferiti,
  cercaListino
} from "../services/interventiService"

export default function MaterialeSelector({ onSelect }) {

  const [testo, setTesto] = useState("")
  const [risultati, setRisultati] = useState([])
  const [indiceAttivo, setIndiceAttivo] = useState(-1)

  const listRef = useRef(null)

  // 🔥 DEBUG + RICERCA SEMPLIFICATA
  useEffect(() => {

    async function ricerca() {

      console.log("TESTO DIGITATO:", testo)

      if (!testo || testo.length < 2) {
        setRisultati([])
        return
      }

      // 1️⃣ PREFERITI
      const { data: pref, error: prefError } = await cercaPreferiti(testo)
      console.log("RISULTATI PREFERITI:", pref, prefError)

      if (pref && pref.length > 0) {
        setRisultati(pref)
        return
      }

      // 2️⃣ LISTINO
      const { data: list, error: listError } = await cercaListino(testo)
      console.log("RISULTATI LISTINO:", list, listError)

      setRisultati(list || [])
    }

    ricerca()
    setIndiceAttivo(-1)

  }, [testo])

  function selezionaArticolo(articolo) {
    console.log("SELEZIONATO:", articolo)

    if (onSelect) onSelect(articolo)

    setTesto("")
    setRisultati([])
    setIndiceAttivo(-1)
  }

  function handleKeyDown(e) {
    if (!risultati.length) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setIndiceAttivo(prev =>
        prev < risultati.length - 1 ? prev + 1 : prev
      )
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      setIndiceAttivo(prev =>
        prev > 0 ? prev - 1 : prev
      )
    }

    if (e.key === "Enter") {
      e.preventDefault()
      if (indiceAttivo >= 0) {
        selezionaArticolo(risultati[indiceAttivo])
      }
    }
  }

  useEffect(() => {
    if (listRef.current && indiceAttivo >= 0) {
      const element = listRef.current.children[indiceAttivo]
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [indiceAttivo])

  return (
    <div style={{ position: "relative", width: "500px" }}>

      <input
        type="text"
        placeholder="Cerca materiale..."
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          padding: "8px",
          fontSize: "14px"
        }}
      />

      {risultati.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            background: "white",
            border: "1px solid #ccc",
            width: "100%",
            maxHeight: "400px",
            overflowY: "auto",
            zIndex: 1000
          }}
        >
          {risultati.map((r, index) => (
            <div
              key={r.id}
              onClick={() => selezionaArticolo(r)}
              style={{
                padding: "8px",
                cursor: "pointer",
                background:
                  index === indiceAttivo
                    ? "#e6f0ff"
                    : "white",
                borderBottom: "1px solid #eee"
              }}
            >
              <div>
                <strong>{r.codice}</strong>
              </div>
              <div style={{
                fontSize: "12px",
                color: "#555"
              }}>
                {r.descrizione}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}