import { useEffect, useState } from "react"
import dayjs from "dayjs"
import "dayjs/locale/it"
import { supabase } from "../../supabaseClient"

dayjs.locale("it")

export default function CalendarMonth() {
  const [operatori, setOperatori] = useState([])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [giorni, setGiorni] = useState([])

  const oggi = dayjs()
  const giorniNelMese = oggi.daysInMonth()
  const primoGiorno = (oggi.startOf("month").day() + 6) % 7 // lun=0
  const annoMese = oggi.format("YYYY-MM")

  useEffect(() => {
    loadOperatori()
  }, [])

  useEffect(() => {
    caricaOre()
  }, [selectedOperator])

  // 🔥 OPERATORI
  async function loadOperatori() {
    const { data } = await supabase
      .from("operatori")
      .select("*")
      .order("nome")

    setOperatori(data || [])
  }

  // 🔥 ORE PER GIORNO
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

    data?.forEach(i => {
      const giorno = dayjs(i.data).date()

      let totale = 0

      i.ore_operatori?.forEach(op => {
        if (!selectedOperator || op.operatore_id == selectedOperator) {
          totale += Number(op.ore || 0)
        }
      })

      if (!mappa[giorno]) mappa[giorno] = 0
      mappa[giorno] += totale
    })

    let lista = []

    // 🔥 SPAZI INIZIALI (lun-dom)
    for (let i = 0; i < primoGiorno; i++) {
      lista.push(null)
    }

    // 🔥 GIORNI REALI
    for (let g = 1; g <= giorniNelMese; g++) {
      lista.push({
        giorno: g,
        ore: mappa[g] || 0,
        data: dayjs(`${annoMese}-${String(g).padStart(2, "0")}`)
      })
    }

    setGiorni(lista)
  }

  // 🔥 COLORI
  function getColore(g) {
    if (!g) return "transparent"

    const giornoSettimana = g.data.day() // 0 dom, 6 sab

    // 💣 WEEKEND SEMPRE BIANCHI
    if (giornoSettimana === 0 || giornoSettimana === 6) {
      return "#fff"
    }

    if (g.ore === 0) return "#fff"
    if (g.ore < 8) return "#ff4d4d"
    return "#4caf50"
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>{oggi.format("MMMM YYYY")}</h2>

      {/* 🔥 SELECT OPERATORE */}
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

      {/* 🔥 GIORNI SETTIMANA */}
      <div style={headerGrid}>
        {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map(g => (
          <div key={g} style={headerCell}>{g}</div>
        ))}
      </div>

      {/* 🔥 CALENDARIO */}
      <div style={grid}>
        {giorni.map((g, i) => (
          <div key={i} style={cella}>

            {g && (
              <div
                style={{
                  ...boxGiorno,
                  background: getColore(g)
                }}
              >
                <div style={{ fontWeight: "bold" }}>{g.giorno}</div>
                <div style={{ fontSize: 12 }}>{g.ore}h</div>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  )
}

/* STILI */
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
  border: "1px solid #ccc",
  height: "100%",
  padding: 5,
  textAlign: "center",
  borderRadius: 4
}