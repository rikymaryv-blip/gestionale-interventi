import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../../supabaseClient"

dayjs.locale("it")

export default function CalendarMonth() {
  const navigate = useNavigate()

  const [operatori, setOperatori] = useState([])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [giorni, setGiorni] = useState([])

  const [giornoSelezionato, setGiornoSelezionato] = useState(null)
  const [interventiGiorno, setInterventiGiorno] = useState([])

  const [meseCorrente, setMeseCorrente] = useState(dayjs())

  const giorniNelMese = meseCorrente.daysInMonth()
  const primoGiorno = (meseCorrente.startOf("month").day() + 6) % 7
  const annoMese = meseCorrente.format("YYYY-MM")

  useEffect(() => {
    loadOperatori()
  }, [])

  useEffect(() => {
    caricaOre()
  }, [selectedOperator, meseCorrente])

  async function loadOperatori() {
    const { data } = await supabase
      .from("operatori")
      .select("*")
      .order("nome")

    setOperatori(data || [])
  }

  async function caricaOre() {
    const { data } = await supabase
      .from("interventi")
      .select(`
        data,
        ore_operatori(ore, operatore_id)
      `)
      .gte("data", `${annoMese}-01`)
      .lte("data", `${annoMese}-${giorniNelMese}`)

    let mappa = {}
    let count = {}

    data?.forEach(i => {
      const giorno = dayjs(i.data).date()

      let totale = 0

      i.ore_operatori?.forEach(op => {
        if (!selectedOperator || op.operatore_id == selectedOperator) {
          totale += Number(op.ore || 0)
        }
      })

      if (!mappa[giorno]) mappa[giorno] = 0
      if (!count[giorno]) count[giorno] = 0

      mappa[giorno] += totale
      count[giorno] += 1
    })

    let lista = []

    for (let i = 0; i < primoGiorno; i++) {
      lista.push(null)
    }

    for (let g = 1; g <= giorniNelMese; g++) {
      lista.push({
        giorno: g,
        ore: mappa[g] || 0,
        count: count[g] || 0,
        data: dayjs(`${annoMese}-${String(g).padStart(2, "0")}`)
      })
    }

    setGiorni(lista)
  }

  function getColore(g) {
    if (!g) return "transparent"

    const giorno = g.data
    const oggi = dayjs()
    const giornoSettimana = giorno.day()
    const isWeekend = giornoSettimana === 0 || giornoSettimana === 6

    if (giorno.isAfter(oggi, "day")) return "#fff"
    if (isWeekend && g.ore === 0) return "#fff"
    if (g.ore === 0) return "#ff4d4d"
    if (g.ore > 0 && g.ore < 8) return "#ffd54f"
    if (g.ore >= 8) return "#4caf50"

    return "#fff"
  }

  async function apriGiorno(g) {
    if (!g) return

    setGiornoSelezionato(g)

    const dataStr = g.data.format("YYYY-MM-DD")

    const { data } = await supabase
      .from("interventi")
      .select(`
        id,
        descrizione,
        clienti(nome),
        ore_operatori(ore, operatori(nome))
      `)
      .eq("data", dataStr)

    setInterventiGiorno(data || [])
  }

  return (
    <div style={{ padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => setMeseCorrente(meseCorrente.subtract(1, "month"))}>⬅️</button>
        <h2>{meseCorrente.format("MMMM YYYY")}</h2>
        <button onClick={() => setMeseCorrente(meseCorrente.add(1, "month"))}>➡️</button>
      </div>

      <select
        value={selectedOperator}
        onChange={e => setSelectedOperator(e.target.value)}
        style={{ marginBottom: 10 }}
      >
        <option value="">Tutti operatori</option>
        {operatori.map(op => (
          <option key={op.id} value={op.id}>
            {op.nome}
          </option>
        ))}
      </select>

      <div style={headerGrid}>
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(g => (
          <div key={g} style={headerCell}>{g}</div>
        ))}
      </div>

      <div style={grid}>
        {giorni.map((g, i) => (
          <div key={i} style={cella}>
            {g && (
              <div
                onClick={() => apriGiorno(g)}
                style={{
                  ...boxGiorno,
                  background: getColore(g),
                  cursor: "pointer",
                  border: giornoSelezionato?.giorno === g.giorno ? "2px solid #000" : "1px solid #ccc"
                }}
              >
                <div style={{ fontWeight: "bold" }}>{g.giorno}</div>
                <div style={{ fontSize: 12 }}>
                  {g.ore > 0 ? `${g.ore}h` : "-"}
                </div>
                {g.count > 0 && (
                  <div style={{ fontSize: 10 }}>{g.count} int.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* POPUP */}
      {giornoSelezionato && (
        <div style={{
          marginTop: 20,
          border: "1px solid #ccc",
          padding: 10,
          borderRadius: 8,
          background: "#fff"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>{giornoSelezionato.data.format("DD/MM/YYYY")}</h3>
            <button onClick={() => setGiornoSelezionato(null)}>❌</button>
          </div>

          <button
            style={{ marginBottom: 10 }}
            onClick={() =>
              navigate("/interventi?data=" + giornoSelezionato.data.format("YYYY-MM-DD"))
            }
          >
            ➕ Nuovo intervento
          </button>

          {interventiGiorno.length === 0 && <p>Nessun intervento</p>}

          {interventiGiorno.map(i => (
            <div
              key={i.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 10,
                marginBottom: 10,
                background: "#fafafa"
              }}
            >
              <div style={{ fontWeight: "bold" }}>{i.clienti?.nome}</div>
              <div>{i.descrizione}</div>

              <div style={{ marginTop: 6 }}>
                {i.ore_operatori?.map((o, idx) => (
                  <div key={idx} style={{ fontSize: 12 }}>
                    {o.operatori?.nome} • {o.ore}h
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => navigate("/interventi?edit=" + i.id)}
                  style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 5,
                    border: "1px solid #ccc",
                    cursor: "pointer"
                  }}
                >
                  ✏️ Modifica
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const headerGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  marginTop: 10
}

const headerCell = {
  textAlign: "center",
  fontWeight: "bold"
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 5,
  marginTop: 5
}

const cella = {
  height: 80
}

const boxGiorno = {
  height: "100%",
  padding: 5,
  textAlign: "center",
  borderRadius: 4
}