import { useEffect, useState, useMemo } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../supabaseClient"   // ✅ CORRETTO
import * as XLSX from "xlsx"

dayjs.locale("it")

export default function CalendarMonth() {
  const [operatori, setOperatori] = useState([])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [oreMese, setOreMese] = useState([])

  const oggi = dayjs()
  const meseCorrente = oggi.format("MMMM YYYY")
  const giorniNelMese = oggi.daysInMonth()
  const annoMese = oggi.format("YYYY-MM")

  useEffect(() => {
    loadOperatori()
  }, [])

  useEffect(() => {
    if (selectedOperator) {
      loadOre()
    } else {
      setOreMese([])
    }
  }, [selectedOperator])

  async function loadOperatori() {
    const { data } = await supabase
      .from("operatori")
      .select("*")
      .order("nome", { ascending: true })

    setOperatori(data || [])
  }

  async function loadOre() {
    const start = oggi.startOf("month").format("YYYY-MM-DD")
    const end = oggi.endOf("month").format("YYYY-MM-DD")

    const { data } = await supabase
      .from("vista_ore_giornaliere")
      .select("*")
      .eq("operatore", selectedOperator)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: true })

    setOreMese(data || [])
  }

  const oreMap = useMemo(() => {
    const map = {}
    oreMese.forEach(item => {
      const dataPulita = String(item.data).substring(0, 10)
      map[dataPulita] = Number(item.ore)
    })
    return map
  }, [oreMese])

  function getColore(giornoCompleto) {
    const ore = oreMap[giornoCompleto]
    if (ore == null) return "#ffffff"
    if (ore > 8) return "#f8d7da"
    if (ore === 8) return "#d4edda"
    return "#fff3cd"
  }

  async function exportToExcel() {
    if (!selectedOperator) {
      alert("Seleziona un operatore prima di esportare.")
      return
    }

    const start = oggi.startOf("month").format("YYYY-MM-DD")
    const end = oggi.endOf("month").format("YYYY-MM-DD")

    const { data, error } = await supabase
      .from("ore_operatori")
      .select(`
        ore,
        interventi (
          data,
          descrizione,
          clienti ( nome )
        ),
        operatori ( nome )
      `)
      .eq("operatori.nome", selectedOperator)
      .gte("interventi.data", start)
      .lte("interventi.data", end)
      .order("intervento_id", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore durante esportazione - guarda console")
      return
    }

    const datiExport = data.map(item => ({
      Data: dayjs(item.interventi.data).format("DD/MM/YYYY"),
      Cliente: item.interventi.clienti?.nome || "",
      Descrizione: item.interventi.descrizione || "",
      Operatore: item.operatori?.nome || "",
      Ore: Number(item.ore)
    }))

    const totaleOre = datiExport.reduce((sum, r) => sum + r.Ore, 0)

    datiExport.push({})
    datiExport.push({
      Data: "TOTALE",
      Ore: totaleOre
    })

    const worksheet = XLSX.utils.json_to_sheet(datiExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Interventi")

    XLSX.writeFile(
      workbook,
      `Interventi_${selectedOperator}_${annoMese}.xlsx`
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: "10px" }}>
        Calendario mese di {meseCorrente}
      </h2>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ marginRight: "10px" }}>
          Seleziona operatore:
        </label>

        <select
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
        >
          <option value="">-- Seleziona --</option>
          {operatori.map(op => (
            <option key={op.id} value={op.nome}>
              {op.nome}
            </option>
          ))}
        </select>

        <button
          onClick={exportToExcel}
          style={{
            marginLeft: "15px",
            padding: "6px 12px",
            cursor: "pointer"
          }}
        >
          Esporta Excel
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "6px"
        }}
      >
        {Array.from({ length: giorniNelMese }).map((_, i) => {
          const giornoNumero = String(i + 1).padStart(2, "0")
          const dataCompleta = `${annoMese}-${giornoNumero}`
          const dataFormattata = dayjs(dataCompleta).format("DD/MM/YYYY")
          const ore = oreMap[dataCompleta] || 0

          return (
            <div
              key={dataCompleta}
              style={{
                padding: "12px",
                backgroundColor: getColore(dataCompleta),
                border: "1px solid #ccc",
                borderRadius: "6px",
                textAlign: "center",
                fontSize: "14px"
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {giornoNumero}
              </div>
              <div style={{ fontSize: "12px" }}>
                {dataFormattata}
              </div>
              <div style={{ marginTop: "4px", fontSize: "13px" }}>
                {ore} h
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}