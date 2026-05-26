import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../supabaseClient"

export default function ListaOrdinePage() {
  const [preferiti, setPreferiti] = useState([])
  const [carrelli, setCarrelli] = useState([])
  const [bolle, setBolle] = useState([])
  const [righeFonte, setRigheFonte] = useState([])
  const [fonteSelezionata, setFonteSelezionata] = useState("")
  const [tipoFonte, setTipoFonte] = useState("preferiti")

  const [filtro1, setFiltro1] = useState("")
  const [filtro2, setFiltro2] = useState("")
  const [filtro3, setFiltro3] = useState("")
  const [filtro4, setFiltro4] = useState("")

  const ref1 = useRef(null)
  const ref2 = useRef(null)
  const ref3 = useRef(null)
  const ref4 = useRef(null)

  const [listaOrdine, setListaOrdine] = useState([])
  const [salvando, setSalvando] = useState(false)

  const [titolo, setTitolo] = useState("LISTA MATERIALE DA ORDINARE")
  const [cliente, setCliente] = useState("")
  const [cantiere, setCantiere] = useState("")
  const [note, setNote] = useState("")
  const [aiutoRicerca, setAiutoRicerca] = useState("")

  const [manuale, setManuale] = useState({
    codice: "",
    descrizione: "",
    quantita: 1,
  })

  useEffect(() => {
    caricaPreferiti()
    caricaCarrelli()
    caricaBolle()
  }, [])

  async function caricaPreferiti() {
    const { data, error } = await supabase
      .from("articoli_preferiti")
      .select("*")
      .order("descrizione", { ascending: true })
      .limit(1000)

    if (error) {
      console.error(error)
      alert("Errore caricamento preferiti: " + error.message)
      return
    }

    setPreferiti(data || [])
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

  async function caricaBolle() {
    const { data, error } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .or("tipo.is.null,tipo.neq.carrello")
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento bolle: " + error.message)
      return
    }

    setBolle(data || [])
  }

  async function caricaRigheFonte(tipo, id) {
    setFonteSelezionata(id)
    setRigheFonte([])
    setAiutoRicerca("")
    pulisciFiltri()

    if (!id) return
    if (tipo === "preferiti") return

    const fonte = tipo === "carrelli" ? carrelli : bolle
    const selezionata = fonte.find(x => String(x.id) === String(id))

    if (selezionata?.descrizione_ricerca) {
      setAiutoRicerca(selezionata.descrizione_ricerca)
    }

    const { data, error } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", id)
      .order("id", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento righe: " + error.message)
      return
    }

    setRigheFonte(data || [])
  }

  function normalizza(testo) {
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

  function pulisciFiltri() {
    setFiltro1("")
    setFiltro2("")
    setFiltro3("")
    setFiltro4("")
  }

  function usaSuggerimento() {
    const parole = normalizza(aiutoRicerca)
      .split(" ")
      .filter(Boolean)

    setFiltro1(parole[0] || "")
    setFiltro2(parole[1] || "")
    setFiltro3(parole[2] || "")
    setFiltro4(parole[3] || "")

    setTimeout(() => {
      ref1.current?.focus()
    }, 100)
  }

  function chiaveMateriale(materiale) {
    return `${String(materiale.codice || "").trim().toLowerCase()}_${String(materiale.descrizione || "").trim().toLowerCase()}`
  }

  function materialeGiaInserito(materiale) {
    const key = chiaveMateriale(materiale)
    return listaOrdine.some(r => chiaveMateriale(r) === key)
  }

  const materialiFonte = useMemo(() => {
    if (tipoFonte === "preferiti") {
      return preferiti.map(p => ({
        codice: p.codice || "",
        descrizione: p.descrizione || "",
        quantita: 1,
        provenienza: "Preferiti",
      }))
    }

    if (tipoFonte === "carrelli") {
      return righeFonte.map(r => ({
        codice: r.codice || "",
        descrizione: r.descrizione || "",
        quantita: Number(r.quantita || 1),
        provenienza: "Carrello",
      }))
    }

    if (tipoFonte === "bolle") {
      return righeFonte.map(r => ({
        codice: r.codice || "",
        descrizione: r.descrizione || "",
        quantita: Number(r.quantita || 1),
        provenienza: "Bolla",
      }))
    }

    return []
  }, [tipoFonte, preferiti, righeFonte])

  const materialiFiltrati = materialiFonte.filter(m => {
    const testo = normalizza(`${m.codice} ${m.descrizione}`)
    const filtri = [filtro1, filtro2, filtro3, filtro4]
      .map(normalizza)
      .filter(Boolean)

    return filtri.every(f => testo.includes(f))
  })

  function aggiungiMateriale(materiale) {
    const codice = String(materiale.codice || "").trim()
    const descrizione = String(materiale.descrizione || "").trim()

    if (!codice && !descrizione) return

    const esistente = listaOrdine.findIndex(r =>
      chiaveMateriale(r) === chiaveMateriale(materiale)
    )

    if (esistente >= 0) {
      const conferma = window.confirm(
        `⚠️ Questo materiale è già nella lista ordine:\n\n${codice} ${descrizione}\n\nVuoi aggiungerlo di nuovo aumentando la quantità?`
      )

      if (!conferma) return

      const nuova = [...listaOrdine]
      nuova[esistente].quantita =
        Number(nuova[esistente].quantita || 0) + Number(materiale.quantita || 1)
      setListaOrdine(nuova)
      return
    }

    setListaOrdine([
      ...listaOrdine,
      {
        codice,
        descrizione,
        quantita: Number(materiale.quantita || 1),
        provenienza: materiale.provenienza || "Manuale",
      }
    ])
  }

  function aggiungiManuale() {
    if (!manuale.codice && !manuale.descrizione) {
      alert("Inserisci almeno codice o descrizione")
      return
    }

    aggiungiMateriale({
      ...manuale,
      provenienza: "Manuale",
    })

    setManuale({
      codice: "",
      descrizione: "",
      quantita: 1,
    })
  }

  function aggiornaRiga(index, campo, valore) {
    const nuova = [...listaOrdine]
    nuova[index][campo] = valore
    setListaOrdine(nuova)
  }

  function eliminaRiga(index) {
    setListaOrdine(listaOrdine.filter((_, i) => i !== index))
  }

  function svuotaLista() {
    if (!window.confirm("Vuoi svuotare tutta la lista ordine?")) return
    setListaOrdine([])
  }

  async function salvaListaOrdine() {
    if (salvando) return

    if (listaOrdine.length === 0) {
      alert("Inserisci almeno un materiale nella lista ordine")
      return
    }

    setSalvando(true)

    try {
      const { data: listaCreata, error: listaError } = await supabase
        .from("liste_ordine")
        .insert({
          titolo,
          cliente,
          cantiere,
          note
        })
        .select()
        .single()

      if (listaError) {
        console.error(listaError)
        alert("Errore salvataggio lista ordine: " + listaError.message)
        return
      }

      const righeDaSalvare = listaOrdine.map(r => ({
        lista_ordine_id: listaCreata.id,
        codice: r.codice || "",
        descrizione: r.descrizione || "",
        quantita: Number(r.quantita || 0),
        provenienza: r.provenienza || ""
      }))

      const { error: righeError } = await supabase
        .from("liste_ordine_righe")
        .insert(righeDaSalvare)

      if (righeError) {
        console.error(righeError)
        alert("Lista creata, ma errore salvataggio righe: " + righeError.message)
        return
      }

      alert("✅ Lista ordine salvata correttamente")
    } finally {
      setSalvando(false)
    }
  }

  function stampa() {
    window.print()
  }

  return (
    <div style={{ padding: 20 }}>
      <style>
        {`
          .print-only {
            display: none;
          }

          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }

            body * {
              visibility: hidden !important;
            }

            .print-box,
            .print-box * {
              visibility: visible !important;
            }

            .print-box {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
            }

            .no-print {
              display: none !important;
            }

            .print-only {
              display: inline !important;
            }

            table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 12px !important;
            }

            th {
              padding: 4px !important;
              background: #eee !important;
            }

            td {
              padding: 4px !important;
            }

            h1 {
              font-size: 20px !important;
              margin: 0 0 4px 0 !important;
            }

            .print-header {
              margin-bottom: 8px !important;
            }

            tr {
              page-break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="no-print">
        <h2>🧾 Lista materiale da ordinare</h2>

        <div style={box}>
          <h3>Intestazione stampa</h3>

          <input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Titolo" style={input} />

          <div style={grid2}>
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente" style={input} />
            <input value={cantiere} onChange={(e) => setCantiere(e.target.value)} placeholder="Cantiere" style={input} />
          </div>

          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note ordine..." style={{ ...input, minHeight: 70 }} />
        </div>

        <div style={box}>
          <h3>Aggiunta manuale</h3>

          <div style={grid4}>
            <input value={manuale.quantita} onChange={(e) => setManuale({ ...manuale, quantita: e.target.value })} type="number" placeholder="Qta" style={input} />
            <input value={manuale.codice} onChange={(e) => setManuale({ ...manuale, codice: e.target.value })} placeholder="Codice" style={input} />
            <input value={manuale.descrizione} onChange={(e) => setManuale({ ...manuale, descrizione: e.target.value })} placeholder="Descrizione" style={input} />

            <button onClick={aggiungiManuale} style={btnBlu}>
              + Aggiungi
            </button>
          </div>
        </div>

        <div style={box}>
          <h3>Importa da materiali</h3>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={() => { setTipoFonte("preferiti"); setFonteSelezionata(""); setRigheFonte([]); setAiutoRicerca(""); pulisciFiltri() }} style={tipoFonte === "preferiti" ? btnAttivo : btnNormale}>⭐ Preferiti</button>
            <button onClick={() => { setTipoFonte("carrelli"); setFonteSelezionata(""); setRigheFonte([]); setAiutoRicerca(""); pulisciFiltri() }} style={tipoFonte === "carrelli" ? btnAttivo : btnNormale}>🛒 Carrelli</button>
            <button onClick={() => { setTipoFonte("bolle"); setFonteSelezionata(""); setRigheFonte([]); setAiutoRicerca(""); pulisciFiltri() }} style={tipoFonte === "bolle" ? btnAttivo : btnNormale}>📥 Bolle</button>
          </div>

          {tipoFonte === "carrelli" && (
            <select value={fonteSelezionata} onChange={(e) => caricaRigheFonte("carrelli", e.target.value)} style={input}>
              <option value="">-- scegli carrello --</option>
              {carrelli.map(c => (
                <option key={c.id} value={c.id}>
                  {(c.nome_carrello || c.nome || "Carrello")} - {c.data ? new Date(c.data).toLocaleDateString() : ""}
                </option>
              ))}
            </select>
          )}

          {tipoFonte === "bolle" && (
            <select value={fonteSelezionata} onChange={(e) => caricaRigheFonte("bolle", e.target.value)} style={input}>
              <option value="">-- scegli bolla --</option>
              {bolle.map(b => (
                <option key={b.id} value={b.id}>
                  {(b.numero_ddt || b.numero_ordine || b.nome || "Bolla")} - {b.data ? new Date(b.data).toLocaleDateString() : ""}
                </option>
              ))}
            </select>
          )}

          {tipoFonte === "carrelli" && aiutoRicerca && (
            <div style={{ background: "#fff3cd", border: "1px solid #ffe69c", borderRadius: 6, padding: 10, marginTop: 10, marginBottom: 10 }}>
              📝 Ricerca veloce: <b>{aiutoRicerca}</b>
              <div style={{ marginTop: 8 }}>
                <button onClick={usaSuggerimento} style={btnBlu}>⚡ Usa suggerimento</button>
              </div>
            </div>
          )}

          <div style={gridFiltri}>
            <input ref={ref1} value={filtro1} onChange={(e) => setFiltro1(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ref2.current?.focus() }} placeholder="Filtro 1 es. PHL" style={input} />
            <input ref={ref2} value={filtro2} onChange={(e) => setFiltro2(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ref3.current?.focus() }} placeholder="Filtro 2 es. GU" style={input} />
            <input ref={ref3} value={filtro3} onChange={(e) => setFiltro3(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ref4.current?.focus() }} placeholder="Filtro 3 es. 3000" style={input} />
            <input ref={ref4} value={filtro4} onChange={(e) => setFiltro4(e.target.value)} placeholder="Filtro 4 es. 15000" style={input} />
          </div>

          <button onClick={() => { pulisciFiltri(); ref1.current?.focus() }} style={btnNormale}>
            Reset ricerca
          </button>

          <div style={{ marginTop: 10 }}>
            Materiali trovati: <b>{materialiFiltrati.length}</b> — Lista ordine: <b>{listaOrdine.length}</b>
          </div>

          <div style={{ marginTop: 10, maxHeight: 360, overflowY: "auto" }}>
            {materialiFiltrati.map((m, i) => {
              const giaInserito = materialeGiaInserito(m)

              return (
                <div key={`${m.codice}_${m.descrizione}_${i}`} style={{ ...rigaFonteStyle, background: giaInserito ? "#c8e6c9" : "white", border: giaInserito ? "2px solid #198754" : "1px solid #ddd" }}>
                  <div><b>{m.codice || "-"}</b>{giaInserito && <div style={{ color: "#0f5132", fontWeight: "bold", fontSize: 12 }}>✅ già in lista</div>}</div>
                  <div>{m.descrizione || "-"}</div>
                  <div>Qta: {m.quantita || 1}</div>
                  <button onClick={() => aggiungiMateriale(m)} style={giaInserito ? btnGrigio : btnVerde}>{giaInserito ? "+ Aumenta" : "+ Inserisci"}</button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="print-box" style={boxStampa}>
        <div className="print-header" style={{ textAlign: "center", marginBottom: 14 }}>
          <h1>{titolo}</h1>
          <div style={{ fontSize: 13 }}>Data: {new Date().toLocaleDateString()}</div>
        </div>

        {(cliente || cantiere || note) && (
          <div style={{ marginBottom: 10, fontSize: 13 }}>
            {cliente && <span><b>Cliente:</b> {cliente} &nbsp;&nbsp;</span>}
            {cantiere && <span><b>Cantiere:</b> {cantiere} &nbsp;&nbsp;</span>}
            {note && <div><b>Note:</b> {note}</div>}
          </div>
        )}

        <table style={table}>
          <thead>
            <tr>
              <th style={thQta}>Qta</th>
              <th style={thCodice}>Codice</th>
              <th style={th}>Descrizione</th>
              <th className="no-print" style={th}>Provenienza</th>
              <th className="no-print" style={th}>Azioni</th>
            </tr>
          </thead>

          <tbody>
            {listaOrdine.length === 0 && (
              <tr>
                <td colSpan="5" style={tdCenter}>Nessun materiale inserito.</td>
              </tr>
            )}

            {listaOrdine.map((r, index) => (
              <tr key={index}>
                <td style={tdQta}>
                  <input className="no-print" type="number" value={r.quantita} onChange={(e) => aggiornaRiga(index, "quantita", e.target.value)} style={{ width: 70, padding: 5 }} />
                  <span className="print-only">{r.quantita}</span>
                </td>

                <td style={td}>
                  <input className="no-print" value={r.codice} onChange={(e) => aggiornaRiga(index, "codice", e.target.value)} style={inputTabella} />
                  <span className="print-only">{r.codice}</span>
                </td>

                <td style={td}>
                  <input className="no-print" value={r.descrizione} onChange={(e) => aggiornaRiga(index, "descrizione", e.target.value)} style={inputTabella} />
                  <span className="print-only">{r.descrizione}</span>
                </td>

                <td className="no-print" style={td}>{r.provenienza}</td>

                <td className="no-print" style={tdCenter}>
                  <button onClick={() => eliminaRiga(index)} style={btnRosso}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="no-print" style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={salvaListaOrdine} disabled={salvando} style={btnVerde}>
            {salvando ? "Salvataggio..." : "💾 Salva lista ordine"}
          </button>

          <button onClick={stampa} style={btnBlu}>
            🖨 Stampa lista
          </button>

          <button onClick={svuotaLista} style={btnRosso}>
            Svuota lista
          </button>
        </div>
      </div>
    </div>
  )
}

const box = { background: "#f8f9fa", border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 15 }
const boxStampa = { background: "white", border: "1px solid #ddd", borderRadius: 8, padding: 18, marginTop: 10 }
const input = { width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box", marginBottom: 8 }
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }
const grid4 = { display: "grid", gridTemplateColumns: "80px 160px 1fr 130px", gap: 10, alignItems: "center" }
const gridFiltri = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }

const btnBlu = { background: "#0d6efd", color: "white", border: "none", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }
const btnVerde = { background: "#198754", color: "white", border: "none", padding: "7px 10px", borderRadius: 6, cursor: "pointer" }
const btnRosso = { background: "#dc3545", color: "white", border: "none", padding: "7px 10px", borderRadius: 6, cursor: "pointer" }
const btnGrigio = { background: "#6c757d", color: "white", border: "none", padding: "7px 10px", borderRadius: 6, cursor: "pointer" }
const btnNormale = { background: "white", color: "black", border: "1px solid #ccc", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }
const btnAttivo = { background: "#1976d2", color: "white", border: "none", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }

const rigaFonteStyle = { display: "grid", gridTemplateColumns: "150px 1fr 90px 110px", gap: 10, alignItems: "center", padding: 8, marginBottom: 6, borderRadius: 6 }

const table = { width: "100%", borderCollapse: "collapse", fontSize: 14 }
const th = { border: "1px solid #999", padding: 7, background: "#eee", textAlign: "left" }
const thQta = { border: "1px solid #999", padding: 7, background: "#eee", textAlign: "center", width: 65 }
const thCodice = { border: "1px solid #999", padding: 7, background: "#eee", textAlign: "left", width: 150 }
const td = { border: "1px solid #999", padding: 6 }
const tdQta = { border: "1px solid #999", padding: 6, width: 65, textAlign: "center" }
const tdCenter = { border: "1px solid #999", padding: 6, textAlign: "center" }
const inputTabella = { width: "100%", padding: 5, boxSizing: "border-box", border: "1px solid #ccc", borderRadius: 4 }