import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"

export default function FatturaDettaglioPage() {

  const { id } = useParams()

  const [fattura, setFattura] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {

    console.log("ID FATTURA:", id)

    const { data, error } = await supabase
      .from("fatture")
      .select(`
        id,
        numero,
        cliente,
        data,
        fatture_dettaglio (
          id,
          intervento_id,
          data,
          descrizione,
          cantiere,
          interventi (
            id,
            ore_operatori (
              ore,
              operatori (nome)
            ),
            materiali_bollettino (
              codice,
              descrizione,
              quantita
            )
          )
        )
      `)
      .eq("id", id)
      .single()

    console.log("RISULTATO:", data)

    if (error || !data) {
      console.error("ERRORE:", error)
      setLoading(false)
      return
    }

    setFattura(data)
    setLoading(false)
  }

  if (loading) return <p>Caricamento...</p>

  if (!fattura) return <p>Fattura non trovata</p>

  return (
    <div style={{ padding: 20 }}>

      <h2>📄 Fattura #{fattura.numero}</h2>

      <p>
        Cliente: {fattura.cliente} <br />
        Data: {dayjs(fattura.data).format("DD/MM/YYYY")}
      </p>

      <h3>📦 Bollettini</h3>

      {fattura.fatture_dettaglio?.length === 0 && (
        <p>Nessun bollettino</p>
      )}

      {fattura.fatture_dettaglio?.map(b => (
        <div key={b.id} style={{
          border: "1px solid #ccc",
          marginTop: 10,
          padding: 10
        }}>

          📅 {dayjs(b.data).format("DD/MM/YYYY")} <br />
          🏗️ {b.cantiere || "Nessun cantiere"} <br />
          📝 {b.descrizione}

          {b.interventi && (
            <>
              <h4>Operatori</h4>
              {b.interventi.ore_operatori?.map((o, i) => (
                <div key={i}>
                  {o.operatori?.nome} - {o.ore}
                </div>
              ))}

              <h4>Materiali</h4>
              {b.interventi.materiali_bollettino?.map((m, i) => (
                <div key={i}>
                  {m.codice} - {m.descrizione} ({m.quantita})
                </div>
              ))}
            </>
          )}

        </div>
      ))}

    </div>
  )
}