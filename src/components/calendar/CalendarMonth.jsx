import { useEffect, useState } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../../supabaseClient"

dayjs.locale("it")

export default function CalendarMonth() {
  const [operatori, setOperatori] = useState([])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [oreMese, setOreMese] = useState([])

  const oggi = dayjs()
  const meseCorrente = oggi.format("MMMM YYYY") // es: febbraio 2026
  const giorniNelMese = oggi.daysInMonth()
  const annoMese = oggi.format("YYYY-MM")

  useEffect(() => {
    loadOperatori()
  }, [])

  useEffect(() => {
    if (selectedOperator) {
      loadOre()
    }
  }, [selectedOperator])

  async function loadOperatori() {
    const { data, error } = await supabase
      .from("operatori")
      .select("*")
      .order("nome", { ascending: true })

    if (error) {
      console.error("Errore caricamento operatori:", error)
      return
    }

    setOperatori(data || [])
  }

  async function loadOre() {
    const start = oggi.startOf("month").format("YYYY-MM-DD")
    const end = oggi.endOf("month").format("YYYY-MM-DD")

    const { data, error } = await supabase
      .from("vista_ore_giornaliere")
      .select("*")
      .eq("operatore", selectedOperator)
      .gte("data", start)
      .lte("data", end)

    if (error) {
      console.error("Errore caricamento ore:", error)
      return
    }

    setOreMese(data || [])
  }

  function getColore(giornoCompleto) {
    const trovato = oreMese.find(o => o.data === giornoCompleto)

    if (!trovato) return "#ffffff"
    if (trovato.ore < 8) return "#f8d7da" // rosso chiaro
    return "#d4edda" // verde chiaro
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
            </div>
          )
        })}
      </div>
    </div>
  )
}