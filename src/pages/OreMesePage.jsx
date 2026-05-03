import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import * as XLSX from "xlsx"

export default function OreMesePage() {

  const [operatori, setOperatori] = useState([])
  const [operatore, setOperatore] = useState("")
  const [mese, setMese] = useState("")

  useEffect(() => {
    caricaOperatori()
  }, [])

  async function caricaOperatori() {
    const { data } = await supabase
      .from("operatori")
      .select("*")
      .order("nome")

    setOperatori(data || [])
  }

  function formattaData(d) {
    if (!d) return ""
    const [anno, mese, giorno] = d.split("-")
    return `${giorno}/${mese}/${anno}`
  }

  async function scaricaExcel() {

    if (!operatore || !mese) {
      alert("Seleziona operatore e mese")
      return
    }

    const start = mese + "-01"
    const end = mese + "-31"

    const { data, error } = await supabase
      .from("ore_operatori")
      .select(`
        ore,
        interventi(
          data,
          descrizione,
          clienti(nome)
        )
      `)
      .eq("operatore_id", operatore)

    if (error) {
      console.error(error)
      alert("Errore dati")
      return
    }

    let filtrati = data.filter(r => {
      const d = r.interventi?.data
      if (!d) return false
      return d >= start && d <= end
    })

    filtrati.sort((a, b) =>
      a.interventi.data.localeCompare(b.interventi.data)
    )

    const righe = []
    let ultimoGiorno = null

    filtrati.forEach(r => {

      const giorno = r.interventi?.data

      if (ultimoGiorno && giorno !== ultimoGiorno) {
        righe.push({})
      }

      righe.push({
        Data: formattaData(giorno),
        Cliente: r.interventi?.clienti?.nome,
        Descrizione: r.interventi?.descrizione,
        Ore: r.ore
      })

      ultimoGiorno = giorno
    })

    const totale = filtrati.reduce((sum, r) => sum + (r.ore || 0), 0)

    righe.push({})
    righe.push({ Cliente: "TOTALE ORE", Ore: totale })

    const ws = XLSX.utils.json_to_sheet(righe)

    // 🔥 larghezza colonne
    ws["!cols"] = [
      { wch: 12 }, // Data
      { wch: 25 }, // Cliente
      { wch: 50 }, // Descrizione
      { wch: 10 }  // Ore
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Ore")

    XLSX.writeFile(wb, "ore_mese.xlsx")
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>📊 Ore mese operatore</h2>

      <div>
        <select
          value={operatore}
          onChange={e => setOperatore(e.target.value)}
        >
          <option value="">Seleziona operatore</option>
          {operatori.map(o => (
            <option key={o.id} value={o.id}>{o.nome}</option>
          ))}
        </select>
      </div>

      <br />

      <div>
        <input
          type="month"
          value={mese}
          onChange={e => setMese(e.target.value)}
        />
      </div>

      <br />

      <button onClick={scaricaExcel}>
        📥 Scarica Excel
      </button>

    </div>
  )
}