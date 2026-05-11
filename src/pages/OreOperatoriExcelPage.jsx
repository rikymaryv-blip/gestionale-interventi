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

    dettagli.sort((a, b) => {
      if (a.data === b.data) {
        return a.descrizione.localeCompare(b.descrizione)
      }

      return a.data.localeCompare(b.data)
    })

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
        righe: gruppi[data].sort((a, b) => {
          if (a.descrizione === b.descrizione) {
            return a.operatore.localeCompare(b.operatore)
          }

          return a.descrizione.localeCompare(b.descrizione)
        })
      }))
  }

  function applicaBordoCella(cella, tipo = "thin", colore = "D0D7DE") {
    cella.border = {
      top: { style: tipo, color: { argb: colore } },
      left: { style: tipo, color: { argb: colore } },
      bottom: { style: tipo, color: { argb: colore } },
      right: { style: tipo, color: { argb: colore } }
    }
  }

  function stileIntestazione(cella) {
    cella.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11
    }

    cella.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E78" }
    }

    cella.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    }

    applicaBordoCella(cella, "thin", "FF1F4E78")
  }

  function stileCellaNormale(cella, allineamento = "left") {
    cella.font = {
      size: 11,
      color: { argb: "FF000000" }
    }

    cella.alignment = {
      horizontal: allineamento,
      vertical: "middle",
      wrapText: true
    }

    applicaBordoCella(cella)
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
    const ws = wb.addWorksheet("Ore lavorate")

    ws.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2
      }
    }

    ws.headerFooter.oddFooter = "Pagina &P di &N"

    ws.columns = [
      { key: "data", width: 14 },
      { key: "descrizione", width: 70 },
      { key: "operatore", width: 24 },
      { key: "ore", width: 10 }
    ]

    ws.views = [
      { state: "frozen", ySplit: 7 }
    ]

    ws.mergeCells("A1:D1")
    ws.getCell("A1").value = "RIEPILOGO ORE LAVORATE"
    ws.getCell("A1").font = {
      bold: true,
      size: 18,
      color: { argb: "FF1F4E78" }
    }
    ws.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle"
    }
    ws.getRow(1).height = 30

    ws.getCell("A3").value = "Mese:"
    ws.getCell("B3").value = `${meseNum}/${anno}`
    ws.getCell("A4").value = "Operatore:"
    ws.getCell("B4").value = nomeOperatore

    ws.getCell("A3").font = { bold: true }
    ws.getCell("A4").font = { bold: true }

    ws.getCell("B3").font = { bold: true }
    ws.getCell("B4").font = { bold: true }

    ws.getRow(6).values = ["Data", "Descrizione", "Operatore", "Ore"]
    ws.getRow(6).height = 24

    for (let c = 1; c <= 4; c++) {
      stileIntestazione(ws.getRow(6).getCell(c))
    }

    const gruppi = raggruppaPerData(righe)

    let rigaExcel = 7

    for (const gruppo of gruppi) {
      for (const r of gruppo.righe) {
        const row = ws.getRow(rigaExcel)

        row.height = 30

        row.getCell(1).value = r.data_it
        row.getCell(2).value = r.descrizione || "-"
        row.getCell(3).value = r.operatore || "-"
        row.getCell(4).value = r.ore

        stileCellaNormale(row.getCell(1), "center")
        stileCellaNormale(row.getCell(2), "left")
        stileCellaNormale(row.getCell(3), "center")
        stileCellaNormale(row.getCell(4), "center")

        rigaExcel++
      }

      ws.getRow(rigaExcel).height = 12
      rigaExcel++
    }

    const totaleOre = righe.reduce((tot, r) => tot + Number(r.ore || 0), 0)

    rigaExcel++

    ws.mergeCells(`A${rigaExcel}:C${rigaExcel}`)
    ws.getCell(`A${rigaExcel}`).value = "TOTALE ORE"
    ws.getCell(`D${rigaExcel}`).value = totaleOre

    ws.getCell(`A${rigaExcel}`).font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFFFF" }
    }

    ws.getCell(`D${rigaExcel}`).font = {
      bold: true,
      size: 12,
      color: { argb: "FFFFFFFF" }
    }

    ws.getCell(`A${rigaExcel}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF198754" }
    }

    ws.getCell(`D${rigaExcel}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF198754" }
    }

    ws.getCell(`A${rigaExcel}`).alignment = {
      horizontal: "right",
      vertical: "middle"
    }

    ws.getCell(`D${rigaExcel}`).alignment = {
      horizontal: "center",
      vertical: "middle"
    }

    for (let c = 1; c <= 4; c++) {
      applicaBordoCella(ws.getRow(rigaExcel).getCell(c), "medium", "FF198754")
    }

    ws.getRow(rigaExcel).height = 26

    ws.autoFilter = {
      from: "A6",
      to: `D${rigaExcel - 2}`
    }

    ws.pageSetup.printArea = `A1:D${rigaExcel}`

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    })

    saveAs(blob, nomeFile)
  }

  const totaleOre = righe.reduce((tot, r) => tot + Number(r.ore || 0), 0)

  const righeOrdinatePagina = [...righe].sort((a, b) => {
    if (a.data === b.data) {
      return a.descrizione.localeCompare(b.descrizione)
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
        Excel ordinato per data, con spazio tra una data e l’altra, colonne larghe, descrizioni leggibili e stampa in larghezza.
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