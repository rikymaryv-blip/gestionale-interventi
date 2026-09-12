import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import * as XLSX from "xlsx"

export default function StoricoFatturePage() {

  const [fatture, setFatture] = useState([])
  const [clienteFiltro, setClienteFiltro] = useState("")
  const [dataDa, setDataDa] = useState("")
  const [dataA, setDataA] = useState("")

  const [clientiUnici, setClientiUnici] = useState([])
  const [showSuggerimenti, setShowSuggerimenti] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data, error } = await supabase
      .from("fatture")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      console.error("ERRORE LOAD FATTURE:", error)
      alert("Errore caricamento storico fatture")
      return
    }

    setFatture(data || [])

    // 🔥 LISTA CLIENTI PER SUGGERIMENTI
    const clienti = [...new Set((data || []).map(f => f.cliente_nome).filter(Boolean))]
    setClientiUnici(clienti)
  }

  // 🔥 FILTRO
  const fattureFiltrate = fatture.filter(f => {

    const matchCliente =
      f.cliente_nome?.toLowerCase().includes(clienteFiltro.toLowerCase())

    const dataFattura = new Date(f.data)

    const matchDataDa = dataDa ? dataFattura >= new Date(dataDa) : true
    const matchDataA = dataA ? dataFattura <= new Date(dataA) : true

    return matchCliente && matchDataDa && matchDataA
  })

  // PDF
  function generaPDF(f) {
    window.open(`/fattura/${f.id}`, "_blank")
  }

  // EXCEL
  async function generaExcel(f) {

    const { data: righe, error } = await supabase
      .from("fatture_righe")
      .select("*")
      .eq("fattura_id", f.id)

    if (error) {
      console.error("ERRORE EXCEL:", error)
      alert("Errore caricamento righe fattura")
      return
    }

    const operatori = (righe || []).filter(r => r.ore)
    const materiali = (righe || []).filter(r => r.quantita)

    const rows = []

    rows.push([`FATTURA n° ${f.id}`])
    rows.push([])
    rows.push(["Cliente:", f.cliente_nome])
    rows.push(["Data:", new Date(f.data).toLocaleDateString()])
    rows.push([])
    rows.push([])

    // ORE
    rows.push(["ORE LAVORATE"])
    rows.push(["Data", "Descrizione", "Operatore", "Ore"])

    operatori.forEach(o => {
      rows.push([
        o.data ? new Date(o.data).toLocaleDateString() : "",
        o.descrizione || "",
        o.operatore || "",
        o.ore || 0
      ])
    })

    rows.push([])
    rows.push([])

    // MATERIALI
    rows.push(["MATERIALI"])
    rows.push(["Qta", "Codice", "Descrizione"])

    materiali.forEach(m => {
      rows.push([
        m.quantita || 0,
        m.codice || "",
        m.materiale || ""
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)

    ws["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
      { wch: 10 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Fattura")

    XLSX.writeFile(wb, `fattura_${f.id}.xlsx`)
  }

  async function segnaPagata(f) {
    const { error } = await supabase
      .from("fatture")
      .update({ pagata: true })
      .eq("id", f.id)

    if (error) {
      console.error("ERRORE PAGATA:", error)
      alert("Errore aggiornamento fattura pagata")
      return
    }

    load()
  }

  async function eliminaFattura(f) {
    const conferma = window.prompt(
      `ATTENZIONE!\n\nStai eliminando la fattura ${f.id} di ${f.cliente_nome}.\nGli interventi collegati torneranno da fatturare.\n\nPer confermare scrivi ELIMINA`
    )

    if (conferma !== "ELIMINA") return

    // 1) Recupero gli interventi collegati dalle righe della fattura
    const { data: righe, error: erroreRighe } = await supabase
      .from("fatture_righe")
      .select("intervento_id")
      .eq("fattura_id", f.id)

    if (erroreRighe) {
      console.error("ERRORE RECUPERO RIGHE:", erroreRighe)
      alert("Errore recupero interventi collegati: " + erroreRighe.message)
      return
    }

    const idsInterventi = [
      ...new Set(
        (righe || [])
          .map(r => r.intervento_id)
          .filter(Boolean)
      )
    ]

    // 2) Ripristino gli interventi collegati
    if (idsInterventi.length > 0) {
      const { error: erroreRipristino } = await supabase
        .from("interventi")
        .update({ archiviato: false })
        .in("id", idsInterventi)

      if (erroreRipristino) {
        console.error("ERRORE RIPRISTINO INTERVENTI:", erroreRipristino)
        alert("Errore ripristino interventi: " + erroreRipristino.message)
        return
      }
    }

    // 3) Elimino le righe della fattura
    const { error: erroreEliminaRighe } = await supabase
      .from("fatture_righe")
      .delete()
      .eq("fattura_id", f.id)

    if (erroreEliminaRighe) {
      console.error("ERRORE ELIMINA RIGHE:", erroreEliminaRighe)
      alert("Interventi ripristinati, ma errore eliminazione righe fattura: " + erroreEliminaRighe.message)
      return
    }

    // 4) Elimino la fattura
    const { error: erroreEliminaFattura } = await supabase
      .from("fatture")
      .delete()
      .eq("id", f.id)

    if (erroreEliminaFattura) {
      console.error("ERRORE ELIMINA FATTURA:", erroreEliminaFattura)
      alert("Righe eliminate, ma errore eliminazione fattura: " + erroreEliminaFattura.message)
      return
    }

    alert("✅ Fattura eliminata e interventi ripristinati")

    load()
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>📜 Storico Fatture</h2>

      {/* 🔍 FILTRI */}
      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 20
      }}>

        {/* 🔥 INPUT CON SUGGERIMENTI */}
        <div style={{ position: "relative" }}>

          <input
            placeholder="🔍 Cerca cliente"
            value={clienteFiltro}
            onChange={(e) => {
              setClienteFiltro(e.target.value)
              setShowSuggerimenti(true)
            }}
            onFocus={() => setShowSuggerimenti(true)}
            onBlur={() => setTimeout(() => setShowSuggerimenti(false), 200)}
          />

          {showSuggerimenti && clienteFiltro && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "white",
              border: "1px solid #ccc",
              zIndex: 10,
              maxHeight: 150,
              overflowY: "auto"
            }}>
              {clientiUnici
                .filter(c =>
                  c.toLowerCase().includes(clienteFiltro.toLowerCase())
                )
                .slice(0, 10)
                .map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 6,
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      setClienteFiltro(c)
                      setShowSuggerimenti(false)
                    }}
                  >
                    {c}
                  </div>
                ))}
            </div>
          )}

        </div>

        <div>
          Da:
          <input
            type="date"
            value={dataDa}
            onChange={(e) => setDataDa(e.target.value)}
          />
        </div>

        <div>
          A:
          <input
            type="date"
            value={dataA}
            onChange={(e) => setDataA(e.target.value)}
          />
        </div>

        <button onClick={() => {
          setClienteFiltro("")
          setDataDa("")
          setDataA("")
        }}>
          🔄 Reset
        </button>

      </div>

      {/* LISTA */}
      {fattureFiltrate.map(f => (
        <div key={f.id} style={{
          border: "1px solid #ccc",
          marginTop: 10,
          padding: 10,
          background: f.pagata ? "#e8f5e9" : "white",
          borderRadius: 6
        }}>

          <div><b>Cliente:</b> {f.cliente_nome}</div>
          <div><b>Data:</b> {new Date(f.data).toLocaleDateString()}</div>
          <div><b>Stato:</b> {f.pagata ? "Pagata" : "Da pagare"}</div>

          <div style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            flexWrap: "wrap"
          }}>

            <button onClick={() => navigate(`/fattura/${f.id}`)}>
              👁 Apri
            </button>

            <button onClick={() => generaPDF(f)}>
              📄 PDF
            </button>

            <button onClick={() => generaExcel(f)}>
              📊 Excel
            </button>

            {!f.pagata && (
              <button onClick={() => segnaPagata(f)}>
                💰 Pagata
              </button>
            )}

            <button
              onClick={() => eliminaFattura(f)}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "6px 10px",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              🗑 Elimina
            </button>

          </div>

        </div>
      ))}

    </div>
  )
}
