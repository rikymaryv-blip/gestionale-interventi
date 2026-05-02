import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function BolleUploadPage() {

  const [bolle, setBolle] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState("")

  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")

  const [file, setFile] = useState(null)
  const [loadingFile, setLoadingFile] = useState(false)

  useEffect(() => {
    caricaBolle()
    caricaInterventi()
  }, [])

  async function caricaInterventi() {
    const { data } = await supabase
      .from("interventi")
      .select("id, data, clienti(nome)")
      .order("data", { ascending: false })

    setInterventi(data || [])
  }

  async function caricaBolle() {

    const oggi = new Date()
    const treGiorniFa = new Date()
    treGiorniFa.setDate(oggi.getDate() - 3)

    const { data } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .gte("data", treGiorniFa.toISOString())
      .eq("usata", false)
      .order("data", { ascending: false })

    setBolle(data || [])
  }

  async function cercaBolle(q) {

    setSearch(q)

    if (!q) return caricaBolle()

    const { data } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .or(`
        numero_ordine.ilike.%${q}%,
        numero_ddt.ilike.%${q}%,
        nome_carrello.ilike.%${q}%
      `)

    setBolle(data || [])
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

  async function importaInIntervento() {

    if (!interventoSelezionato) {
      alert("Seleziona un intervento")
      return
    }

    const BATCH = 100

    for (let i = 0; i < righe.length; i += BATCH) {

      const chunk = righe.slice(i, i + BATCH)

      await supabase.from("materiali_bollettino").insert(
        chunk.map(r => ({
          intervento_id: interventoSelezionato,
          codice: r.codice,
          descrizione: r.descrizione,
          quantita: r.quantita
        }))
      )

      await new Promise(res => setTimeout(res, 10))
    }

    await supabase
      .from("bolle_acquisto")
      .update({ usata: true })
      .eq("id", selected.id)

    alert("✅ Materiali importati nel bollettino")

    setSelected(null)
    setRighe([])
    caricaBolle()
  }

  // 🔥 IMPORT FILE
  async function handleFile(e) {

    const file = e.target.files[0]
    if (!file) return

    setLoadingFile(true)

    try {

      const text = await file.text()
      const lines = text.split("\n").filter(l => l.trim())

      const sep = lines[0].includes(";") ? ";" : ","
      const headers = lines[0].split(sep)

      const iOrdine = headers.findIndex(h => h.includes("ordine"))
      const iDDT = headers.findIndex(h => h.includes("DDT"))
      const iData = headers.findIndex(h => h.includes("Data"))
      const iCarrello = headers.findIndex(h => h.includes("carrello"))

      const iCod = headers.findIndex(h => h.includes("Cod"))
      const iDesc = headers.findIndex(h => h.includes("Descr"))
      const iQta = headers.findIndex(h => h.includes("Quant"))

      const grouped = {}

      lines.slice(1).forEach(line => {

        const v = line.split(sep)
        const ordine = v[iOrdine]

        if (!ordine) return

        if (!grouped[ordine]) {
          grouped[ordine] = {
            data: v[iData],
            numero_ordine: ordine,
            numero_ddt: v[iDDT],
            nome_carrello: v[iCarrello],
            usata: false,
            righe: []
          }
        }

        grouped[ordine].righe.push({
          codice: v[iCod],
          descrizione: v[iDesc],
          quantita: Number(v[iQta] || 0)
        })
      })

      const bolleArray = Object.values(grouped)

      for (const b of bolleArray) {

        const { data: saved } = await supabase
          .from("bolle_acquisto")
          .insert([{
            data: b.data,
            numero_ordine: b.numero_ordine,
            numero_ddt: b.numero_ddt,
            nome_carrello: b.nome_carrello,
            usata: false
          }])
          .select()
          .single()

        const righeInsert = b.righe.map(r => ({
          ...r,
          bolla_id: saved.id
        }))

        await supabase.from("bolle_righe").insert(righeInsert)
      }

      alert("✅ Bolle caricate")

      caricaBolle()

    } catch (err) {
      console.error(err)
      alert("Errore file")
    }

    setLoadingFile(false)
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>📦 Archivio Bolle</h2>

      {/* IMPORT */}
      <h3>📥 Importa carrello</h3>

      <input type="file" onChange={handleFile} />
      {loadingFile && <p>Caricamento file...</p>}

      <hr />

      {/* RICERCA */}
      <input
        placeholder="Cerca..."
        value={search}
        onChange={(e) => cercaBolle(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <br /><br />

      {/* LISTA */}
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
          <br />
          <small>{b.nome_carrello}</small>
        </div>
      ))}

      {/* DETTAGLIO */}
      {selected && (
        <div style={{ marginTop: 20 }}>

          <h3>Dettaglio Bolla</h3>

          <select
            value={interventoSelezionato}
            onChange={(e) => setInterventoSelezionato(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Seleziona intervento</option>

            {interventi.map(i => (
              <option key={i.id} value={i.id}>
                {i.data} - {i.clienti?.nome || "Senza cliente"}
              </option>
            ))}
          </select>

          <br /><br />

          <button onClick={importaInIntervento}>
            🚀 Porta in intervento
          </button>

          <br /><br />

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