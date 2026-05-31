import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../../supabaseClient"

dayjs.locale("it")

export default function CalendarMonth() {
  const navigate = useNavigate()

  const [mese, setMese] = useState(dayjs())
  const [interventi, setInterventi] = useState([])
  const [operatori, setOperatori] = useState([])
  const [operatoreFiltro, setOperatoreFiltro] = useState("")
  const [giornoSelezionato, setGiornoSelezionato] = useState(
    dayjs().format("YYYY-MM-DD")
  )

  useEffect(() => {
    caricaOperatori()
  }, [])

  useEffect(() => {
    caricaInterventi()
  }, [mese])

  async function caricaOperatori() {
    const { data, error } = await supabase
      .from("operatori")
      .select("*")
      .order("nome", { ascending: true })

    if (error) {
      console.error("Errore operatori:", error)
      return
    }

    setOperatori(data || [])
  }

  async function caricaInterventi() {
    const inizio = mese.startOf("month").format("YYYY-MM-DD")
    const fine = mese.endOf("month").format("YYYY-MM-DD")

    const { data, error } = await supabase
      .from("interventi")
      .select(`
        id,
        data,
        descrizione,
        archiviato,
        clienti(nome),
        cantieri(nome),
        ore_operatori(
          ore,
          operatori(id, nome)
        ),
        materiali_bollettino(id)
      `)
      .gte("data", inizio)
      .lte("data", fine)
      .or("archiviato.is.null,archiviato.eq.false")
      .order("data", { ascending: true })

    if (error) {
      console.error("Errore interventi:", error)
      return
    }

    setInterventi(data || [])
  }

  const giorniCalendario = useMemo(() => {
    const start = mese.startOf("month")
    const giorniNelMese = mese.daysInMonth()
    const offset = (start.day() + 6) % 7
    const giorni = []

    for (let i = 0; i < offset; i++) giorni.push(null)
    for (let g = 1; g <= giorniNelMese; g++) giorni.push(mese.date(g))

    return giorni
  }, [mese])

  function interventiDelGiorno(giorno) {
    if (!giorno) return []

    return interventi.filter((intervento) => {
      if (intervento.data !== giorno.format("YYYY-MM-DD")) return false
      if (!operatoreFiltro) return true

      return intervento.ore_operatori?.some(
        (riga) => String(riga.operatori?.id) === String(operatoreFiltro)
      )
    })
  }

  function oreDelGiorno(giorno) {
    return interventiDelGiorno(giorno).reduce((totale, intervento) => {
      const ore = intervento.ore_operatori || []

      const oreFiltrate = operatoreFiltro
        ? ore.filter(
            (riga) => String(riga.operatori?.id) === String(operatoreFiltro)
          )
        : ore

      return (
        totale +
        oreFiltrate.reduce(
          (somma, riga) => somma + Number(riga.ore || 0),
          0
        )
      )
    }, 0)
  }

  function coloreGiorno(giorno) {
    if (!giorno) return "white"

    const oggi = dayjs().startOf("day")
    const dataGiorno = giorno.startOf("day")
    const ore = oreDelGiorno(giorno)
    const weekend = giorno.day() === 0 || giorno.day() === 6

    if (dataGiorno.isAfter(oggi)) return "white"
    if (weekend && ore === 0) return "white"
    if (ore >= 8) return "#d8f5d0"
    if (ore > 0) return "#fff3bf"
    return "#ffc9c9"
  }

  function selezionaGiorno(giorno) {
    if (!giorno) return
    setGiornoSelezionato(giorno.format("YYYY-MM-DD"))
  }

  function nuovoInterventoDalCalendario(data = giornoSelezionato) {
    if (!data) return
    navigate(`/interventi?data=${data}`)
  }

  function modificaIntervento(id) {
    navigate(`/interventi?edit_id=${id}`)
  }

  function vaiAlGiornoDopo() {
    if (!giornoSelezionato) return

    const giornoDopo = dayjs(giornoSelezionato).add(1, "day")
    setGiornoSelezionato(giornoDopo.format("YYYY-MM-DD"))

    if (!giornoDopo.isSame(mese, "month")) {
      setMese(giornoDopo)
    }
  }

  function vaiAlGiornoPrima() {
    if (!giornoSelezionato) return

    const giornoPrima = dayjs(giornoSelezionato).subtract(1, "day")
    setGiornoSelezionato(giornoPrima.format("YYYY-MM-DD"))

    if (!giornoPrima.isSame(mese, "month")) {
      setMese(giornoPrima)
    }
  }

  const interventiSelezionati = giornoSelezionato
    ? interventiDelGiorno(dayjs(giornoSelezionato))
    : []

  const totaleOreGiorno = giornoSelezionato
    ? oreDelGiorno(dayjs(giornoSelezionato))
    : 0

  return (
    <div style={page}>
      <h1 style={title}>📅 Calendario interventi</h1>

      <div style={layout}>
        <div style={calendarPanel}>
          <div style={topBar}>
            <button
              style={button}
              onClick={() => setMese(mese.subtract(1, "month"))}
            >
              ◀
            </button>

            <h2 style={monthTitle}>{mese.format("MMMM YYYY")}</h2>

            <button
              style={button}
              onClick={() => setMese(mese.add(1, "month"))}
            >
              ▶
            </button>
          </div>

          <select
            style={select}
            value={operatoreFiltro}
            onChange={(e) => setOperatoreFiltro(e.target.value)}
          >
            <option value="">Tutti operatori</option>

            {operatori.map((op) => (
              <option key={op.id} value={op.id}>
                {op.nome}
              </option>
            ))}
          </select>

          <div style={weekGrid}>
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((g) => (
              <div key={g} style={weekDay}>
                {g}
              </div>
            ))}
          </div>

          <div style={calendarGrid}>
            {giorniCalendario.map((giorno, index) => {
              const ore = giorno ? oreDelGiorno(giorno) : 0
              const lista = giorno ? interventiDelGiorno(giorno) : []
              const selezionato =
                giornoSelezionato === giorno?.format("YYYY-MM-DD")

              return (
                <div
                  key={index}
                  onClick={() => selezionaGiorno(giorno)}
                  onDoubleClick={() =>
                    giorno &&
                    nuovoInterventoDalCalendario(giorno.format("YYYY-MM-DD"))
                  }
                  style={{
                    ...dayCell,
                    background: coloreGiorno(giorno),
                    cursor: giorno ? "pointer" : "default",
                    border: selezionato
                      ? "3px solid #1976d2"
                      : "1px solid #ccc",
                  }}
                >
                  {giorno && (
                    <>
                      <div style={dayNumber}>{giorno.date()}</div>
                      <div style={dayInfo}>{ore > 0 ? `${ore}h` : "-"}</div>
                      {lista.length > 0 && (
                        <div style={dayInfo}>{lista.length} int.</div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={detailsBox}>
          <div style={detailsHeader}>
            <div>
              <h2 style={{ margin: 0 }}>
                Interventi del{" "}
                {dayjs(giornoSelezionato).format("DD/MM/YYYY")}
              </h2>
              <div style={summaryLine}>
                Interventi: {interventiSelezionati.length} | Ore:{" "}
                {totaleOreGiorno}
              </div>
            </div>

            <div style={headerButtons}>
              <button onClick={vaiAlGiornoPrima} style={prevDayButton}>
                ⬅️ Giorno prima
              </button>

              <button
                onClick={() => nuovoInterventoDalCalendario()}
                style={newButton}
              >
                ➕ Nuovo intervento
              </button>

              <button onClick={vaiAlGiornoDopo} style={nextDayButton}>
                ➡️ Giorno dopo
              </button>
            </div>
          </div>

          {interventiSelezionati.length === 0 ? (
            <div style={emptyBox}>
              Nessun intervento in questo giorno.
              <br />
              <button
                onClick={() => nuovoInterventoDalCalendario()}
                style={{ ...newButton, marginTop: 15 }}
              >
                ➕ Crea intervento in questa data
              </button>
            </div>
          ) : (
            interventiSelezionati.map((intervento) => {
              const haMateriale =
                intervento.materiali_bollettino?.length > 0

              return (
                <div key={intervento.id} style={card}>
                  <div style={cardContent}>
                    <div style={cardLeft}>
                      <h3 style={cardTitle}>
                        {intervento.clienti?.nome || "Cliente non indicato"}
                      </h3>

                      <p>
                        <strong>📅 Data:</strong>{" "}
                        {dayjs(intervento.data).format("DD/MM/YYYY")}
                      </p>

                      <p>
                        <strong>🏗️ Cantiere:</strong>{" "}
                        {intervento.cantieri?.nome || "Non indicato"}
                      </p>

                      <p>
                        <strong>📦 Materiale:</strong>{" "}
                        {haMateriale
                          ? `SI (${intervento.materiali_bollettino.length} righe)`
                          : "NO"}
                      </p>

                      <p>
                        <strong>📝 Descrizione:</strong>{" "}
                        {intervento.descrizione || "Nessuna descrizione"}
                      </p>

                      <strong>👷 Operatori:</strong>

                      {intervento.ore_operatori?.length > 0 ? (
                        <ul>
                          {intervento.ore_operatori
                            .filter((riga) =>
                              operatoreFiltro
                                ? String(riga.operatori?.id) ===
                                  String(operatoreFiltro)
                                : true
                            )
                            .map((riga, i) => (
                              <li key={i}>
                                {riga.operatori?.nome || "Operatore"} -{" "}
                                {riga.ore} ore
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <p>Nessun operatore inserito.</p>
                      )}
                    </div>

                    <div style={cardActions}>
                      <button
                        onClick={() => modificaIntervento(intervento.id)}
                        style={modifyButton}
                      >
                        ✏️ Modifica
                      </button>

                      <button
                        onClick={() => nuovoInterventoDalCalendario()}
                        style={newButton}
                      >
                        ➕ Nuovo
                      </button>

                      <button onClick={vaiAlGiornoDopo} style={nextDayButton}>
                        ➡️ Giorno dopo
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

const page = {
  padding: "12px",
  maxWidth: "1600px",
  margin: "0 auto",
  boxSizing: "border-box",
}

const title = {
  margin: "0 0 10px 0",
}

const layout = {
  display: "grid",
  gridTemplateColumns: "430px 1fr",
  gap: "18px",
  alignItems: "start",
}

const calendarPanel = {
  position: "sticky",
  top: "10px",
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "12px",
  padding: "12px",
}

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
}

const monthTitle = {
  textTransform: "capitalize",
  margin: 0,
  fontSize: "22px",
}

const button = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: "bold",
}

const select = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  marginBottom: "12px",
  fontSize: "15px",
}

const weekGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "5px",
  marginBottom: "5px",
}

const weekDay = {
  textAlign: "center",
  fontWeight: "bold",
  padding: "5px",
  fontSize: "13px",
}

const calendarGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "5px",
}

const dayCell = {
  minHeight: "58px",
  borderRadius: "6px",
  padding: "5px",
  boxSizing: "border-box",
  textAlign: "center",
  fontWeight: "bold",
}

const dayNumber = {
  fontSize: "16px",
  marginBottom: "3px",
}

const dayInfo = {
  fontSize: "12px",
}

const detailsBox = {
  minHeight: "calc(100vh - 100px)",
  padding: "18px",
  borderRadius: "12px",
  border: "3px solid #1976d2",
  background: "#fafafa",
}

const detailsHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  alignItems: "flex-start",
  marginBottom: "15px",
  flexWrap: "wrap",
}

const summaryLine = {
  marginTop: "5px",
  color: "#555",
  fontWeight: "bold",
}

const headerButtons = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
}

const emptyBox = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "20px",
  fontWeight: "bold",
}

const card = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "15px",
  marginBottom: "12px",
}

const cardContent = {
  display: "grid",
  gridTemplateColumns: "1fr 170px",
  gap: "15px",
}

const cardLeft = {
  minWidth: 0,
}

const cardTitle = {
  marginTop: 0,
}

const cardActions = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  alignItems: "stretch",
}

const newButton = {
  background: "#198754",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
}

const nextDayButton = {
  background: "#6f42c1",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
}

const prevDayButton = {
  background: "#0d6efd",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
}

const modifyButton = {
  background: "#1976d2",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold",
}