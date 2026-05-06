import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

export default function OreOperatoriExcelPage() {

  const oggi = new Date()
  const meseDefault = oggi.toISOString().slice(0, 7)

  const [mese, setMese] = useState(meseDefault)
  const [operatoreId, setOperatoreId] = useState("")
  const [operatori, setOperatori] = useState([])

  const [loading, setLoading] = useState(false)
  const [righe, setRighe] = useState([])

  useEffect(() => {
    caricaOperatori()
  }, [])

  async function caricaOperatori() {
    const { data, error } = await supabase
      .from("operatori")
      .select("id, nome")
      .order("nome", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento operatori: " + error.message)
      return
    }

    setOperatori(data || [])
  }

  function getDateRange(meseSelezionato) {
    const [anno, meseNum] = meseSelezionato.split("-").map(Number)

    const inizio = new Date(anno, meseNum - 1, 1)
    const fine = new Date(anno, meseNum, 1)

    return {
      dataDa: inizio.toISOString().slice(0, 10),
      dataA: fine.toISOString().slice(0, 10)
    }
  }

  function formattaData(data) {
    if (!data) return ""
    const [anno, mese, giorno] = data.split("-")
    return `${giorno}/${mese}/${anno}`
  }

  async function caricaDati() {
    if (!mese) {
      alert("Seleziona un mese")
      return
    }

    setLoading(true)

    const { dataDa, dataA } = getDateRange(mese)

    let query = supabase
      .from("ore_operatori")
      .select(`
        id,
        ore,
        operatore_id,
        operatori(nome),
        interventi!inner(
          id,
          data,
          descrizione,
          clienti(nome),
          cantieri(nome)
        )
      `)
      .gte("interventi.data", dataDa)
      .lt("interventi.data", dataA)
      .order("id", { ascending: true })

    if (operatoreId) {
      query = query.eq("operatore_id", operatoreId)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      alert("Errore caricamento ore: " + error.message)
      setLoading(false)
      return
    }

    const dettagli = (data || []).map(r => ({
      data: r.interventi?.data || "",
      data_it: formattaData(r.interventi?.data || ""),
      operatore: r.operatori?.nome || "Senza nome",
      ore: Number(r.ore || 0),
      cliente: r.interventi?.clienti?.nome || "",
      cantiere: r.interventi?.cantieri?.nome || "",
      descrizione: r.interventi?.descrizione || ""
    }))

    setRighe(dettagli)
    setLoading(false)
  }

  function raggruppaPerData(lista) {
    const gruppi = {}

    for (const r of lista) {
      if (!gruppi[r.data]) {
        gruppi[r.data] = []
      }

      gruppi[r.data].push(r)
    }

    return Object.keys(gruppi)
      .sort((a, b) => a.localeCompare(b))
      .map(data => ({
        data,
        data_it: gruppi[data][0]?.data_it || "",
        righe: gruppi[data].sort((a, b) => a.cliente.localeCompare(b.cliente))
      }))
  }

  function applicaBordoCella(cella, tipo = "thin") {
    cella.border = {
      top: { style: tipo },
      left: { style: tipo },
      bottom: { style: tipo },
      right: { style: tipo }
    }
  }

  function applicaBordiRiga(ws, numeroRiga, daColonna = 1, aColonna = 3) {
    for (let c = daColonna; c <= aColonna; c++) {
      applicaBordoCella(ws.getRow(numeroRiga).getCell(c))
    }
  }

  async function esportaExcel() {
    if (!righe.length) {
      alert("Prima carica i dati del mese")
      return
    }

    const [anno, meseNum] = mese.split("-")

    const nomeOperatore = operatoreId
      ? operatori.find(o => String(o.id) === String(operatoreId))?.nome || "Operatore"
      : "Tutti"

    const nomePulito = nomeOperatore
      .replaceAll(" ", "_")
      .replaceAll("/", "-")

    const nomeFile = `Ore_${nomePulito}_${meseNum}_${anno}.xlsx`

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Ore")

    ws.pageSetup = {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2
      }
    }

    ws.headerFooter.oddFooter = "Pagina &P di &N"

    ws.columns = [
      { header: "Data", key: "data", width: 16 },
      { header: "Ore", key: "ore", width: 10 },
      { header: "Cliente", key: "cliente", width: 48 }
    ]

    ws.views = [
      { state: "frozen", ySplit: 1 }
    ]

    ws.getRow(1).values = ["Data", "Ore", "Cliente"]
    ws.getRow(1).height = 22

    for (let c = 1; c <= 3; c++) {
      const cell = ws.getRow(1).getCell(c)
      cell.font = { bold: true }
      cell.alignment = { horizontal: "center", vertical: "middle" }
      applicaBordoCella(cell, "thin")
    }

    const gruppi = raggruppaPerData(righe)

    let rigaExcel = 3
    let righeUsatePagina = 2

    const righePerPagina = 34

    for (const gruppo of gruppi) {
      const righeGruppo = gruppo.righe.length
      const spazioGruppo = righeGruppo + 2

      if (righeUsatePagina + spazioGruppo > righePerPagina) {
        ws.addPageBreak(rigaExcel - 1)

        while (righeUsatePagina < righePerPagina) {
          ws.getRow(rigaExcel).height = 18
          rigaExcel++
          righeUsatePagina++
        }

        righeUsatePagina = 0
      }

      const primaRigaGruppo = rigaExcel

      for (const r of gruppo.righe) {
        ws.getRow(rigaExcel).height = 20

        ws.getCell(`A${rigaExcel}`).value = r.data_it
        ws.getCell(`B${rigaExcel}`).value = r.ore
        ws.getCell(`C${rigaExcel}`).value = r.cliente || "-"

        ws.getCell(`A${rigaExcel}`).alignment = {
          horizontal: "center",
          vertical: "middle"
        }

        ws.getCell(`B${rigaExcel}`).alignment = {
          horizontal: "center",
          vertical: "middle"
        }

        ws.getCell(`C${rigaExcel}`).alignment = {
          horizontal: "center",
          vertical: "middle"
        }

        applicaBordiRiga(ws, rigaExcel)

        rigaExcel++
        righeUsatePagina++
      }

      const ultimaRigaGruppo = rigaExcel - 1

      for (let c = 1; c <= 3; c++) {
        ws.getRow(primaRigaGruppo).getCell(c).border = {
          ...ws.getRow(primaRigaGruppo).getCell(c).border,
          top: { style: "medium" }
        }

        ws.getRow(ultimaRigaGruppo).getCell(c).border = {
          ...ws.getRow(ultimaRigaGruppo).getCell(c).border,
          bottom: { style: "medium" }
        }
      }

      for (let r = primaRigaGruppo; r <= ultimaRigaGruppo; r++) {
        ws.getRow(r).getCell(1).border = {
          ...ws.getRow(r).getCell(1).border,
          left: { style: "medium" }
        }

        ws.getRow(r).getCell(3).border = {
          ...ws.getRow(r).getCell(3).border,
          right: { style: "medium" }
        }
      }

      ws.getRow(rigaExcel).height = 14
      rigaExcel++
      righeUsatePagina++
    }

    const totaleOre = righe.reduce((tot, r) => tot + Number(r.ore || 0), 0)

    rigaExcel++

    ws.getCell(`A${rigaExcel}`).value = "Totale ore"
    ws.getCell(`B${rigaExcel}`).value = totaleOre
    ws.getCell(`A${rigaExcel}`).font = { bold: true }
    ws.getCell(`B${rigaExcel}`).font = { bold: true }
    ws.getCell(`A${rigaExcel}`).alignment = { horizontal: "right" }
    ws.getCell(`B${rigaExcel}`).alignment = { horizontal: "center" }

    applicaBordoCella(ws.getCell(`A${rigaExcel}`), "medium")
    applicaBordoCella(ws.getCell(`B${rigaExcel}`), "medium")

    ws.pageSetup.printArea = `A1:C${rigaExcel}`

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    })

    saveAs(blob, nomeFile)
  }

  const totaleOre = righe.reduce((tot, r) => tot + Number(r.ore || 0), 0)

  const righeOrdinatePagina = [...righe].sort((a, b) => {
    if (a.data === b.data) {
      return a.cliente.localeCompare(b.cliente)
    }

    return a.data.localeCompare(b.data)
  })

  return (
    <div style={{ padding: 20 }}>

      <h2>📊 Ore Mese Operatori</h2>

      <div style={{
        background: "#f8f9fa",
        border: "1px solid #ddd",
        padding: 10,
        borderRadius: 6,
        marginBottom: 15
      }}>
        Seleziona mese e operatore. L’Excel viene esportato con cornici per giorno, righe sottolineate, tabella centrata e numerazione pagine.
      </div>

      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <input
          type="month"
          value={mese}
          onChange={(e) => {
            setMese(e.target.value)
            setRighe([])
          }}
          style={{
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 5
          }}
        />

        <select
          value={operatoreId}
          onChange={(e) => {
            setOperatoreId(e.target.value)
            setRighe([])
          }}
          style={{
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 5,
            minWidth: 220
          }}
        >
          <option value="">Tutti gli operatori</option>
          {operatori.map(o => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>

        <button
          onClick={caricaDati}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 5,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Caricamento..." : "🔍 Carica ore"}
        </button>

        <button
          onClick={esportaExcel}
          disabled={!righe.length}
          style={{
            padding: "8px 12px",
            borderRadius: 5,
            cursor: !righe.length ? "not-allowed" : "pointer",
            background: righe.length ? "#198754" : "#ccc",
            color: "white",
            border: "none"
          }}
        >
          📥 Esporta Excel
        </button>
      </div>

      <div style={{
        marginTop: 20,
        padding: 10,
        border: "1px solid #ddd",
        borderRadius: 6,
        background: "white"
      }}>
        Totale righe: <b>{righe.length}</b> — Totale ore: <b>{totaleOre}</b>
      </div>

      <h3 style={{ marginTop: 25 }}>Dettaglio</h3>

      {righe.length === 0 && (
        <div style={{
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "white"
        }}>
          Nessun dato caricato.
        </div>
      )}

      {righeOrdinatePagina.map((r, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #ddd",
            padding: 8,
            borderRadius: 6,
            marginTop: 6,
            background: "white"
          }}
        >
          <div>
            <b>Data:</b> {r.data_it} — <b>Ore:</b> {r.ore} — <b>Cliente:</b> {r.cliente || "-"}
          </div>
          <div>
            Operatore: {r.operatore}
          </div>
          <div>
            Cantiere: {r.cantiere || "-"}
          </div>
          <div>
            {r.descrizione}
          </div>
        </div>
      ))}

    </div>
  )
}