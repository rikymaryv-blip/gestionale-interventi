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
    const { data } = await supabase
      .from("fatture")
      .select("*")
      .order("id", { ascending: false })

    setFatture(data || [])

    // 🔥 LISTA CLIENTI PER SUGGERIMENTI
    const clienti = [...new Set((data || []).map(f => f.cliente_nome))]
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

    const { data: righe } = await supabase
      .from("fatture_righe")
      .select("*")
      .eq("fattura_id", f.id)

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
    await supabase
      .from("fatture")
      .update({ pagata: true })
      .eq("id", f.id)

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

          </div>

        </div>
      ))}

    </div>
  )
}