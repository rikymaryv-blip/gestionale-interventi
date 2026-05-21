import { useEffect, useState, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function PreferitiPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const interventoId = searchParams.get("intervento_id")

  const [preferiti, setPreferiti] = useState([])
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
      .order("ultimo_utilizzo", { ascending: false })
      .limit(1000)

    if (error) {
      console.error(error)
      alert("Errore caricamento preferiti: " + error.message)
      return
    }

    setPreferiti(data || [])
  }

  async function rigeneraPreferiti() {
    if (rigenerando) return

    const conferma = window.confirm(
      "Vuoi rigenerare completamente i preferiti da bolle e carrelli?\n\nI preferiti attuali verranno cancellati e ricreati."
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

      const raggruppati = {}

      for (const r of (righe || [])) {
        const codice = String(r.codice || "").trim()
        const descrizione = String(r.descrizione || "").trim()

        if (!codice && !descrizione) continue

        const key = codice || descrizione

        if (!raggruppati[key]) {
          raggruppati[key] = {
            codice,
            descrizione,
            prezzo: 0,
            quantita_totale: 0,
            volte_usato: 0,
            ultimo_utilizzo: new Date().toISOString()
          }
        }

        raggruppati[key].quantita_totale += Number(r.quantita || 0)
        raggruppati[key].volte_usato += 1

        const prezzo = Number(r.prezzo || 0)

        if (prezzo > Number(raggruppati[key].prezzo || 0)) {
          raggruppati[key].prezzo = prezzo
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

  function formatData(v) {
    if (!v) return "-"
    return new Date(v).toLocaleDateString("it-IT")
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

  async function aggiornaStatistichePreferito(item, qta) {
    const { error } = await supabase
      .from("articoli_preferiti")
      .update({
        volte_usato: Number(item.volte_usato || 0) + 1,
        quantita_totale: Number(item.quantita_totale || 0) + Number(qta || 0),
        ultimo_utilizzo: new Date().toISOString()
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

    } finally {
      setImportandoId(null)
    }
  }

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
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <input
          ref={ref1}
          placeholder="Filtro 1 es. PHL..."
          value={filtro1}
          onChange={(e) => setFiltro1(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ref2.current?.focus()
          }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <input
          ref={ref2}
          placeholder="Filtro 2 es. GU..."
          value={filtro2}
          onChange={(e) => setFiltro2(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ref3.current?.focus()
          }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <input
          ref={ref3}
          placeholder="Filtro 3 es. 3000..."
          value={filtro3}
          onChange={(e) => setFiltro3(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ref4.current?.focus()
          }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <input
          ref={ref4}
          placeholder="Filtro 4 es. 15000..."
          value={filtro4}
          onChange={(e) => setFiltro4(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              risultatiRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              })
            }
          }}
          style={{ minWidth: 190, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
        />

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={soloConPrezzo}
            onChange={(e) => setSoloConPrezzo(e.target.checked)}
          />
          Solo con prezzo
        </label>

        <button
          onClick={() => {
            setFiltro1("")
            setFiltro2("")
            setFiltro3("")
            setFiltro4("")
            setSoloConPrezzo(false)
            ref1.current?.focus()
          }}
        >
          Reset
        </button>

        <button onClick={caricaPreferiti}>
          🔄 Aggiorna
        </button>

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

      {preferitiFiltrati.length === 0 && (
        <div style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff"
        }}>
          Nessun preferito trovato.
        </div>
      )}

      {preferitiFiltrati.map(item => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 8,
            borderRadius: 6,
            background: "white",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div>
              <b>{item.codice || "-"}</b>
            </div>

            <div>
              {item.descrizione || "-"}
            </div>

            <div style={{
              marginTop: 5,
              fontSize: 13,
              color: "#555",
              display: "flex",
              gap: 12,
              flexWrap: "wrap"
            }}>
              <span>Prezzo: <b>{formatPrezzo(item.prezzo)}</b></span>
              <span>Usato: <b>{item.volte_usato || 0}</b> volte</span>
              <span>Qta totale: <b>{item.quantita_totale || 0}</b></span>
              <span>Ultimo utilizzo: <b>{formatData(item.ultimo_utilizzo)}</b></span>
            </div>
          </div>

          {interventoId && (
            <>
              <input
                type="number"
                min="1"
                value={quantita[item.id] || 1}
                onChange={(e) => setQuantita(prev => ({
                  ...prev,
                  [item.id]: e.target.value
                }))}
                style={{ width: 80, padding: 6 }}
              />

              <button
                onClick={() => importaPreferito(item)}
                disabled={importandoId === item.id}
              >
                {importandoId === item.id ? "Importo..." : "➕ Importa"}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}