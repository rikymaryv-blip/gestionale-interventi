import { useState } from "react"
import { supabase } from "../supabaseClient"

export default function ListinoPage() {

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function importa() {

    if (!file) {
      alert("Seleziona file TXT Sonepar")
      return
    }

    setLoading(true)

    try {

      const text = await file.text()
      const righe = text.split("\n")

      const articoli = []
      const mappa = {}

      const STEP = 1000

      for (let i = 0; i < righe.length; i++) {

        const riga = righe[i]

        if (!riga || !riga.trim()) continue

        const descrizione = riga.substring(0, 60).trim()
        const codice = riga.substring(60, 80).trim()
        const unita = riga.substring(80, 83).trim()
        const prezzoRaw = riga.substring(100, 115).trim()

        const prezzo = parseInt(prezzoRaw || "0") / 100

        if (!codice || !descrizione) continue

        if (mappa[codice]) continue
        mappa[codice] = true

        articoli.push({
          codice,
          descrizione,
          prezzo,
          unita_misura: unita || "PZ",
          ean: "",
          attivo: true
        })

        // 🔥 ogni tot righe lascia respirare browser
        if (i % STEP === 0) {
          await new Promise(res => setTimeout(res, 5))
        }
      }

      if (articoli.length < 50) {
        alert("File non valido o posizioni errate")
        setLoading(false)
        return
      }

      console.log("ARTICOLI TROVATI:", articoli.length)

      const BATCH = 500

      for (let i = 0; i < articoli.length; i += BATCH) {

        const chunk = articoli.slice(i, i + BATCH)

        const { error } = await supabase
          .from("articoli_listino")
          .upsert(chunk, { onConflict: "codice" })

        if (error) {
          console.error(error)
          alert("Errore: " + error.message)
          setLoading(false)
          return
        }

        // 🔥 evita freeze durante insert
        await new Promise(res => setTimeout(res, 10))

        console.log("Caricati:", i)
      }

      alert("IMPORT COMPLETO ✔")

    } catch (err) {
      console.error(err)
      alert("Errore import")
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 LISTINO SONEPAR (TXT)</h2>

      <input
        type="file"
        accept=".txt"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={importa} disabled={loading}>
        {loading ? "Import..." : "🚀 Importa TXT"}
      </button>
    </div>
  )
}