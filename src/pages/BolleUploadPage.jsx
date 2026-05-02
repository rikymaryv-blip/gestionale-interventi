import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function BolleUploadPage() {

  const [bolle, setBolle] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    caricaBolle()
  }, [])

  async function caricaBolle() {
    const { data } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .order("data", { ascending: false })

    setBolle(data || [])
  }

  async function apriBolla(b) {
    setSelected(b)

    const { data } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", b.id)

    setRighe(data || [])
  }

  async function importaInIntervento() {

    const intervento_id = prompt("Inserisci ID intervento")
    if (!intervento_id) return

    const BATCH = 100

    for (let i = 0; i < righe.length; i += BATCH) {

      const chunk = righe.slice(i, i + BATCH)

      await supabase.from("materiali_intervento").insert(
        chunk.map(r => ({
          intervento_id: intervento_id,
          materiali_id: r.codice,
          quantita: r.quantita
        }))
      )

      await new Promise(res => setTimeout(res, 10))
    }

    alert("✅ Materiali importati!")
  }

  async function handleFile(e) {

    const file = e.target.files[0]
    if (!file) return

    setLoading(true)

    try {

      const text = await file.text()
      const lines = text.split("\n").filter(l => l.trim())

      const sep = lines[0].includes(";") ? ";" : ","

      const headers = lines[0]
        .split(sep)
        .map(h => h.replace(/\r/g, "").trim())

      const iOrdine = headers.findIndex(h => h.includes("N. ordine"))
      const iDDT = headers.findIndex(h => h.includes("N. DDT"))
      const iData = headers.findIndex(h => h.includes("Data creazione"))
      const iCarrello = headers.findIndex(h => h.includes("Nome carrello"))

      const iCod = headers.findIndex(h => h.includes("Cod. prod"))
      const iDesc = headers.findIndex(h => h.includes("Descrizione"))
      const iQta = headers.findIndex(h => h.includes("Quantità"))

      const rows = lines.slice(1).map(line => {

        const values = line.split(sep)

        values.forEach((v, i) => {
          if (v && v.includes("E+")) {
            values[i] = String(Number(v))
          }
        })

        return values
      })

      const grouped = {}

      rows.forEach(r => {

        const ordine = r[iOrdine]
        if (!ordine) return

        if (!grouped[ordine]) {
          grouped[ordine] = {
            data: parseDate(r[iData]),
            numero_ordine: String(ordine),
            numero_ddt: String(r[iDDT] || ""),
            nome_carrello: r[iCarrello] || "",
            righe: []
          }
        }

        grouped[ordine].righe.push({
          codice: r[iCod] || "",
          descrizione: r[iDesc] || "",
          quantita: Number(String(r[iQta]).replace(",", ".")) || 0
        })
      })

      const bolleArray = Object.values(grouped)

      let salvate = 0

      const BATCH = 10 // 🔥 numero bolle per blocco

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

        console.log("Progresso:", i)

        // 🔥 evita blocco browser
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