import { useEffect, useState } from "react"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"

export default function FatturePage() {

  const [clientiMap, setClientiMap] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

  async function load() {

    const { data, error } = await supabase
      .from("interventi")
      .select(`
        id,
        data,
        descrizione,
        clienti(nome),
        ore_operatori(
          ore,
          operatore_id
        ),
        materiali_bollettino(
          codice,
          descrizione,
          quantita
        )
      `)
      .eq("stato", "attivo")

    if (error) {
      console.error("ERRORE LOAD:", error)
      alert("Errore caricamento interventi")
      return
    }

    const map = {}

    data?.forEach(i => {
      const nome = i.clienti?.nome || "Senza nome"

      if (!map[nome]) map[nome] = []
      map[nome].push(i)
    })

    setClientiMap(map)
  }

  // 🔥 FUNZIONE PER PRENDERE NOME OPERATORE
  async function getNomeOperatore(id) {
    if (!id) return "Operatore"

    const { data } = await supabase
      .from("operatori")
      .select("nome")
      .eq("id", id)
      .single()

    return data?.nome || "Operatore"
  }

  async function creaFattura(cliente) {

    const lista = clientiMap[cliente]

    if (!lista || lista.length === 0) {
      alert("Nessun intervento")
      return
    }

    // CREA FATTURA
    const { data: fattura, error } = await supabase
      .from("fatture")
      .insert([{
        cliente_nome: cliente,
        data: new Date().toISOString()
      }])
      .select()
      .single()

    if (error || !fattura) {
      console.error(error)
      alert("Errore creazione fattura")
      return
    }

    // 🔥 INSERIMENTO RIGHE
    for (const i of lista) {

      // 👉 OPERATORI CON NOME REALE
      for (const o of i.ore_operatori || []) {

        const nomeOperatore = await getNomeOperatore(o.operatore_id)

        await supabase.from("fatture_righe").insert({
          fattura_id: fattura.id,
          data: i.data,
          descrizione: i.descrizione,
          operatore: nomeOperatore,
          ore: o.ore
        })
      }

      // 👉 MATERIALI CON CODICE
      for (const m of i.materiali_bollettino || []) {

        await supabase.from("fatture_righe").insert({
          fattura_id: fattura.id,
          codice: m.codice || "",
          materiale: m.descrizione || "",
          quantita: m.quantita || 0
        })
      }
    }

    // ARCHIVIA INTERVENTI
    await supabase
      .from("interventi")
      .update({ stato: "archiviato" })
      .in("id", lista.map(i => i.id))

    alert("✅ Fattura salvata")

    navigate("/storico-fatture")
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>💰 Fatture</h2>

      <button onClick={() => navigate("/storico-fatture")}>
        📜 Vai allo Storico
      </button>

      {Object.keys(clientiMap).length === 0 && (
        <p>Nessun intervento da fatturare</p>
      )}

      {Object.keys(clientiMap).map(cliente => {

        const lista = clientiMap[cliente]

        const totaleOre = lista.reduce((tot, i) =>
          tot + (i.ore_operatori || []).reduce((t, o) => t + (o.ore || 0), 0)
        , 0)

        const totaleMateriali = lista.reduce((tot, i) =>
          tot + (i.materiali_bollettino || []).reduce((t, m) => t + (m.quantita || 0), 0)
        , 0)

        return (
          <div key={cliente} style={{
            border: "1px solid #ccc",
            marginTop: 10,
            padding: 10,
            borderRadius: 6
          }}>

            <h3>{cliente}</h3>

            <div>👷 Ore totali: {totaleOre}</div>
            <div>📦 Materiali totali: {totaleMateriali}</div>

            <hr />

            {lista.map(i => (
              <div key={i.id}>
                📅 {dayjs(i.data).format("DD/MM/YYYY")} - {i.descrizione}
              </div>
            ))}

            <br />

            <button onClick={() => creaFattura(cliente)}>
              💾 Crea Fattura
            </button>

          </div>
        )
      })}

    </div>
  )
}