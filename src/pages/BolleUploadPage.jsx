import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function BolleUploadPage() {

  const [bolle, setBolle] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState("")

  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")

  const [mostraArchiviate, setMostraArchiviate] = useState(false)

  useEffect(() => {
    caricaBolle()
    caricaInterventi()
  }, [mostraArchiviate])

  async function caricaInterventi() {
    const { data } = await supabase
      .from("interventi")
      .select("id, data, clienti(nome)")
      .order("data", { ascending: false })

    setInterventi(data || [])
  }

  async function caricaBolle() {
    const { data } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .eq("usata", mostraArchiviate)
      .order("data", { ascending: false })

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

  // 🚀 IMPORT + ARCHIVIA
  async function importaInIntervento() {

    if (!interventoSelezionato) {
      alert("Seleziona intervento")
      return
    }

    for (let r of righe) {
      await supabase.from("materiali_bollettino").insert({
        intervento_id: interventoSelezionato,
        codice: r.codice,
        descrizione: r.descrizione,
        quantita: r.quantita
      })
    }

    // 🔥 ARCHIVIA
    await supabase
      .from("bolle_acquisto")
      .update({ usata: true })
      .eq("id", selected.id)

    alert("IMPORT OK")

    setSelected(null)
    setRighe([])
    caricaBolle()
  }

  // 🔍 RICERCA LOCALE
  const bolleFiltrate = bolle.filter(b =>
    !search ||
    b.numero_ordine?.toString().includes(search) ||
    b.numero_ddt?.toString().includes(search) ||
    b.nome_carrello?.toLowerCase().includes(search.toLowerCase()) ||
    b.data?.includes(search)
  )

  return (
    <div style={{ padding: 20 }}>

      <h2>📦 Archivio Bolle</h2>

      {/* 🔘 TOGGLE */}
      <button
        onClick={() => setMostraArchiviate(!mostraArchiviate)}
        style={{ marginBottom: 10 }}
      >
        {mostraArchiviate ? "Mostra Attive" : "Mostra Archiviate"}
      </button>

      {/* 🔍 RICERCA */}
      <input
        placeholder="Cerca ordine, DDT, carrello, data..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <hr />

      {/* 📋 LISTA */}
      {bolleFiltrate.map(b => (
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
          <div>{b.nome_carrello}</div>
          <div style={{ fontSize: 12 }}>{b.data}</div>
        </div>
      ))}

      {/* 📦 DETTAGLIO */}
      {selected && (
        <div style={{ marginTop: 20 }}>

          <h3>Dettaglio</h3>

          <select
            value={interventoSelezionato}
            onChange={(e) => setInterventoSelezionato(e.target.value)}
          >
            <option value="">Seleziona intervento</option>

            {interventi.map(i => (
              <option key={i.id} value={i.id}>
                {i.data} - {i.clienti?.nome}
              </option>
            ))}
          </select>

          <button onClick={importaInIntervento}>
            🚀 Importa in intervento
          </button>

          <div style={{ marginTop: 10 }}>
            {righe.map((r, i) => (
              <div key={i}>
                {r.codice} - {r.descrizione} ({r.quantita})
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  )
}