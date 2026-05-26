import { useEffect, useState, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function PreferitiPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const interventoId = searchParams.get("intervento_id")

  const [preferiti, setPreferiti] = useState([])
  const [materialiUsati, setMaterialiUsati] = useState([])
  const [carrelli, setCarrelli] = useState([])
  const [carrelloSelezionatoId, setCarrelloSelezionatoId] = useState("")

  const [filtro1, setFiltro1] = useState("")
  const [filtro2, setFiltro2] = useState("")
  const [filtro3, setFiltro3] = useState("")
  const [filtro4, setFiltro4] = useState("")

  const ref1 = useRef(null)
  const ref2 = useRef(null)
  const ref3 = useRef(null)
  const ref4 = useRef(null)
  const risultatiRef = useRef(null)

  const [quantita, setQuantita] = useState({})
  const [soloConPrezzo, setSoloConPrezzo] = useState(false)
  const [importandoId, setImportandoId] = useState(null)
  const [rigenerando, setRigenerando] = useState(false)

  useEffect(() => {
    caricaPreferiti()
    caricaMaterialiUsati()
    caricaCarrelli()
  }, [])

  function tornaAllIntervento() {
    if (!interventoId) {
      navigate("/interventi")
      return
    }

    navigate(`/interventi?edit_id=${interventoId}`)
  }

  async function caricaPreferiti() {
    const { data, error } = await supabase
      .from("articoli_preferiti")
      .select("*")
      .order("ultimo_utilizzo", { ascending: false, nullsFirst: false })
      .limit(1000)

    if (error) {
      console.error(error)
      alert("Errore caricamento preferiti: " + error.message)
      return
    }

    setPreferiti(data || [])
  }

  async function caricaMaterialiUsati() {
    const { data, error } = await supabase
      .from("materiali_bollettino")
      .select("id, codice, descrizione")

    if (error) {
      console.error(error)
      alert("Errore caricamento materiali usati: " + error.message)
      return
    }

    setMaterialiUsati(data || [])
  }

  async function caricaCarrelli() {
    const { data, error } = await supabase
      .from("bolle_acquisto")
      .select("id, nome, nome_carrello, data, descrizione_ricerca")
      .eq("tipo", "carrello")
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento carrelli: " + error.message)
      return
    }

    setCarrelli(data || [])
  }

  function normalizzaTesto(testo) {
    return String(testo || "")
      .toLowerCase()
      .replaceAll(",", " ")
      .replaceAll(".", " ")
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replaceAll("/", " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  function preferitoGiaUsato(item) {
    const codiceItem = String(item.codice || "").trim().toLowerCase()
    const descrizioneItem = String(item.descrizione || "").trim().toLowerCase()

    return materialiUsati.some(m => {
      const codiceM = String(m.codice || "").trim().toLowerCase()
      const descrizioneM = String(m.descrizione || "").trim().toLowerCase()

      if (codiceItem && codiceM && codiceItem === codiceM) return true
      if (!codiceItem && descrizioneItem && descrizioneM === descrizioneItem) return true

      return false
    })
  }

  function usaPromemoriaComeRicerca() {
    const carrello = carrelli.find(c => String(c.id) === String(carrelloSelezionatoId))

    if (!carrello?.descrizione_ricerca) {
      alert("Questo carrello non ha un promemoria ricerca salvato")
      return
    }

    const parole = normalizzaTesto(carrello.descrizione_ricerca)
      .split(" ")
      .filter(Boolean)
      .slice(0, 4)

    setFiltro1(parole[0] || "")
    setFiltro2(parole[1] || "")
    setFiltro3(parole[2] || "")
    setFiltro4(parole[3] || "")

    setTimeout(() => {
      risultatiRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    }, 100)
  }

  function documentoHaDDT(doc) {
    const numeroDdt = String(doc?.numero_ddt || "").trim()
    const nome = String(doc?.nome || "").toLowerCase()
    const nomeCarrello = String(doc?.nome_carrello || "").toLowerCase()

    return (
      numeroDdt ||
      nome.includes("ddt") ||
      nomeCarrello.includes("ddt")
    )
  }

  async function rigeneraPreferiti() {
    if (rigenerando) return

    const conferma = window.confirm(
      "Vuoi rigenerare completamente i preferiti?\n\nSe il materiale arriva da DDT verrà salvata la data reale.\nSe arriva da carrello verrà mostrato CARRELLO."
    )

    if (!conferma) return

    setRigenerando(true)

    try {
      const { data: righe, error: righeError } = await supabase
        .from("bolle_righe")
        .select("*")

      if (righeError) {
        console.error(righeError)
        alert("Errore lettura righe: " + righeError.message)
        return
      }

      const bollaIds = Array.from(
        new Set(
          (righe || [])
            .map(r => r.bolla_id)
            .filter(Boolean)
        )
      )

      let documenti = []

      if (bollaIds.length > 0) {
        const { data: bolle, error: bolleError } = await supabase
          .from("bolle_acquisto")
          .select("id, data, tipo, nome, nome_carrello, numero_ddt")
          .in("id", bollaIds)

        if (bolleError) {
          console.error(bolleError)
          alert("Errore lettura bolle/carrelli: " + bolleError.message)
          return
        }

        documenti = bolle || []
      }

      const mappaDocumenti = new Map(
        documenti.map(d => [String(d.id), d])
      )

      const raggruppati = {}

      for (const r of (righe || [])) {
        const codice = String(r.codice || "").trim()
        const descrizione = String(r.descrizione || "").trim()

        if (!codice && !descrizione) continue

        const key = codice || descrizione
        const doc = mappaDocumenti.get(String(r.bolla_id)) || {}
        const haDDT = documentoHaDDT(doc)
        const dataRealeDDT = haDDT ? (doc.data || null) : null

        if (!raggruppati[key]) {
          raggruppati[key] = {
            codice,
            descrizione,
            prezzo: 0,
            quantita_totale: 0,
            volte_usato: 0,
            ultimo_utilizzo: dataRealeDDT
          }
        }

        raggruppati[key].quantita_totale += Number(r.quantita || 0)
        raggruppati[key].volte_usato += 1

        const prezzo = Number(r.prezzo || 0)

        if (prezzo > Number(raggruppati[key].prezzo || 0)) {
          raggruppati[key].prezzo = prezzo
        }

        if (dataRealeDDT) {
          const dataAttuale = raggruppati[key].ultimo_utilizzo

          if (!dataAttuale || new Date(dataRealeDDT) > new Date(dataAttuale)) {
            raggruppati[key].ultimo_utilizzo = dataRealeDDT
          }
        }
      }

      const nuoviPreferiti = Object.values(raggruppati)

      const { data: vecchiPreferiti, error: selectVecchiError } = await supabase
        .from("articoli_preferiti")
        .select("id")

      if (selectVecchiError) {
        console.error(selectVecchiError)
        alert("Errore lettura preferiti da eliminare: " + selectVecchiError.message)
        return
      }

      if ((vecchiPreferiti || []).length > 0) {
        const { error: deleteError } = await supabase
          .from("articoli_preferiti")
          .delete()
          .in("id", vecchiPreferiti.map(p => p.id))

        if (deleteError) {
          console.error(deleteError)
          alert("Errore pulizia preferiti: " + deleteError.message)
          return
        }
      }

      if (nuoviPreferiti.length > 0) {
        const { error: insertError } = await supabase
          .from("articoli_preferiti")
          .insert(nuoviPreferiti)

        if (insertError) {
          console.error(insertError)
          alert("Errore ricreazione preferiti: " + insertError.message)
          return
        }
      }

      alert(`✅ Preferiti rigenerati\n\nTotale articoli: ${nuoviPreferiti.length}`)
      caricaPreferiti()
      caricaMaterialiUsati()

    } finally {
      setRigenerando(false)
    }
  }

  function formatPrezzo(v) {
    const n = Number(v || 0)

    return n.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR"
    })
  }

  function formatUtilizzo(v) {
    if (!v) return "CARRELLO"
    return new Date(v).toLocaleDateString("it-IT")
  }

  async function aggiornaStatistichePreferito(item, qta) {
    const { error } = await supabase
      .from("articoli_preferiti")
      .update({
        quantita_totale: Number(item.quantita_totale || 0) + Number(qta || 0),
        ultimo_utilizzo: item.ultimo_utilizzo || null
      })
      .eq("id", item.id)

    if (error) {
      console.error(error)
      alert("Materiale importato, ma errore aggiornamento statistiche preferito: " + error.message)
    }
  }

  async function importaPreferito(item) {
    if (importandoId) return

    if (!interventoId) {
      alert("Intervento non trovato. Torna negli interventi e riapri Preferiti da lì.")
      return
    }

    const qta = Number(quantita[item.id] || 1)
    const prezzo = Number(item.prezzo || 0)
    const totale = qta * prezzo

    if (qta <= 0) {
      alert("Inserisci una quantità valida")
      return
    }

    setImportandoId(item.id)

    try {
      const { data: materialiEsistenti, error: checkError } = await supabase
        .from("materiali_bollettino")
        .select("id, codice, descrizione")
        .eq("intervento_id", interventoId)

      if (checkError) {
        console.error(checkError)
        alert("Errore controllo materiali esistenti: " + checkError.message)
        return
      }

      const codiceItem = String(item.codice || "").trim()
      const descrizioneItem = String(item.descrizione || "").trim()

      const giaPresente = (materialiEsistenti || []).some(m => {
        const codiceM = String(m.codice || "").trim()
        const descrizioneM = String(m.descrizione || "").trim()

        if (codiceItem && codiceM && codiceItem === codiceM) return true
        if (!codiceItem && descrizioneItem && descrizioneM === descrizioneItem) return true

        return false
      })

      if (giaPresente) {
        alert("Questo materiale è già presente nell’intervento")
        return
      }

      const { error } = await supabase
        .from("materiali_bollettino")
        .insert({
          intervento_id: interventoId,
          codice: item.codice || "",
          descrizione: item.descrizione || "",
          quantita: qta,
          prezzo,
          totale
        })

      if (error) {
        console.error(error)
        alert("Errore importazione materiale: " + error.message)
        return
      }

      await aggiornaStatistichePreferito(item, qta)

      setQuantita(prev => ({
        ...prev,
        [item.id]: 1
      }))

      alert("✅ Materiale importato nell’intervento")
      caricaPreferiti()
      caricaMaterialiUsati()

    } finally {
      setImportandoId(null)
    }
  }

  const carrelloSelezionato = carrelli.find(c =>
    String(c.id) === String(carrelloSelezionatoId)
  )

  const preferitiFiltrati = preferiti.filter(p => {
    const testoCompleto = normalizzaTesto(`
      ${p.codice || ""}
      ${p.descrizione || ""}
      ${p.produttore || ""}
      ${p.marca || ""}
      ${p.ean || ""}
    `)

    const filtri = [filtro1, filtro2, filtro3, filtro4]
      .map(normalizzaTesto)
      .filter(Boolean)

    const matchFiltri = filtri.every(filtro =>
      testoCompleto.includes(filtro)
    )

    const matchPrezzo =
      !soloConPrezzo || Number(p.prezzo || 0) > 0

    return matchFiltri && matchPrezzo
  })

  return (
    <div style={{ padding: 20 }}>
      <h2>⭐ Materiali Preferiti</h2>

      {interventoId ? (
        <div style={{
          background: "#e7f1ff",
          border: "1px solid #9ec5fe",
          padding: 10,
          borderRadius: 6,
          marginBottom: 12
        }}>
          Stai importando materiali nell’intervento <b>#{interventoId}</b>

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
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffeeba",
          padding: 10,
          borderRadius: 6,
          marginBottom: 12
        }}>
          Consultazione preferiti. Se vuoi importare un materiale in un intervento, apri questa pagina dal tasto ⭐ Preferiti dentro l’intervento.
        </div>
      )}

      {!interventoId && (
        <button onClick={() => navigate("/interventi")}>
          ⬅ Torna a Interventi
        </button>
      )}

      <div style={{
        marginTop: 15,
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 6,
        background: "#f8f9fa"
      }}>
        <h3 style={{ marginTop: 0 }}>🛒 Aiuto ricerca da carrello</h3>

        <div style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <select
            value={carrelloSelezionatoId}
            onChange={(e) => setCarrelloSelezionatoId(e.target.value)}
            style={{
              minWidth: 260,
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 5
            }}
          >
            <option value="">-- scegli un carrello --</option>
            {carrelli.map(c => {
              const nomeCarrello = c.nome || c.nome_carrello || "Carrello"
              const dataCarrello = c.data ? new Date(c.data).toLocaleDateString("it-IT") : ""

              return (
                <option key={c.id} value={c.id}>
                  {nomeCarrello} {dataCarrello ? `- ${dataCarrello}` : ""}
                </option>
              )
            })}
          </select>

          <button onClick={caricaCarrelli}>
            🔄 Aggiorna carrelli
          </button>

          <button
            onClick={usaPromemoriaComeRicerca}
            disabled={!carrelloSelezionato?.descrizione_ricerca}
            style={{
              background: carrelloSelezionato?.descrizione_ricerca ? "#0d6efd" : "#ccc",
              color: carrelloSelezionato?.descrizione_ricerca ? "white" : "black",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: carrelloSelezionato?.descrizione_ricerca ? "pointer" : "not-allowed"
            }}
          >
            ⚡ Usa come ricerca
          </button>
        </div>

        {carrelloSelezionato && (
          <div style={{
            marginTop: 10,
            padding: 10,
            background: carrelloSelezionato.descrizione_ricerca ? "#fff3cd" : "white",
            border: carrelloSelezionato.descrizione_ricerca ? "1px solid #ffe69c" : "1px solid #ddd",
            borderRadius: 6
          }}>
            <b>Promemoria ricerca:</b>
            <div style={{ marginTop: 5 }}>
              {carrelloSelezionato.descrizione_ricerca
                ? carrelloSelezionato.descrizione_ricerca
                : "Nessun promemoria salvato per questo carrello."}
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: 15,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <input ref={ref1} placeholder="Filtro 1 es. PHL..." value={filtro1}
          onChange={(e) => setFiltro1(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ref2.current?.focus() }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <input ref={ref2} placeholder="Filtro 2 es. GU..." value={filtro2}
          onChange={(e) => setFiltro2(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ref3.current?.focus() }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <input ref={ref3} placeholder="Filtro 3 es. 3000..." value={filtro3}
          onChange={(e) => setFiltro3(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ref4.current?.focus() }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <input ref={ref4} placeholder="Filtro 4 es. 15000..." value={filtro4}
          onChange={(e) => setFiltro4(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              risultatiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={soloConPrezzo} onChange={(e) => setSoloConPrezzo(e.target.checked)} />
          Solo con prezzo
        </label>

        <button onClick={() => {
          setFiltro1("")
          setFiltro2("")
          setFiltro3("")
          setFiltro4("")
          setSoloConPrezzo(false)
          ref1.current?.focus()
        }}>
          Reset
        </button>

        <button onClick={caricaPreferiti}>🔄 Aggiorna</button>

        <button
          onClick={rigeneraPreferiti}
          disabled={rigenerando}
          style={{
            background: "#198754",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: 5,
            cursor: rigenerando ? "not-allowed" : "pointer"
          }}
        >
          {rigenerando ? "Rigenerazione..." : "♻️ Rigenera preferiti"}
        </button>
      </div>

      <div ref={risultatiRef} style={{ marginTop: 10 }}>
        Risultati: <b>{preferitiFiltrati.length}</b>
      </div>

      {preferitiFiltrati.map(item => {
        const usato = preferitoGiaUsato(item)
        const origine = item.ultimo_utilizzo ? "DDT" : "CARRELLO"

        return (
          <div key={item.id} style={{
            border: usato ? "2px solid #198754" : "1px solid #ccc",
            padding: 10,
            marginTop: 8,
            borderRadius: 6,
            background: usato ? "#f0fff4" : "white",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <b>{item.codice || "-"}</b>

                <span style={{
                  background: usato ? "#198754" : "#6c757d",
                  color: "white",
                  padding: "3px 8px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: "bold"
                }}>
                  {usato ? "🟢 USATO IN INTERVENTO" : "⚪ NON USATO IN INTERVENTI"}
                </span>

                <span style={{
                  background: origine === "DDT" ? "#0d6efd" : "#ffc107",
                  color: origine === "DDT" ? "white" : "black",
                  padding: "3px 8px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: "bold"
                }}>
                  {origine}
                </span>
              </div>

              <div>{item.descrizione || "-"}</div>

              <div style={{
                marginTop: 5,
                fontSize: 13,
                color: "#555",
                display: "flex",
                gap: 12,
                flexWrap: "wrap"
              }}>
                <span>Prezzo: <b>{formatPrezzo(item.prezzo)}</b></span>
                <span>Presente in archivio: <b>{item.volte_usato || 0}</b> volte</span>
                <span>Qta totale: <b>{item.quantita_totale || 0}</b></span>
                <span>Ultimo utilizzo: <b>{formatUtilizzo(item.ultimo_utilizzo)}</b></span>
              </div>
            </div>

            {interventoId && (
              <>
                <input
                  type="number"
                  min="1"
                  value={quantita[item.id] || 1}
                  onChange={(e) => setQuantita(prev => ({ ...prev, [item.id]: e.target.value }))}
                  style={{ width: 80, padding: 6 }}
                />

                <button onClick={() => importaPreferito(item)} disabled={importandoId === item.id}>
                  {importandoId === item.id ? "Importo..." : "➕ Importa"}
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}