import { useEffect, useMemo, useRef, useState } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../../supabaseClient"

dayjs.locale("it")

export default function CalendarMonth() {
  const [mese, setMese] = useState(dayjs())
  const [interventi, setInterventi] = useState([])
  const [operatori, setOperatori] = useState([])
  const [operatoreFiltro, setOperatoreFiltro] = useState("")
  const [giornoSelezionato, setGiornoSelezionato] = useState(null)

  const paginaRef = useRef(null)
  const interventiRef = useRef(null)

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
        )
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

  function vaiAgliInterventi() {
    setTimeout(() => {
      if (!paginaRef.current || !interventiRef.current) return

      paginaRef.current.scrollTo({
        top: interventiRef.current.offsetTop - 10,
        behavior: "smooth",
      })
    }, 300)
  }

  function selezionaGiorno(giorno) {
    if (!giorno) return

    setGiornoSelezionato(giorno.format("YYYY-MM-DD"))
    vaiAgliInterventi()
  }

  const interventiSelezionati = giornoSelezionato
    ? interventiDelGiorno(dayjs(giornoSelezionato))
    : []

  const clientiGiornata = [
    ...new Set(
      interventiSelezionati.map(
        (intervento) => intervento.clienti?.nome || "Cliente non indicato"
      )
    ),
  ]

  return (
    <div ref={paginaRef} style={page}>
      <h1>📅 Calendario interventi</h1>

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
                  <div>{ore > 0 ? `${ore}h` : "-"}</div>
                  {lista.length > 0 && <div>{lista.length} int.</div>}
                </>
              )}
            </div>
          )
        })}
      </div>

      {giornoSelezionato && (
        <div ref={interventiRef} style={detailsBox}>
          <h2>
            Interventi del {dayjs(giornoSelezionato).format("DD/MM/YYYY")}
          </h2>

          {operatoreFiltro && clientiGiornata.length > 0 && (
            <div style={clientiGiornoBox}>
              <strong>Clienti della giornata:</strong>
              <ul>
                {clientiGiornata.map((cliente, index) => (
                  <li key={index}>{cliente}</li>
                ))}
              </ul>
            </div>
          )}

          {interventiSelezionati.length === 0 ? (
            <p>Nessun intervento in questo giorno.</p>
          ) : (
            interventiSelezionati.map((intervento) => (
              <div key={intervento.id} style={card}>
                <h3>{intervento.clienti?.nome || "Cliente non indicato"}</h3>

                <p>
                  <strong>Cantiere:</strong>{" "}
                  {intervento.cantieri?.nome || "Non indicato"}
                </p>

                <p>
                  <strong>Descrizione:</strong>{" "}
                  {intervento.descrizione || "Nessuna descrizione"}
                </p>

                <strong>Operatori:</strong>

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
                          {riga.operatori?.nome || "Operatore"} - {riga.ore} ore
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p>Nessun operatore inserito.</p>
                )}
              </div>
            ))
          )}

          <div style={{ height: "350px" }}></div>
        </div>
      )}
    </div>
  )
}

const page = {
  height: "calc(100vh - 90px)",
  overflowY: "auto",
  padding: "20px",
  maxWidth: "1200px",
  margin: "0 auto",
  boxSizing: "border-box",
}

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "15px",
}

const monthTitle = {
  textTransform: "capitalize",
  margin: 0,
}

const button = {
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "#f5f5f5",
  cursor: "pointer",
  fontWeight: "bold",
}

const select = {
  width: "100%",
  padding: "12px",
  borderRadius: "0",
  border: "1px solid #ccc",
  marginBottom: "25px",
  fontSize: "16px",
}

const weekGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "6px",
  marginBottom: "6px",
}

const weekDay = {
  textAlign: "center",
  fontWeight: "bold",
  padding: "8px",
}

const calendarGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "6px",
}

const dayCell = {
  minHeight: "100px",
  borderRadius: "6px",
  padding: "8px",
  boxSizing: "border-box",
  textAlign: "center",
  fontWeight: "bold",
}

const dayNumber = {
  fontSize: "18px",
  marginBottom: "8px",
}

const detailsBox = {
  marginTop: "35px",
  padding: "20px",
  borderRadius: "12px",
  border: "3px solid #1976d2",
  background: "#fafafa",
}

const clientiGiornoBox = {
  background: "#e3f2fd",
  border: "1px solid #1976d2",
  borderRadius: "8px",
  padding: "12px",
  marginBottom: "15px",
}

const card = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "15px",
  marginBottom: "12px",
}