import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function CarrelliPage() {

  const [carrelli, setCarrelli] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)

  // 🔥 NUOVO
  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")

  // 🔍 FILTRI
  const [searchNome, setSearchNome] = useState("")
  const [dataDa, setDataDa] = useState("")
  const [dataA, setDataA] = useState("")

  useEffect(() => {
    caricaCarrelli()
    caricaInterventi()
  }, [])

  async function caricaCarrelli() {
    const { data, error } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .eq("tipo", "carrello")
      .order("data", { ascending: false })

    if (error) console.error(error)

    setCarrelli(data || [])
  }

  // 🔥 NUOVO
  async function caricaInterventi() {
    const { data } = await supabase
      .from("interventi")
      .select("id, data, clienti(nome)")
      .order("data", { ascending: false })

    setInterventi(data || [])
  }

  async function selezionaCarrello(c) {
    setSelected(c)

    const { data, error } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", c.id)

    if (error) console.error(error)

    setRighe(data || [])
  }

  // 🔥 INSERISCI IN INTERVENTO
  async function inserisciInIntervento() {

    if (!interventoSelezionato) {
      alert("Seleziona intervento")
      return
    }

    if (!selected) {
      alert("Seleziona carrello")
      return
    }

    await supabase.from("materiali_bollettino").insert(
      righe.map(r => ({
        intervento_id: interventoSelezionato,
        codice: r.codice,
        descrizione: r.descrizione,
        quantita: r.quantita,
        carrello_id: selected.id
      }))
    )

    // segna come usato
    await supabase
      .from("bolle_acquisto")
      .update({ usato: true })
      .eq("id", selected.id)

    alert("✅ Inserito nell’intervento")

    caricaCarrelli()
  }

  // 🔥 IMPORT CSV (UGUALE AL TUO)
  async function importaCSV(file) {

    const text = await file.text()
    const righeFile = text.split("\n").filter(r => r.trim() !== "")

    const materiali = []

    const primaRiga = righeFile[1]?.split(";")
    const nomeCarrello = primaRiga?.[17]?.trim() || "Carrello"

    for (let i = 1; i < righeFile.length; i++) {

      const colonne = righeFile[i].split(";")

      const codice = colonne[1]?.trim()
      const descrizione = colonne[6]?.trim()
      const quantita = parseFloat(colonne[10]) || 1

      if (codice || descrizione) {
        materiali.push({
          codice,
          descrizione,
          quantita,
          prezzo: 0
        })
      }
    }

    if (materiali.length === 0) {
      alert("❌ Nessun materiale trovato")
      return
    }

    const { data: carrello, error } = await supabase
      .from("bolle_acquisto")
      .insert({
        nome: nomeCarrello,
        data: new Date().toISOString(),
        tipo: "carrello",
        usato: false
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert("Errore: " + error.message)
      return
    }

    await supabase.from("bolle_righe").insert(
      materiali.map(m => ({
        bolla_id: carrello.id,
        codice: m.codice,
        descrizione: m.descrizione,
        quantita: m.quantita
      }))
    )

    await supabase.from("articoli_preferiti").insert(
      materiali.map(m => ({
        codice: m.codice,
        descrizione: m.descrizione
      }))
    )

    alert("✅ Carrello importato")

    caricaCarrelli()
  }

  // 🔍 FILTRO
  const carrelliFiltrati = carrelli.filter(c => {

    const nomeOk =
      !searchNome ||
      c.nome?.toLowerCase().includes(searchNome.toLowerCase())

    const dataCarrello = c.data ? c.data.substring(0, 10) : ""

    const daOk = !dataDa || dataCarrello >= dataDa
    const aOk = !dataA || dataCarrello <= dataA

    return nomeOk && daOk && aOk
  })

  return (
    <div style={{ padding: 20 }}>

      <h2>🛒 Carrelli</h2>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files[0]
          if (file) importaCSV(file)
        }}
      />

      <h3 style={{ marginTop: 20 }}>Filtri</h3>

      <input
        placeholder="Nome carrello"
        value={searchNome}
        onChange={(e) => setSearchNome(e.target.value)}
      />

      <input type="date" value={dataDa} onChange={(e) => setDataDa(e.target.value)} />
      <input type="date" value={dataA} onChange={(e) => setDataA(e.target.value)} />

      <h3 style={{ marginTop: 20 }}>Lista carrelli</h3>

      {carrelliFiltrati.map(c => (
        <div
          key={c.id}
          onClick={() => selezionaCarrello(c)}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 5,
            cursor: "pointer",
            background: c.usato ? "#c8e6c9" : (selected?.id === c.id ? "#e3f2fd" : "white")
          }}
        >
          🛒 <b>{c.nome}</b> — {new Date(c.data).toLocaleDateString()}
        </div>
      ))}

      {selected && (
        <>
          <h3 style={{ marginTop: 20 }}>📦 Righe carrello</h3>

          {righe.map((r, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px solid #ddd",
              padding: 5
            }}>
              <div>{r.codice}</div>
              <div>{r.descrizione}</div>
              <div>Qta: {r.quantita}</div>
            </div>
          ))}

          <h3>Seleziona intervento</h3>

          <select
            value={interventoSelezionato}
            onChange={(e) => setInterventoSelezionato(e.target.value)}
          >
            <option value="">-- seleziona --</option>
            {interventi.map(i => (
              <option key={i.id} value={i.id}>
                {i.data} - {i.clienti?.nome}
              </option>
            ))}
          </select>

          <br /><br />

          <button onClick={inserisciInIntervento}>
            📥 Inserisci nell’intervento
          </button>
        </>
      )}

    </div>
  )
}