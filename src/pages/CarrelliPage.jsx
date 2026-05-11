import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function CarrelliPage() {

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const interventoIdDaUrl = searchParams.get("intervento_id")

  const [carrelli, setCarrelli] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)

  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")
  const [interventoCorrente, setInterventoCorrente] = useState(null)

  const [searchNome, setSearchNome] = useState("")
  const [dataDa, setDataDa] = useState("")
  const [dataA, setDataA] = useState("")

  const [importando, setImportando] = useState(false)
  const [caricandoCSV, setCaricandoCSV] = useState(false)

  useEffect(() => {
    caricaCarrelli()
    caricaInterventi()
  }, [])

  useEffect(() => {
    if (interventoIdDaUrl) {
      setInterventoSelezionato(interventoIdDaUrl)
    }
  }, [interventoIdDaUrl])

  function tornaAllIntervento() {
    const id = interventoIdDaUrl || interventoSelezionato

    if (!id) {
      navigate("/interventi")
      return
    }

    navigate(`/interventi?edit_id=${id}`)
  }

  async function caricaCarrelli() {
    const { data, error } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .eq("tipo", "carrello")
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento carrelli: " + error.message)
      return
    }

    setCarrelli(data || [])
  }

  async function caricaInterventi() {
    const { data, error } = await supabase
      .from("interventi")
      .select("id, data, descrizione, clienti(nome)")
      .or("archiviato.is.null,archiviato.eq.false")
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento interventi: " + error.message)
      return
    }

    setInterventi(data || [])

    if (interventoIdDaUrl) {
      const trovato = (data || []).find(i => String(i.id) === String(interventoIdDaUrl))
      setInterventoCorrente(trovato || null)
      setInterventoSelezionato(interventoIdDaUrl)
    }
  }

  async function selezionaCarrello(c) {
    if (selected?.id === c.id) {
      setSelected(null)
      setRighe([])
      return
    }

    setSelected(c)

    if (interventoIdDaUrl) {
      setInterventoSelezionato(interventoIdDaUrl)
    }

    const { data, error } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", c.id)
      .order("id", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento righe carrello: " + error.message)
      return
    }

    setRighe(data || [])
  }

  function leggiNumero(valore) {
    if (valore === null || valore === undefined) return 0

    const pulito = String(valore)
      .replace("€", "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()

    const numero = Number(pulito)
    return isNaN(numero) ? 0 : numero
  }

  async function aggiornaPreferiti(materiali) {
    const validi = materiali
      .filter(m => m.codice || m.descrizione)
      .map(m => ({
        codice: String(m.codice || "").trim(),
        descrizione: String(m.descrizione || "").trim(),
        quantita: Number(m.quantita || 0),
        prezzo: Number(m.prezzo || 0)
      }))

    if (validi.length === 0) return

    const raggruppati = {}

    for (const m of validi) {
      const key = m.codice || m.descrizione

      if (!raggruppati[key]) {
        raggruppati[key] = {
          codice: m.codice,
          descrizione: m.descrizione,
          quantita: 0,
          prezzo: 0
        }
      }

      raggruppati[key].quantita += Number(m.quantita || 0)

      if (Number(m.prezzo || 0) > Number(raggruppati[key].prezzo || 0)) {
        raggruppati[key].prezzo = Number(m.prezzo || 0)
      }
    }

    const lista = Object.values(raggruppati)
    const codici = lista.map(m => m.codice).filter(Boolean)

    if (codici.length === 0) return

    const { data: esistenti, error: selectError } = await supabase
      .from("articoli_preferiti")
      .select("id, codice, descrizione, prezzo, volte_usato, quantita_totale")
      .in("codice", codici)

    if (selectError) {
      console.error(selectError)
      alert("Errore controllo preferiti: " + selectError.message)
      return
    }

    const mappaEsistenti = new Map(
      (esistenti || []).map(e => [String(e.codice), e])
    )

    for (const m of lista) {
      const esistente = m.codice ? mappaEsistenti.get(String(m.codice)) : null

      if (!esistente) {
        const { error: insertError } = await supabase
          .from("articoli_preferiti")
          .insert({
            codice: m.codice || null,
            descrizione: m.descrizione || null,
            prezzo: Number(m.prezzo || 0),
            volte_usato: 1,
            quantita_totale: Number(m.quantita || 0),
            ultimo_utilizzo: new Date().toISOString()
          })

        if (insertError) {
          console.error(insertError)
          alert("Errore inserimento preferito: " + insertError.message)
          return
        }
      } else {
        const prezzoVecchio = Number(esistente.prezzo || 0)
        const prezzoNuovo = Number(m.prezzo || 0)

        const prezzoDaSalvare =
          prezzoNuovo > prezzoVecchio ? prezzoNuovo : prezzoVecchio

        const { error: updateError } = await supabase
          .from("articoli_preferiti")
          .update({
            descrizione: esistente.descrizione || m.descrizione || null,
            prezzo: prezzoDaSalvare,
            volte_usato: Number(esistente.volte_usato || 0) + 1,
            quantita_totale: Number(esistente.quantita_totale || 0) + Number(m.quantita || 0),
            ultimo_utilizzo: new Date().toISOString()
          })
          .eq("id", esistente.id)

        if (updateError) {
          console.error(updateError)
          alert("Errore aggiornamento preferito: " + updateError.message)
          return
        }
      }
    }
  }

  async function inserisciInIntervento() {
    if (importando) return

    const interventoFinale = interventoIdDaUrl || interventoSelezionato

    if (!interventoFinale) {
      alert("Seleziona intervento")
      return
    }

    if (!selected) {
      alert("Seleziona carrello")
      return
    }

    if (selected?.usata) {
      alert("⚠️ Questo carrello è già stato usato")
      return
    }

    if (!righe.length) {
      alert("Questo carrello non ha righe")
      return
    }

    setImportando(true)

    try {
      const { data: materialiEsistenti, error: checkError } = await supabase
        .from("materiali_bollettino")
        .select("id, codice, descrizione")
        .eq("intervento_id", interventoFinale)

      if (checkError) {
        console.error(checkError)
        alert("Errore controllo materiali esistenti: " + checkError.message)
        return
      }

      const materialiGiaPresenti = new Set(
        (materialiEsistenti || []).map(m =>
          `${String(m.codice || "").trim()}_${String(m.descrizione || "").trim()}`
        )
      )

      const materialiDaInserire = righe
        .filter(r => r.codice || r.descrizione)
        .filter(r => {
          const key = `${String(r.codice || "").trim()}_${String(r.descrizione || "").trim()}`
          return !materialiGiaPresenti.has(key)
        })
        .map(r => ({
          intervento_id: interventoFinale,
          codice: r.codice || "",
          descrizione: r.descrizione || "",
          quantita: Number(r.quantita || 1),
          prezzo: Number(r.prezzo || 0),
          totale: Number(r.quantita || 1) * Number(r.prezzo || 0),
          carrello_id: selected.id
        }))

      if (materialiDaInserire.length === 0) {
        alert("Tutti i materiali di questo carrello risultano già presenti nell’intervento")
        return
      }

      const { error: insertError } = await supabase
        .from("materiali_bollettino")
        .insert(materialiDaInserire)

      if (insertError) {
        console.error(insertError)
        alert("Errore inserimento materiali intervento: " + insertError.message)
        return
      }

      await aggiornaPreferiti(righe)

      const { error: updateError } = await supabase
        .from("bolle_acquisto")
        .update({ usata: true })
        .eq("id", selected.id)

      if (updateError) {
        console.error(updateError)
        alert("Materiali inseriti, ma errore nel segnare il carrello come usato: " + updateError.message)
        return
      }

      alert("✅ Inserito nell’intervento")

      setSelected(null)
      setRighe([])
      caricaCarrelli()

    } finally {
      setImportando(false)
    }
  }

  async function importaCSV(file) {
    if (caricandoCSV) return
    setCaricandoCSV(true)

    try {
      const text = await file.text()
      const righeFile = text.split("\n").filter(r => r.trim() !== "")

      if (righeFile.length < 2) {
        alert("File vuoto o non valido")
        return
      }

      const materiali = []

      const primaRiga = righeFile[1]?.split(";")
      const nomeCarrello = primaRiga?.[17]?.trim() || "Carrello"

      for (let i = 1; i < righeFile.length; i++) {
        const colonne = righeFile[i].split(";")

        const codice = colonne[1]?.trim()
        const descrizione = colonne[6]?.trim()
        const quantita = leggiNumero(colonne[10]) || 1

        const prezzo =
          leggiNumero(colonne[11]) ||
          leggiNumero(colonne[12]) ||
          leggiNumero(colonne[13]) ||
          0

        if (codice || descrizione) {
          materiali.push({
            codice,
            descrizione,
            quantita,
            prezzo,
            totale: quantita * prezzo
          })
        }
      }

      if (materiali.length === 0) {
        alert("❌ Nessun materiale trovato")
        return
      }

      const { data: giaPresente } = await supabase
        .from("bolle_acquisto")
        .select("id")
        .eq("tipo", "carrello")
        .eq("nome_carrello", nomeCarrello)
        .maybeSingle()

      if (giaPresente?.id) {
        alert("⚠️ Questo carrello sembra già importato")
        return
      }

      const { data: carrello, error } = await supabase
        .from("bolle_acquisto")
        .insert({
          nome: nomeCarrello,
          nome_carrello: nomeCarrello,
          data: new Date().toISOString(),
          tipo: "carrello",
          usata: false
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        alert("Errore creazione carrello: " + error.message)
        return
      }

      const { error: righeError } = await supabase
        .from("bolle_righe")
        .insert(
          materiali.map(m => ({
            bolla_id: carrello.id,
            codice: m.codice,
            descrizione: m.descrizione,
            quantita: m.quantita,
            prezzo: m.prezzo,
            totale: m.totale
          }))
        )

      if (righeError) {
        console.error(righeError)
        alert("Errore inserimento righe carrello: " + righeError.message)
        return
      }

      await aggiornaPreferiti(materiali)

      alert("✅ Carrello importato e preferiti aggiornati")

      caricaCarrelli()

    } finally {
      setCaricandoCSV(false)
    }
  }

  const carrelliFiltrati = carrelli.filter(c => {
    const nomeCarrello = c.nome || c.nome_carrello || ""

    const nomeOk =
      !searchNome ||
      nomeCarrello.toLowerCase().includes(searchNome.toLowerCase())

    const dataCarrello = c.data ? c.data.substring(0, 10) : ""

    const daOk = !dataDa || dataCarrello >= dataDa
    const aOk = !dataA || dataCarrello <= dataA

    return nomeOk && daOk && aOk
  })

  return (
    <div style={{ padding: 20 }}>

      <h2>🛒 Carrelli</h2>

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

          <button
            onClick={tornaAllIntervento}
            style={{
              marginTop: 10,
              background: "#0d6efd",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: "pointer"
            }}
          >
            ⬅ Torna all’intervento
          </button>
        </div>
      )}

      {!interventoIdDaUrl && (
        <button
          onClick={() => navigate("/interventi")}
          style={{
            marginBottom: 10,
            padding: "8px 12px",
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          ⬅ Torna a Interventi
        </button>
      )}

      <input
        type="file"
        accept=".csv"
        disabled={caricandoCSV}
        onChange={(e) => {
          const file = e.target.files[0]
          if (file) importaCSV(file)
          e.target.value = ""
        }}
      />

      {caricandoCSV && (
        <div style={{ marginTop: 8 }}>
          Caricamento CSV...
        </div>
      )}

      <h3 style={{ marginTop: 20 }}>Filtri</h3>

      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <input
          placeholder="Nome carrello"
          value={searchNome}
          onChange={(e) => setSearchNome(e.target.value)}
        />

        <span>Da:</span>

        <input
          type="date"
          value={dataDa}
          onChange={(e) => setDataDa(e.target.value)}
        />

        <span>A:</span>

        <input
          type="date"
          value={dataA}
          onChange={(e) => setDataA(e.target.value)}
        />

        <button
          onClick={() => {
            setSearchNome("")
            setDataDa("")
            setDataA("")
          }}
        >
          Reset
        </button>

        <button onClick={caricaCarrelli}>
          🔄 Aggiorna
        </button>

        <span>
          Risultati: <b>{carrelliFiltrati.length}</b>
        </span>
      </div>

      <h3 style={{ marginTop: 20 }}>Lista carrelli</h3>

      {carrelliFiltrati.length === 0 && (
        <div style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff"
        }}>
          Nessun carrello trovato.
        </div>
      )}

      {carrelliFiltrati.map(c => {
        const nomeCarrello = c.nome || c.nome_carrello || "Carrello"

        return (
          <div
            key={c.id}
            onClick={() => selezionaCarrello(c)}
            style={{
              border: selected?.id === c.id ? "2px solid #0d6efd" : c.usata ? "2px solid green" : "1px solid #ccc",
              padding: 10,
              marginTop: 5,
              cursor: "pointer",
              borderRadius: 6,
              background: c.usata ? "#c8e6c9" : (selected?.id === c.id ? "#e3f2fd" : "white")
            }}
          >
            🛒 <b>{nomeCarrello}</b> — {c.data ? new Date(c.data).toLocaleDateString() : ""}
            {c.usata && <span> ✅ USATO</span>}
          </div>
        )
      })}

      {selected && (
        <div style={{
          marginTop: 20,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#f8f9fa"
        }}>
          <h3 style={{ marginTop: 0 }}>📦 Righe carrello</h3>

          <button
            onClick={() => {
              setSelected(null)
              setRighe([])
            }}
          >
            ❌ Chiudi
          </button>

          {righe.length === 0 && (
            <div style={{
              marginTop: 10,
              padding: 10,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 6
            }}>
              Nessuna riga trovata per questo carrello.
            </div>
          )}

          {righe.map((r, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              borderBottom: "1px solid #ddd",
              padding: 5
            }}>
              <div>{r.codice || "-"}</div>
              <div style={{ flex: 1 }}>{r.descrizione || "-"}</div>
              <div>Qta: {r.quantita || 0}</div>
            </div>
          ))}

          {!interventoIdDaUrl ? (
            <>
              <h3>Seleziona intervento</h3>

              <select
                value={interventoSelezionato}
                onChange={(e) => setInterventoSelezionato(e.target.value)}
              >
                <option value="">-- seleziona --</option>
                {interventi.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.data} - {i.clienti?.nome} - {i.descrizione}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div style={{
              marginTop: 10,
              marginBottom: 10,
              background: "white",
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
          )}

          <br /><br />

          <button
            onClick={inserisciInIntervento}
            disabled={selected?.usata || importando}
            style={{
              background: selected?.usata ? "#ccc" : "#198754",
              color: selected?.usata ? "black" : "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: selected?.usata || importando ? "not-allowed" : "pointer"
            }}
          >
            {importando ? "Inserimento..." : "📥 Inserisci nell’intervento"}
          </button>

          {(interventoIdDaUrl || interventoSelezionato) && (
            <button
              onClick={tornaAllIntervento}
              style={{
                marginLeft: 10,
                background: "#0d6efd",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: 5,
                cursor: "pointer"
              }}
            >
              ⬅ Torna all’intervento
            </button>
          )}
        </div>
      )}

    </div>
  )
}