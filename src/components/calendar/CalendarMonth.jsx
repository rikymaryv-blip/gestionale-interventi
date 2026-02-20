import { useEffect, useState } from "react"
import dayjs from "dayjs"
import { supabase } from "../../supabaseClient"

export default function CalendarMonth() {
  const [operatori, setOperatori] = useState([])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [oreMese, setOreMese] = useState([])

  const today = dayjs()
  const startOfMonth = dayjs().startOf("month")
  const endOfMonth = dayjs().endOf("month")

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
    const { data, error } = await supabase
      .from("operatori")
      .select("*")
      .order("nome", { ascending: true })

    if (error) {
      console.error(error)
      return
    }

    setOperatori(data || [])
  }

  async function loadOre() {
    const { data, error } = await supabase
      .from("vista_ore_giornaliere")
      .select("*")
      .eq("operatore", selectedOperator)
      .gte("data", startOfMonth.format("YYYY-MM-DD"))
      .lte("data", endOfMonth.format("YYYY-MM-DD"))

    if (error) {
      console.error(error)
      return
    }

    setOreMese(data || [])
  }

  function getColor(dateString) {
    const date = dayjs(dateString)

    // Giorni futuri → bianco
    if (date.isAfter(today, "day")) {
      return "#ffffff"
    }

    // Weekend → grigio
    if (date.day() === 0 || date.day() === 6) {
      return "#e0e0e0"
    }

    const record = oreMese.find(o => o.data === dateString)

    if (!record) return "#ff4d4d" // Rosso → 0 ore
    if (record.ore < 8) return "#ff4d4d" // Rosso → meno di 8
    return "#4caf50" // Verde → 8 o più
  }

  const daysInMonth = startOfMonth.daysInMonth()
  const monthLabel = startOfMonth.format("MMMM YYYY")

  return (
    <div>
      <h2>{monthLabel}</h2>

      <select
        value={selectedOperator}
        onChange={(e) => setSelectedOperator(e.target.value)}
        style={{ marginBottom: "20px" }}
      >
        <option value="">Seleziona operatore</option>
        {operatori.map(op => (
          <option key={op.id} value={op.nome}>
            {op.nome}
          </option>
        ))}
      </select>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "5px"
        }}
      >
        {[...Array(daysInMonth)].map((_, i) => {
          const day = String(i + 1).padStart(2, "0")
          const dateString = `${startOfMonth.format("YYYY-MM")}-${day}`

          return (
            <div
              key={dateString}
              style={{
                padding: "15px",
                border: "1px solid #ccc",
                backgroundColor: getColor(dateString),
                textAlign: "center",
                fontWeight: "bold"
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}