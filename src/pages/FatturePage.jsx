import { useEffect, useState } from "react"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"
import * as XLSX from "xlsx"

export default function FatturePage() {

  const [clientiMap, setClientiMap] = useState({})
  const [codiceAccesso, setCodiceAccesso] = useState("") // ✅ FIX

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
        cantieri(nome),
        ore_operatori(
          ore,
          operatori(nome)
        ),
        materiali_bollettino(codice, descrizione, quantita)
      `)
      .is("fattura_id", null)

    if (error) {
      console.error(error)
      return
    }

    const map = {}

    ;(data || []).forEach(i => {
      const nome = i.clienti?.nome || "Senza nome"

      if (!map[nome]) map[nome] = []
      map[nome].push(i)
    })

    setClientiMap(map)
  }

  async function creaFattura(cliente) {

    const lista = clientiMap[cliente] || []

    if (lista.length === 0) {
      alert("Nessun intervento")
      return
    }

    const { data: fattura, error } = await supabase
      .from("fatture")
      .insert([{
        cliente: cliente,
        data: new Date().toISOString(),
        numero: Date.now()
      }])
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    for (const i of lista) {

      const { error } = await supabase
        .from("fatture_dettaglio")
        .insert([{
          fattura_id: fattura.id,
          intervento_id: i.id,
          data: i.data,
          descrizione: i.descrizione,
          cantiere: i.cantieri?.nome || ""
        }])

      if (error) {
        alert(error.message)
        return
      }
    }

    const ids = lista.map(i => i.id)

    await supabase
      .from("interventi")
      .update({
        fattura_id: fattura.id,
        stato: "archiviato"
      })
      .in("id", ids)

    const rows = []
    rows.push(["Cliente", cliente])

    lista.forEach(i => {
      rows.push([
        dayjs(i.data).format("DD/MM/YYYY"),
        i.descrizione
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Fattura")

    XLSX.writeFile(wb, `fattura-${cliente}.xlsx`)

    alert("Fattura creata ✔")

    load()
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>💰 Fatture</h2>

      <input
        type="password"
        placeholder="Codice accesso"
        value={codiceAccesso}
        onChange={(e) => setCodiceAccesso(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      {Object.keys(clientiMap).length === 0 && (
        <p>Nessun intervento da fatturare</p>
      )}

      {Object.keys(clientiMap).map(cliente => {

        const lista = clientiMap[cliente]

        return (
          <div key={cliente} style={{
            border: "1px solid black",
            marginTop: 10,
            padding: 10
          }}>

            <h3>{cliente}</h3>

            {lista.map(i => (
              <div key={i.id}>
                📅 {dayjs(i.data).format("DD/MM/YYYY")} - {i.descrizione}
              </div>
            ))}

            <button
              onClick={() => {
                if (codiceAccesso !== "3125") {
                  alert("Accesso negato")
                  return
                }
                creaFattura(cliente)
              }}
            >
              Crea Fattura
            </button>

          </div>
        )
      })}
    </div>
  )
}