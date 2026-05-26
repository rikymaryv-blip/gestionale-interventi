import { useState } from "react"
import { supabase } from "../supabaseClient"

export default function ListinoPage() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [totale, setTotale] = useState(0)
  const [caricati, setCaricati] = useState(0)

  function pulisci(v) {
    return String(v || "").trim()
  }

  function prezzoDaRaw(v) {
    const testo = String(v || "").trim()
    if (!testo) return 0

    const soloNumeri = testo.replace(/\D/g, "")
    const n = parseInt(soloNumeri || "0", 10)

    if (!n) return 0

    // File tipo 000000024840 = 24,840
    return n / 1000
  }

  function splitCSV(riga) {
    return riga.split(";").map((c) => c.trim())
  }

  function trovaEAN(campi) {
    return (
      campi.find((x) => /^\d{8,14}$/.test(pulisci(x))) ||
      ""
    )
  }

  function trovaCodice(campi, ean) {
    const candidati = campi
      .map((x) => pulisci(x))
      .filter((x) => x && x !== ean)

    return (
      candidati.find((x) => /^[A-Z0-9]{5,30}$/i.test(x) && /[A-Z]/i.test(x)) ||
      candidati[candidati.length - 1] ||
      ""
    )
  }

  function leggiRigaCSV(riga) {
    const c = splitCSV(riga)

    if (c.length < 3) return null

    let descrizione = pulisci(c[1])
    let prezzoLordo = prezzoDaRaw(c[2])
    let prezzoNetto = prezzoDaRaw(c[4])
    let unita = pulisci(c[5]) || "PZ"
    let produttore = pulisci(c[8] || c[13])
    let ean = pulisci(c[9])
    let codice = pulisci(c[10])

    // sicurezza se le colonne sono spostate
    if (!ean) ean = trovaEAN(c)
    if (!codice) codice = trovaCodice(c, ean)

    // se descrizione non è in colonna 1, cerco il testo più lungo
    if (!descrizione || descrizione.length < 4) {
      descrizione =
        c
          .map((x) => pulisci(x))
          .filter((x) => x.length > 8)
          .sort((a, b) => b.length - a.length)[0] || ""
    }

    if (!codice || !descrizione) return null

    return {
      codice,
      descrizione,
      ean,
      prezzo: prezzoNetto || prezzoLordo || 0,
      prezzo_lordo: prezzoLordo || 0,
      prezzo_netto: prezzoNetto || prezzoLordo || 0,
      produttore,
      unita_misura: unita,
      attivo: true,
      aggiornato_il: new Date().toISOString()
    }
  }

  function leggiRigaTXT(riga) {
    const descrizione = riga.substring(0, 60).trim()
    const codice = riga.substring(60, 80).trim()
    const unita = riga.substring(80, 83).trim()
    const prezzoRaw = riga.substring(100, 115).trim()
    const prezzo = parseInt(prezzoRaw || "0", 10) / 100

    if (!codice || !descrizione) return null

    return {
      codice,
      descrizione,
      ean: "",
      prezzo: prezzo || 0,
      prezzo_lordo: prezzo || 0,
      prezzo_netto: prezzo || 0,
      produttore: "",
      unita_misura: unita || "PZ",
      attivo: true,
      aggiornato_il: new Date().toISOString()
    }
  }

  async function importa() {
    if (!file) {
      alert("Seleziona un file CSV o TXT")
      return
    }

    setLoading(true)
    setTotale(0)
    setCaricati(0)

    try {
      const buffer = await file.arrayBuffer()
      const text = new TextDecoder("windows-1252").decode(buffer)
      const righe = text.split(/\r?\n/)

      const articoli = []
      const mappa = {}

      const isCSV =
        file.name.toLowerCase().endsWith(".csv") ||
        text.includes(";")

      console.log("FILE:", file.name)
      console.log("TIPO RILEVATO:", isCSV ? "CSV" : "TXT")
      console.log("PRIME 5 RIGHE:", righe.slice(0, 5))

      for (let i = 0; i < righe.length; i++) {
        const riga = righe[i]
        if (!riga || !riga.trim()) continue

        const articolo = isCSV
          ? leggiRigaCSV(riga)
          : leggiRigaTXT(riga)

        if (!articolo) continue
        if (mappa[articolo.codice]) continue

        mappa[articolo.codice] = true
        articoli.push(articolo)

        if (i % 1000 === 0) {
          await new Promise((res) => setTimeout(res, 5))
        }
      }

      console.log("ARTICOLI RICONOSCIUTI:", articoli.length)
      console.log("PRIMI ARTICOLI:", articoli.slice(0, 10))

      if (articoli.length < 1) {
        alert("Nessun articolo riconosciuto. Apri F12 > Console e mandami le prime righe.")
        setLoading(false)
        return
      }

      setTotale(articoli.length)

      const BATCH = 500

      for (let i = 0; i < articoli.length; i += BATCH) {
        const chunk = articoli.slice(i, i + BATCH)

        const { error } = await supabase
          .from("articoli_prezzi")
          .upsert(chunk, { onConflict: "codice" })

        if (error) {
          console.error(error)
          alert("Errore Supabase: " + error.message)
          setLoading(false)
          return
        }

        setCaricati(Math.min(i + BATCH, articoli.length))
        await new Promise((res) => setTimeout(res, 10))
      }

      alert("IMPORT LISTINO COMPLETO ✔")
    } catch (err) {
      console.error(err)
      alert("Errore durante importazione listino")
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 IMPORTA LISTINO PREZZI</h2>

      <p>
        Carica file <b>CSV</b> oppure <b>TXT</b>. Il gestionale aggiorna gli
        articoli tramite il codice, senza duplicarli.
      </p>

      <input
        type="file"
        accept=".csv,.txt,.xls"
        disabled={loading}
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br />
      <br />

      {file && (
        <div
          style={{
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 8,
            marginBottom: 15,
            background: "#f8f8f8"
          }}
        >
          <b>File selezionato:</b> {file.name}
        </div>
      )}

      <button
        onClick={importa}
        disabled={loading}
        style={{
          padding: "10px 18px",
          fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Importazione in corso..." : "🚀 Importa Listino"}
      </button>

      {loading && (
        <div style={{ marginTop: 20 }}>
          <b>Caricamento:</b> {caricati} / {totale}
        </div>
      )}

      {!loading && totale > 0 && (
        <div style={{ marginTop: 20, color: "green" }}>
          ✔ Ultimo import completato: {totale} articoli
        </div>
      )}
    </div>
  )
}