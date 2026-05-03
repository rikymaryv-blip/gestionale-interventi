import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function BolleUploadPage() {

  const [bolle, setBolle] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")

  useEffect(() => {
    caricaBolle()
    caricaInterventi()
  }, [])

  async function caricaBolle() {
    const { data } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .order("data", { ascending: false })

    setBolle(data || [])
  }

  async function caricaInterventi() {
    const { data } = await supabase
      .from("interventi")
      .select("id, data, clienti(nome)")
      .order("data", { ascending: false })

    setInterventi(data || [])
  }

  async function apriBolla(b) {
    setSelected(b)
    setInterventoSelezionato("")

    const { data } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", b.id)

    setRighe(data || [])
  }

  // 🔥 IMPORT CORRETTO (TAB GIUSTA)
  async function importaInIntervento() {

    if (!interventoSelezionato) {
      alert("Seleziona intervento")
      return
    }

    const intervento_id = interventoSelezionato
    const BATCH = 100

    for (let i = 0; i < righe.length; i += BATCH) {

      const chunk = righe.slice(i, i + BATCH)

      await supabase.from("materiali_bollettino").insert(
        chunk.map(r => ({
          intervento_id: intervento_id,
          codice: r.codice,
          descrizione: r.descrizione,
          quantita: r.quantita
        }))
      )

      await new Promise(res => setTimeout(res, 10))
    }

    alert("✅ Materiali importati!")

    // opzionale: ricarica
    setSelected(null)
    setRighe([])
  }

  // 🔥 PARSER CSV SICURO
  function splitCSV(line, sep) {
    const result = []
    let current = ""
    let insideQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        insideQuotes = !insideQuotes
        continue
      }

      if (char === sep && !insideQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }

    result.push(current)
    return result
  }

  async function handleFile(e) {

    const file = e.target.files[0]
    if (!file) return

    setLoading(true)

    try {

      const text = await file.text()
      const lines = text.split("\n").filter(l => l.trim())

      const sep = lines[0].includes(";") ? ";" : ","

      const headers = splitCSV(lines[0], sep).map(h => h.trim())

      const iOrdine = headers.findIndex(h => h.toLowerCase().includes("ordine"))
      const iDDT = headers.findIndex(h => h.toLowerCase().includes("ddt"))
      const iData = headers.findIndex(h => h.toLowerCase().includes("data"))
      const iCarrello = headers.findIndex(h => h.toLowerCase().includes("carrello"))

      const iCod = headers.findIndex(h => h.toLowerCase().includes("cod"))
      const iDesc = headers.findIndex(h => h.toLowerCase().includes("descr"))
      const iQta = headers.findIndex(h => h.toLowerCase().includes("quant"))

      const grouped = {}

      for (let i = 1; i < lines.length; i++) {

        const values = splitCSV(lines[i], sep)

        const ordine = values[iOrdine]
        if (!ordine) continue

        if (!grouped[ordine]) {
          grouped[ordine] = {
            data: parseDate(values[iData]),
            numero_ordine: String(ordine),
            numero_ddt: String(values[iDDT] || ""),
            nome_carrello: values[iCarrello] || "",
            righe: []
          }
        }

        grouped[ordine].righe.push({
          codice: values[iCod] || "",
          descrizione: values[iDesc] || "",
          quantita: Number(String(values[iQta]).replace(",", ".")) || 0
        })
      }

      const bolleArray = Object.values(grouped)

      let salvate = 0
      const BATCH = 10

      for (let i = 0; i < bolleArray.length; i += BATCH) {

        const chunk = bolleArray.slice(i, i + BATCH)

        for (const b of chunk) {

          const { data: saved, error } = await supabase
            .from("bolle_acquisto")
            .insert([{
              data: b.data,
              numero_ordine: b.numero_ordine,
              numero_ddt: b.numero_ddt,
              nome_carrello: b.nome_carrello
            }])
            .select()
            .single()

          if (error) continue

          const righeInsert = b.righe.map(r => ({
            codice: r.codice,
            descrizione: r.descrizione,
            quantita: r.quantita,
            bolla_id: saved.id
          }))

          await supabase.from("bolle_righe").insert(righeInsert)

          salvate++
        }

        await new Promise(res => setTimeout(res, 20))
      }

      alert("✅ Salvate " + salvate + " bolle")

      caricaBolle()

    } catch (err) {
      console.error(err)
      alert("Errore file")
    }

    setLoading(false)
  }

  function parseDate(d) {
    if (!d) return null
    if (d.includes("/")) {
      const p = d.split("/")
      return `${p[2]}-${p[1]}-${p[0]}`
    }
    return null
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>📦 Archivio Bolle</h2>

      <input type="file" accept=".csv" onChange={handleFile} />
      {loading && <p>Caricamento...</p>}

      <hr />

      {bolle.map(b => (
        <div
          key={b.id}
          onClick={() => apriBolla(b)}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 5,
            cursor: "pointer"
          }}
        >
          <b>{b.numero_ordine}</b> | DDT: {b.numero_ddt}
        </div>
      ))}

      {selected && (
        <div style={{ marginTop: 20 }}>

          <h3>Dettaglio</h3>

          <select
            value={interventoSelezionato}
            onChange={(e) => setInterventoSelezionato(e.target.value)}
            style={{ marginBottom: 10 }}
          >
            <option value="">Seleziona intervento</option>

            {interventi.map(i => (
              <option key={i.id} value={i.id}>
                {i.data} - {i.clienti?.nome}
              </option>
            ))}
          </select>

          <br />

          <button onClick={importaInIntervento}>
            🚀 Porta in intervento
          </button>

          {righe.map((r, i) => (
            <div key={i}>
              {r.codice} — {r.descrizione} ({r.quantita})
            </div>
          ))}

        </div>
      )}

    </div>
  )
}