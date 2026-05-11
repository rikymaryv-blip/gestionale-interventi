import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

export default function FatturaDettaglioPage() {

  const { id } = useParams()
  const navigate = useNavigate()

  const [fattura, setFattura] = useState(null)
  const [righe, setRighe] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {

    const { data: f } = await supabase
      .from("fatture")
      .select("*")
      .eq("id", id)
      .single()

    const { data: r } = await supabase
      .from("fatture_righe")
      .select("*")
      .eq("fattura_id", id)

    setFattura(f)
    setRighe(r || [])
  }

  function stampaPDF() {
    window.print()
  }

  function formattaData(data) {
    if (!data) return "-"
    return dayjs(data).format("DD/MM/YYYY")
  }

  const operatori = righe
    .filter(r => r.ore)
    .sort((a, b) => {
      if (a.data === b.data) return String(a.operatore || "").localeCompare(String(b.operatore || ""))
      return String(a.data || "").localeCompare(String(b.data || ""))
    })

  const materiali = righe
    .filter(r => r.quantita)
    .sort((a, b) => String(a.materiale || "").localeCompare(String(b.materiale || "")))

  async function esportaExcel() {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet("Fattura")

    ws.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2
      }
    }

    ws.columns = [
      { key: "data", width: 14 },
      { key: "descrizione", width: 65 },
      { key: "operatore", width: 24 },
      { key: "ore", width: 10 },
      { key: "qta", width: 10 },
      { key: "codice", width: 22 },
      { key: "materiale", width: 55 }
    ]

    ws.mergeCells("A1:G1")
    ws.getCell("A1").value = "F.LLI BATTISTUZZI SNC"
    ws.getCell("A1").font = { bold: true, size: 18, color: { argb: "FF1F4E78" } }
    ws.getCell("A1").alignment = { horizontal: "center" }

    ws.mergeCells("A2:G2")
    ws.getCell("A2").value = "FATTURA / RIEPILOGO INTERVENTI"
    ws.getCell("A2").font = { bold: true, size: 15 }
    ws.getCell("A2").alignment = { horizontal: "center" }

    ws.getCell("A4").value = "Data documento:"
    ws.getCell("B4").value = formattaData(fattura?.data)
    ws.getCell("A5").value = "Cliente:"
    ws.getCell("B5").value = fattura?.cliente_nome || "-"

    ws.getCell("A4").font = { bold: true }
    ws.getCell("A5").font = { bold: true }

    let row = 7

    ws.mergeCells(`A${row}:G${row}`)
    ws.getCell(`A${row}`).value = "ORE LAVORATE"
    ws.getCell(`A${row}`).font = { bold: true, color: { argb: "FFFFFFFF" } }
    ws.getCell(`A${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } }
    row++

    ws.getRow(row).values = ["Data", "Descrizione", "Operatore", "Ore"]
    for (let c = 1; c <= 4; c++) stileHeader(ws.getRow(row).getCell(c))
    row++

    let ultimaData = ""

    operatori.forEach(o => {
      const dataIt = formattaData(o.data)

      if (ultimaData && ultimaData !== dataIt) {
        row++
      }

      ws.getCell(`A${row}`).value = dataIt
      ws.getCell(`B${row}`).value = o.descrizione || "-"
      ws.getCell(`C${row}`).value = o.operatore || "Operatore"
      ws.getCell(`D${row}`).value = Number(o.ore || 0)

      stileNormale(ws.getCell(`A${row}`), "center")
      stileNormale(ws.getCell(`B${row}`), "left")
      stileNormale(ws.getCell(`C${row}`), "center")
      stileNormale(ws.getCell(`D${row}`), "center")

      ws.getRow(row).height = 32

      ultimaData = dataIt
      row++
    })

    const totaleOre = operatori.reduce((tot, r) => tot + Number(r.ore || 0), 0)

    row++
    ws.mergeCells(`A${row}:C${row}`)
    ws.getCell(`A${row}`).value = "TOTALE ORE"
    ws.getCell(`D${row}`).value = totaleOre
    stileTotale(ws.getCell(`A${row}`))
    stileTotale(ws.getCell(`D${row}`))
    row += 3

    ws.mergeCells(`A${row}:G${row}`)
    ws.getCell(`A${row}`).value = "MATERIALI"
    ws.getCell(`A${row}`).font = { bold: true, color: { argb: "FFFFFFFF" } }
    ws.getCell(`A${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } }
    row++

    ws.getRow(row).values = ["", "", "", "", "Qta", "Codice", "Descrizione materiale"]
    for (let c = 5; c <= 7; c++) stileHeader(ws.getRow(row).getCell(c))
    row++

    materiali.forEach(m => {
      ws.getCell(`E${row}`).value = Number(m.quantita || 0)
      ws.getCell(`F${row}`).value = m.codice || "-"
      ws.getCell(`G${row}`).value = m.materiale || "-"

      stileNormale(ws.getCell(`E${row}`), "center")
      stileNormale(ws.getCell(`F${row}`), "center")
      stileNormale(ws.getCell(`G${row}`), "left")

      ws.getRow(row).height = 28
      row++
    })

    ws.pageSetup.printArea = `A1:G${row}`

    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    })

    const nomeFile = `Fattura_${fattura?.id || id}_${fattura?.cliente_nome || "cliente"}.xlsx`
      .replaceAll(" ", "_")
      .replaceAll("/", "-")

    saveAs(blob, nomeFile)
  }

  function stileHeader(cell) {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } }
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.border = bordo("FF1F4E78")
  }

  function stileNormale(cell, horizontal = "left") {
    cell.alignment = { horizontal, vertical: "middle", wrapText: true }
    cell.border = bordo("FFD0D7DE")
  }

  function stileTotale(cell) {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF198754" } }
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = bordo("FF198754")
  }

  function bordo(colore) {
    return {
      top: { style: "thin", color: { argb: colore } },
      left: { style: "thin", color: { argb: colore } },
      bottom: { style: "thin", color: { argb: colore } },
      right: { style: "thin", color: { argb: colore } }
    }
  }

  return (
    <div style={{ padding: 20 }}>

      <div style={{ marginBottom: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={stampaPDF}>📄 PDF</button>
        <button onClick={esportaExcel}>📥 Excel elegante</button>
        <button onClick={() => navigate(-1)}>← Indietro</button>
      </div>

      <div id="pdf" style={{
        maxWidth: 800,
        margin: "auto",
        background: "white",
        padding: 30
      }}>

        <div style={{ marginBottom: 20 }}>
          <b>F.LLI BATTISTUZZI SNC</b><br />
          Via S. Giuseppe, 44<br />
          31015 Conegliano TV<br /><br />
          info@fillibattistuzzi-impianti.com<br />
          Tel: 0438 411691
        </div>

        <h2 style={{ textAlign: "center" }}>FATTURA</h2>

        <br />

        <div><b>Data documento:</b> {formattaData(fattura?.data)}</div>
        <div><b>Cliente:</b> {fattura?.cliente_nome}</div>

        <br />

        <div>
          <b>Ore lavorate</b>

          {operatori.map((o, i) => {
            const dataPrec = i > 0 ? operatori[i - 1]?.data : null
            const spazio = dataPrec && dataPrec !== o.data

            return (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 180px 70px",
                gap: 10,
                marginTop: spazio ? 18 : 6,
                borderBottom: "1px solid #ddd",
                paddingBottom: 5
              }}>
                <span>{formattaData(o.data)}</span>
                <span>{o.descrizione || "-"}</span>
                <span>{o.operatore || "Operatore"}</span>
                <b>{o.ore} h</b>
              </div>
            )
          })}
        </div>

        <br />

        <div>
          <b>Materiali</b>

          <table style={{
            width: "100%",
            marginTop: 10,
            borderCollapse: "collapse"
          }}>
            <thead>
              <tr style={{
                textAlign: "left",
                borderBottom: "2px solid #000"
              }}>
                <th style={{ width: 60 }}>Qta</th>
                <th style={{ width: 180 }}>Codice</th>
                <th>Descrizione</th>
              </tr>
            </thead>

            <tbody>
              {materiali.map((m, i) => (
                <tr key={i} style={{
                  borderBottom: "1px solid #ddd"
                }}>
                  <td>{m.quantita}</td>
                  <td style={{ fontFamily: "monospace" }}>
                    {m.codice || "-"}
                  </td>
                  <td>{m.materiale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }

            #pdf, #pdf * {
              visibility: visible;
            }

            #pdf {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}
      </style>

    </div>
  )
}