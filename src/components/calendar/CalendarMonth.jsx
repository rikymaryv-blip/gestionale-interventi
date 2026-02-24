import { useEffect, useState, useMemo } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../../supabaseClient"
import * as XLSX from "xlsx"

dayjs.locale("it")

export default function CalendarMonth() {
  const [operatori, setOperatori] = useState([])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [oreMese, setOreMese] = useState([])
  const [currentDate, setCurrentDate] = useState(dayjs())
  const [giornoSelezionato, setGiornoSelezionato] = useState(null)
  const [interventiGiorno, setInterventiGiorno] = useState([])

  const meseCorrente = currentDate.format("MMMM YYYY")
  const giorniNelMese = currentDate.daysInMonth()
  const annoMese = currentDate.format("YYYY-MM")

  useEffect(() => {
    loadOperatori()
  }, [])

  useEffect(() => {
    if (selectedOperator) {
      loadOre()
    } else {
      setOreMese([])
    }
  }, [selectedOperator, currentDate])

  async function loadOperatori() {
    const { data } = await supabase
      .from("operatori")
      .select("*")
      .order("nome", { ascending: true })

    setOperatori(data || [])
  }

  async function loadOre() {
    const start = currentDate.startOf("month").format("YYYY-MM-DD")
    const end = currentDate.endOf("month").format("YYYY-MM-DD")

    const { data } = await supabase
      .from("vista_ore_giornaliere")
      .select("*")
      .eq("operatore", selectedOperator)
      .gte("data", start)
      .lte("data", end)
      .order("data", { ascending: true })

    setOreMese(data || [])
  }

  async function loadInterventiGiorno(dataCompleta) {
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
      .eq("interventi.data", dataCompleta)

    if (error) {
      console.error(error)
      return
    }

    setInterventiGiorno(data || [])
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

  function cambiaMese(offset) {
    setCurrentDate(currentDate.add(offset, "month"))
    setGiornoSelezionato(null)
    setInterventiGiorno([])
  }

  return (
    <div>
      {/* NAVIGAZIONE MESE */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
        <button onClick={() => cambiaMese(-1)}>◀</button>
        <h2>{meseCorrente}</h2>
        <button onClick={() => cambiaMese(1)}>▶</button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label>Seleziona operatore: </label>

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
      </div>

      {/* CALENDARIO */}
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
          const ore = oreMap[dataCompleta] || 0

          return (
            <div
              key={dataCompleta}
              onClick={() => {
                setGiornoSelezionato(dataCompleta)
                loadInterventiGiorno(dataCompleta)
              }}
              style={{
                padding: "12px",
                backgroundColor: getColore(dataCompleta),
                border: "1px solid #ccc",
                borderRadius: "6px",
                textAlign: "center",
                cursor: "pointer"
              }}
            >
              <div><strong>{giornoNumero}</strong></div>
              <div>{ore} h</div>
            </div>
          )
        })}
      </div>

      {/* DETTAGLIO GIORNO */}
      {giornoSelezionato && (
        <div style={{ marginTop: "30px" }}>
          <h3>Interventi del {dayjs(giornoSelezionato).format("DD/MM/YYYY")}</h3>

          {interventiGiorno.length === 0 && (
            <p>Nessun intervento registrato</p>
          )}

          {interventiGiorno.map((item, index) => (
            <div key={index} style={{
              border: "1px solid #ddd",
              padding: "10px",
              marginBottom: "8px",
              borderRadius: "6px"
            }}>
              <strong>Cliente:</strong> {item.interventi.clienti?.nome} <br />
              <strong>Descrizione:</strong> {item.interventi.descrizione} <br />
              <strong>Ore:</strong> {item.ore}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}