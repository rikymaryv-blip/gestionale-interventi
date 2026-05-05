import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function BolleUploadPage() {

  const [searchParams] = useSearchParams()
  const interventoIdDaUrl = searchParams.get("intervento_id")

  const [bolle, setBolle] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)

  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")
  const [interventoCorrente, setInterventoCorrente] = useState(null)

  const [filtroOperatore, setFiltroOperatore] = useState("")

  // 🔥 DEFAULT DATE (ULTIMI 2 GIORNI)
  const oggi = new Date()
  const dueGiorniFa = new Date()
  dueGiorniFa.setDate(oggi.getDate() - 2)

  function formatDate(d) {
    return d.toISOString().split("T")[0]
  }

  const [dataDa, setDataDa] = useState(formatDate(dueGiorniFa))
  const [dataA, setDataA] = useState(formatDate(oggi))

  const [ricercaCarrello, setRicercaCarrello] = useState("")

  useEffect(() => {
    caricaBolle()
    caricaInterventi()
  }, [])

  useEffect(() => {
    if (interventoIdDaUrl) {
      setInterventoSelezionato(interventoIdDaUrl)
    }
  }, [interventoIdDaUrl])

  async function caricaInterventi() {
    const { data } = await supabase
      .from("interventi")
      .select("id, data, descrizione, clienti(nome)")
      .order("data", { ascending: false })

    setInterventi(data || [])

    if (interventoIdDaUrl) {
      const trovato = (data || []).find(i => String(i.id) === String(interventoIdDaUrl))
      setInterventoCorrente(trovato || null)
      setInterventoSelezionato(interventoIdDaUrl)
    }
  }

  async function caricaBolle() {
    const { data } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .order("id", { ascending: false })

    setBolle(data || [])
  }

  async function apriBolla(b) {
    setSelected(b)

    if (!interventoIdDaUrl) {
      setInterventoSelezionato("")
    } else {
      setInterventoSelezionato(interventoIdDaUrl)
    }

    const { data } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", b.id)

    setRighe(data || [])
  }

  function convertiData(d) {
    if (!d) return null
    if (d.includes("/")) {
      const [gg, mm, aaaa] = d.split("/")
      return `${aaaa}-${mm.padStart(2, "0")}-${gg.padStart(2, "0")}`
    }
    return d
  }

  async function handleFile(e) {

    const file = e.target.files[0]
    if (!file) return

    const text = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.readAsText(file, "ISO-8859-1")
    })

    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim())
    const sep = lines[0].includes(";") ? ";" : ","
    const split = (line) => line.split(sep).map(v => v.trim())

    const grouped = {}

    for (let i = 1; i < lines.length; i++) {

      const v = split(lines[i])

      const ordine = (v[3] || "").trim()
      let ddt = (v[12] || "").trim()

      const data = convertiData(v[0])
      const creatore = v[9] || ""
      const nomeCarrello = v[4] || ""

      if (!ordine) continue
      if (!ddt) ddt = "NO_DDT_" + ordine

      const key = ordine + "_" + ddt

      if (!grouped[key]) {
        grouped[key] = {
          numero_ordine: ordine,
          numero_ddt: ddt,
          data,
          creatore,
          nome_carrello: nomeCarrello,
          righe: []
        }
      }

      grouped[key].righe.push({
        codice: v[14] || "",
        descrizione: v[13] || "",
        quantita: Number(v[16]) || 0
      })
    }

    let salvate = 0

    for (const b of Object.values(grouped)) {

      const { data: saved, error } = await supabase
        .from("bolle_acquisto")
        .insert([{
          numero_ordine: b.numero_ordine,
          numero_ddt: b.numero_ddt,
          creatore_carrello: b.creatore || null,
          nome_carrello: b.nome_carrello || null,
          usata: false,
          data: b.data || null
        }])
        .select()
        .single()

      if (error) continue

      await supabase
        .from("bolle_righe")
        .insert(
          b.righe.map(r => ({
            ...r,
            bolla_id: saved.id
          }))
        )

      salvate++
    }

    alert("Caricate " + salvate + " bolle")
    caricaBolle()
  }

  // 🔒 IMPORT
  async function importaInIntervento() {

    const interventoFinale = interventoIdDaUrl || interventoSelezionato

    if (selected?.usata) {
      alert("⚠️ Questa bolla è già stata importata")
      return
    }

    if (!interventoFinale) {
      alert("Seleziona intervento")
      return
    }

    for (let r of righe) {
      await supabase.from("materiali_bollettino").insert({
        intervento_id: interventoFinale,
        codice: r.codice,
        descrizione: r.descrizione,
        quantita: r.quantita
      })
    }

    await supabase
      .from("bolle_acquisto")
      .update({ usata: true })
      .eq("id", selected.id)

    alert("IMPORT OK")

    setSelected(null)
    setRighe([])
    caricaBolle()
  }

  // 🔥 TORNA INDIETRO
  async function annullaImportazione() {
    await supabase
      .from("bolle_acquisto")
      .update({ usata: false })
      .eq("id", selected.id)

    alert("Bolla riattivata")
    caricaBolle()
  }

  const operatori = [...new Set(bolle.map(b => b.creatore_carrello).filter(Boolean))]
  const carrelli = [...new Set(bolle.map(b => b.nome_carrello).filter(Boolean))]

  return (
    <div style={{ padding: 20 }}>

      <h2>📦 Archivio Bolle</h2>

      {interventoIdDaUrl && (
        <div style={{
          background: "#e7f1ff",
          border: "1px solid #9ec5fe",
          color: "#084298",
          padding: 10,
          borderRadius: 6,
          marginBottom: 12
        }}>
          <b>Importazione diretta attiva</b>
          <div>
            Stai importando materiali nell’intervento:
            {" "}
            <b>
              #{interventoIdDaUrl}
              {interventoCorrente?.data ? ` - ${interventoCorrente.data}` : ""}
              {interventoCorrente?.clienti?.nome ? ` - ${interventoCorrente.clienti.nome}` : ""}
            </b>
          </div>
          {interventoCorrente?.descrizione && (
            <div>
              Descrizione: {interventoCorrente.descrizione}
            </div>
          )}
        </div>
      )}

      <input type="file" accept=".csv" onChange={handleFile} />

      {/* FILTRI */}
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>

        <select value={filtroOperatore} onChange={(e) => setFiltroOperatore(e.target.value)}>
          <option value="">Tutti operatori</option>
          {operatori.map(op => <option key={op}>{op}</option>)}
        </select>

        <span>Da:</span>
        <input type="date" value={dataDa} onChange={(e) => setDataDa(e.target.value)} />

        <span>A:</span>
        <input type="date" value={dataA} onChange={(e) => setDataA(e.target.value)} />

        <div style={{ position: "relative" }}>
          <input
            placeholder="🔍 Cerca carrello..."
            value={ricercaCarrello}
            onChange={(e) => setRicercaCarrello(e.target.value)}
          />

          {ricercaCarrello && (
            <div style={{ position: "absolute", background: "white", border: "1px solid #ccc" }}>
              {carrelli
                .filter(c => c.toLowerCase().includes(ricercaCarrello.toLowerCase()))
                .slice(0, 10)
                .map((c, i) => (
                  <div key={i} onClick={() => setRicercaCarrello(c)}>
                    {c}
                  </div>
                ))}
            </div>
          )}
        </div>

        <button onClick={() => {
          setFiltroOperatore("")
          setDataDa("")
          setDataA("")
          setRicercaCarrello("")
        }}>
          Reset
        </button>

      </div>

      <hr />

      {bolle
        .filter(b => {
          const m1 = !filtroOperatore || b.creatore_carrello === filtroOperatore
          const m2 = (!dataDa || b.data >= dataDa) && (!dataA || b.data <= dataA)
          const m3 = !ricercaCarrello || (b.nome_carrello || "").toLowerCase().includes(ricercaCarrello.toLowerCase())
          return m1 && m2 && m3
        })
        .map(b => (
          <div
            key={b.id}
            onClick={() => apriBolla(b)}
            style={{
              border: b.usata ? "2px solid green" : "1px solid #ccc",
              background: b.usata ? "#e8f5e9" : "white",
              padding: 10,
              marginTop: 5,
              cursor: "pointer"
            }}
          >
            <b>{b.numero_ordine}</b> | DDT: {b.numero_ddt}
            <div>📅 {b.data}</div>
            <div>👤 {b.creatore_carrello}</div>
            <div>📦 {b.nome_carrello}</div>
            {b.usata && <span>✅ USATA</span>}
          </div>
        ))}

      {selected && (
        <div style={{ marginTop: 20 }}>
          <h3>Dettaglio</h3>

          <button onClick={() => setSelected(null)}>❌ Chiudi</button>

          {interventoIdDaUrl ? (
            <div style={{
              marginTop: 10,
              marginBottom: 10,
              background: "#f8f9fa",
              border: "1px solid #ddd",
              padding: 10,
              borderRadius: 6
            }}>
              Materiali destinati all’intervento:
              {" "}
              <b>
                #{interventoIdDaUrl}
                {interventoCorrente?.clienti?.nome ? ` - ${interventoCorrente.clienti.nome}` : ""}
              </b>
            </div>
          ) : (
            <select value={interventoSelezionato} onChange={(e) => setInterventoSelezionato(e.target.value)}>
              <option value="">Seleziona intervento</option>
              {interventi.map(i => (
                <option key={i.id} value={i.id}>
                  {i.data} - {i.clienti?.nome}
                </option>
              ))}
            </select>
          )}

          <button onClick={importaInIntervento} disabled={selected?.usata}>
            🚀 Importa
          </button>

          {selected?.usata && (
            <button onClick={annullaImportazione}>
              ↩ Torna indietro
            </button>
          )}

          {righe.map((r, i) => (
            <div key={i}>
              {r.codice} - {r.descrizione} ({r.quantita})
            </div>
          ))}
        </div>
      )}

    </div>
  )
}