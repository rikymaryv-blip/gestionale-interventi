import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function BolleUploadPage() {

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const interventoIdDaUrl = searchParams.get("intervento_id")

  const [bolle, setBolle] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)

  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")
  const [interventoCorrente, setInterventoCorrente] = useState(null)

  const [filtroOperatore, setFiltroOperatore] = useState("")
  const [ricercaCarrello, setRicercaCarrello] = useState("")
  const [importando, setImportando] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  )

  const oggi = new Date()
  const dueGiorniFa = new Date()
  dueGiorniFa.setDate(oggi.getDate() - 2)

  function formatDate(d) {
    return d.toISOString().split("T")[0]
  }

  function formattaDataIt(data) {
    if (!data) return "-"

    const soloData = String(data).split("T")[0]
    const parti = soloData.split("-")

    if (parti.length === 3) {
      return `${parti[2]}/${parti[1]}/${parti[0]}`
    }

    return data
  }

  const [dataDa, setDataDa] = useState(formatDate(dueGiorniFa))
  const [dataA, setDataA] = useState(formatDate(oggi))

  useEffect(() => {
    function aggiornaVista() {
      setIsMobile(window.innerWidth <= 768)
    }

    aggiornaVista()
    window.addEventListener("resize", aggiornaVista)
    return () => window.removeEventListener("resize", aggiornaVista)
  }, [])

  useEffect(() => {
    caricaBolle()
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

  async function caricaBolle() {
    const { data, error } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .order("data", { ascending: false })
      .order("id", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento bolle: " + error.message)
      return
    }

    const ordinate = (data || []).sort((a, b) => {
      const dataA = a.data || ""
      const dataB = b.data || ""

      if (dataA !== dataB) {
        return dataB.localeCompare(dataA)
      }

      return Number(b.id || 0) - Number(a.id || 0)
    })

    setBolle(ordinate)
  }

  async function apriBolla(b) {
    if (selected?.id === b.id) {
      setSelected(null)
      setRighe([])
      return
    }

    setSelected(b)

    if (!interventoIdDaUrl) {
      setInterventoSelezionato("")
    } else {
      setInterventoSelezionato(interventoIdDaUrl)
    }

    const { data, error } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", b.id)
      .order("id", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento righe bolla: " + error.message)
      return
    }

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

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return

    const text = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.readAsText(file, "ISO-8859-1")
    })

    const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim())

    if (lines.length < 2) {
      alert("File vuoto o non valido")
      return
    }

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

      const codice = v[14] || ""
      const descrizione = v[13] || ""
      const quantita = leggiNumero(v[16]) || 0

      const prezzo =
        leggiNumero(v[17]) ||
        leggiNumero(v[18]) ||
        leggiNumero(v[19]) ||
        leggiNumero(v[20]) ||
        0

      if (!codice && !descrizione) continue

      grouped[key].righe.push({
        codice,
        descrizione,
        quantita,
        prezzo,
        totale: quantita * prezzo
      })
    }

    let salvate = 0

    for (const b of Object.values(grouped)) {
      if (!b.righe.length) continue

      const { data: giaPresente } = await supabase
        .from("bolle_acquisto")
        .select("id")
        .eq("numero_ordine", b.numero_ordine)
        .eq("numero_ddt", b.numero_ddt)
        .maybeSingle()

      if (giaPresente?.id) {
        continue
      }

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

      if (error) {
        console.error(error)
        alert("Errore salvataggio bolla: " + error.message)
        continue
      }

      const { error: righeError } = await supabase
        .from("bolle_righe")
        .insert(
          b.righe.map(r => ({
            bolla_id: saved.id,
            codice: r.codice,
            descrizione: r.descrizione,
            quantita: r.quantita,
            prezzo: r.prezzo,
            totale: r.totale
          }))
        )

      if (righeError) {
        console.error(righeError)
        alert("Errore inserimento righe bolla: " + righeError.message)
        continue
      }

      await aggiornaPreferiti(b.righe)

      salvate++
    }

    alert("Caricate " + salvate + " bolle e preferiti aggiornati")
    e.target.value = ""
    caricaBolle()
  }

  async function importaInIntervento() {
    if (importando) return

    const interventoFinale = interventoIdDaUrl || interventoSelezionato

    if (!selected) {
      alert("Seleziona una bolla")
      return
    }

    if (selected?.usata) {
      alert("⚠️ Questa bolla è già stata importata")
      return
    }

    if (!interventoFinale) {
      alert("Seleziona intervento")
      return
    }

    if (!righe.length) {
      alert("Questa bolla non ha righe")
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
          totale: Number(r.quantita || 1) * Number(r.prezzo || 0)
        }))

      if (materialiDaInserire.length === 0) {
        alert("Tutti i materiali di questa bolla risultano già presenti nell’intervento")
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

      const { error: updateError } = await supabase
        .from("bolle_acquisto")
        .update({ usata: true })
        .eq("id", selected.id)

      if (updateError) {
        console.error(updateError)
        alert("Materiali inseriti, ma errore nel segnare la bolla come usata: " + updateError.message)
        return
      }

      alert("✅ Materiali importati nell’intervento")

      setSelected(null)
      setRighe([])
      caricaBolle()

    } finally {
      setImportando(false)
    }
  }

  async function annullaImportazione() {
    if (!selected) return

    const conferma = confirm("Vuoi riattivare questa bolla? I materiali già copiati nell’intervento NON verranno cancellati.")
    if (!conferma) return

    const { error } = await supabase
      .from("bolle_acquisto")
      .update({ usata: false })
      .eq("id", selected.id)

    if (error) {
      console.error(error)
      alert("Errore riattivazione bolla: " + error.message)
      return
    }

    alert("Bolla riattivata")
    setSelected(prev => prev ? { ...prev, usata: false } : prev)
    caricaBolle()
  }

  const operatori = [...new Set(bolle.map(b => b.creatore_carrello).filter(Boolean))]
  const carrelli = [...new Set(bolle.map(b => b.nome_carrello).filter(Boolean))]

  const bolleFiltrate = bolle
    .filter(b => {
      const m1 = !filtroOperatore || b.creatore_carrello === filtroOperatore
      const m2 = (!dataDa || b.data >= dataDa) && (!dataA || b.data <= dataA)
      const m3 = !ricercaCarrello || (b.nome_carrello || "").toLowerCase().includes(ricercaCarrello.toLowerCase())

      return m1 && m2 && m3
    })
    .sort((a, b) => {
      const dataAOrd = a.data || ""
      const dataBOrd = b.data || ""

      if (dataAOrd !== dataBOrd) {
        return dataBOrd.localeCompare(dataAOrd)
      }

      return Number(b.id || 0) - Number(a.id || 0)
    })

  function renderDettaglioBolla() {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: 10,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#f8f9fa"
        }}
      >
        <h3 style={{ marginTop: 0 }}>Dettaglio bolla</h3>

        <button onClick={() => {
          setSelected(null)
          setRighe([])
        }}>
          ❌ Chiudi
        </button>

        {interventoIdDaUrl ? (
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

            <br />

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
        ) : (
          <select
            value={interventoSelezionato}
            onChange={(e) => setInterventoSelezionato(e.target.value)}
            style={{ marginLeft: 10 }}
          >
            <option value="">Seleziona intervento</option>
            {interventi.map(i => (
              <option key={i.id} value={i.id}>
                {formattaDataIt(i.data)} - {i.clienti?.nome} - {i.descrizione}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={importaInIntervento}
          disabled={selected?.usata || importando}
          style={{
            marginLeft: 10,
            background: selected?.usata ? "#ccc" : "#198754",
            color: selected?.usata ? "black" : "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: 5,
            cursor: selected?.usata || importando ? "not-allowed" : "pointer"
          }}
        >
          {importando ? "Importazione..." : "🚀 Importa"}
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

        {selected?.usata && (
          <button
            onClick={annullaImportazione}
            style={{ marginLeft: 10 }}
          >
            ↩ Riattiva bolla
          </button>
        )}

        <div style={{ marginTop: 12 }}>
          {righe.length === 0 && (
            <div style={{
              padding: 10,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 6
            }}>
              Nessuna riga trovata per questa bolla.
            </div>
          )}

          {righe.map((r, i) => (
            isMobile ? (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "58px minmax(0, 1fr)",
                  gap: 8,
                  border: "1px solid #198754",
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 9,
                  background: "#effcf4",
                  boxSizing: "border-box"
                }}
              >
                <div style={{
                  minWidth: 0,
                  borderRight: "1px solid #d9e8df",
                  paddingRight: 6
                }}>
                  <div style={{
                    fontSize: 9,
                    fontWeight: "bold",
                    lineHeight: 1.15,
                    overflowWrap: "anywhere",
                    color: "#333"
                  }}>
                    {r.codice || "-"}
                  </div>

                  <div style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: "#666"
                  }}>
                    Qta
                  </div>

                  <div style={{
                    fontSize: 15,
                    fontWeight: "bold",
                    marginTop: 1
                  }}>
                    {r.quantita || 0}
                  </div>
                </div>

                <div style={{
                  minWidth: 0,
                  width: "100%",
                  fontSize: 15,
                  lineHeight: 1.3,
                  whiteSpace: "normal",
                  overflowWrap: "break-word",
                  wordBreak: "normal",
                  hyphens: "none"
                }}>
                  {r.descrizione || "-"}
                </div>
              </div>
            ) : (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 80px",
                  gap: 10,
                  borderBottom: "1px solid #ddd",
                  padding: "6px 0"
                }}
              >
                <div>{r.codice || "-"}</div>
                <div>{r.descrizione || "-"}</div>
                <div>Qta: {r.quantita || 0}</div>
              </div>
            )
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={isMobile ? { padding: 8, width: "100%", boxSizing: "border-box", overflowX: "hidden" } : { padding: 20 }}>

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
              {interventoCorrente?.data ? ` - ${formattaDataIt(interventoCorrente.data)}` : ""}
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

      <input type="file" accept=".csv" onChange={handleFile} />

      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>

        <select
          value={filtroOperatore}
          onChange={(e) => setFiltroOperatore(e.target.value)}
          style={isMobile ? { width: "100%", padding: 8, boxSizing: "border-box" } : undefined}
        >
          <option value="">Tutti operatori</option>
          {operatori.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>

        <span>Da:</span>
        <input
          type="date"
          value={dataDa}
          onChange={(e) => setDataDa(e.target.value)}
          style={isMobile ? { flex: 1, minWidth: 0, padding: 8 } : undefined}
        />

        <span>A:</span>
        <input
          type="date"
          value={dataA}
          onChange={(e) => setDataA(e.target.value)}
          style={isMobile ? { flex: 1, minWidth: 0, padding: 8 } : undefined}
        />

        <div style={{ position: "relative" }}>
          <input
            placeholder="🔍 Cerca carrello..."
            value={ricercaCarrello}
            onChange={(e) => setRicercaCarrello(e.target.value)}
            style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8 } : undefined}
          />

          {ricercaCarrello && (
            <div style={{
              position: "absolute",
              background: "white",
              border: "1px solid #ccc",
              zIndex: 20,
              minWidth: 220
            }}>
              {carrelli
                .filter(c => c.toLowerCase().includes(ricercaCarrello.toLowerCase()))
                .slice(0, 10)
                .map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setRicercaCarrello(c)}
                    style={{ padding: 6, cursor: "pointer" }}
                  >
                    {c}
                  </div>
                ))}

              {carrelli.filter(c => c.toLowerCase().includes(ricercaCarrello.toLowerCase())).length === 0 && (
                <div style={{ padding: 6, color: "#777" }}>
                  Nessun carrello trovato
                </div>
              )}
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

        <button onClick={caricaBolle}>
          🔄 Aggiorna
        </button>

        <span>
          Risultati: <b>{bolleFiltrate.length}</b>
        </span>

      </div>

      <hr />

      {bolleFiltrate.length === 0 && (
        <div style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff"
        }}>
          Nessuna bolla trovata.
        </div>
      )}

      {bolleFiltrate.map(b => (
        <div key={b.id}>
          <div
            onClick={() => apriBolla(b)}
            style={{
              border: selected?.id === b.id ? "2px solid #0d6efd" : b.usata ? "2px solid green" : "1px solid #ccc",
              background: b.usata ? "#e8f5e9" : selected?.id === b.id ? "#e7f1ff" : "white",
              padding: 10,
              marginTop: 5,
              cursor: "pointer",
              borderRadius: 6
            }}
          >
            <b>{b.numero_ordine}</b> | DDT: {b.numero_ddt}
            <div>📅 {formattaDataIt(b.data)}</div>
            <div>👤 {b.creatore_carrello || "-"}</div>
            <div>📦 {b.nome_carrello || "-"}</div>
            {b.usata && <span>✅ USATA</span>}
          </div>

          {selected?.id === b.id && renderDettaglioBolla()}
        </div>
      ))}

    </div>
  )
}