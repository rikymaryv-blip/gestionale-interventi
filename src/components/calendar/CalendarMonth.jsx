import { useEffect, useState, useMemo } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../../supabaseClient"

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

  function getISOWeek(dateString) {
    const date = dayjs(dateString).toDate()
    const tmp = new Date(date.getTime())
    tmp.setHours(0,0,0,0)
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
    const week1 = new Date(tmp.getFullYear(), 0, 4)
    return (
      1 +
      Math.round(
        ((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
      )
    )
  }

  // ===== CALCOLO SETTIMANE LUN-DOM =====
  const primoGiornoMese = currentDate.startOf("month")
  const startOffset = (primoGiornoMese.day() + 6) % 7

  const giorniArray = []

  for (let i = 0; i < startOffset; i++) {
    giorniArray.push(null)
  }

  for (let i = 1; i <= giorniNelMese; i++) {
    giorniArray.push(i)
  }

  const settimane = []
  for (let i = 0; i < giorniArray.length; i += 7) {
    settimane.push(giorniArray.slice(i, i + 7))
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
          gridTemplateColumns: "40px repeat(7, 1fr)",
          gap: "6px"
        }}
      >
        <div></div>
        {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map(g => (
          <div key={g} style={{ fontWeight: "bold", textAlign: "center" }}>
            {g}
          </div>
        ))}

        {settimane.map((settimana, indexSettimana) => {

          const primoValido = settimana.find(g => g !== null)
          const dataSettimana = primoValido
            ? `${annoMese}-${String(primoValido).padStart(2, "0")}`
            : null

          const numeroSettimana = dataSettimana
            ? getISOWeek(dataSettimana)
            : ""

          let totaleSettimana = 0

          return (
            <>
              <div
                style={{
                  background: "#f1f1f1",
                  textAlign: "center",
                  fontWeight: "bold",
                  padding: "10px"
                }}
              >
                {numeroSettimana}
              </div>

              {settimana.map((giornoNumero, i) => {

                if (!giornoNumero) {
                  return (
                    <div
                      key={i}
                      style={{
                        border: "1px solid #eee",
                        minHeight: "80px",
                        background: "#fafafa"
                      }}
                    />
                  )
                }

                const giornoString = String(giornoNumero).padStart(2, "0")
                const dataCompleta = `${annoMese}-${giornoString}`
                const ore = oreMap[dataCompleta] || 0

                totaleSettimana += ore

                const isWeekend = i >= 5

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
                      cursor: "pointer",
                      minHeight: "80px",
                      opacity: isWeekend ? 0.9 : 1
                    }}
                  >
                    <div><strong>{giornoNumero}</strong></div>
                    <div>{ore} h</div>
                  </div>
                )
              })}

              <div
                style={{
                  gridColumn: "1 / span 8",
                  textAlign: "right",
                  padding: "6px",
                  fontWeight: "bold",
                  background: "#e9e9e9"
                }}
              >
                Tot settimana: {totaleSettimana} h
              </div>
            </>
          )
        })}
      </div>

      {/* DETTAGLIO GIORNO */}
      {giornoSelezionato && (
        <div style={{ marginTop: "30px" }}>
          <h3>
            Interventi del {dayjs(giornoSelezionato).format("DD/MM/YYYY")}
          </h3>

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