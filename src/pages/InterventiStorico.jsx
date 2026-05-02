import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function InterventiStorico() {

  const [interventi, setInterventi] = useState([])
  const [dettaglio, setDettaglio] = useState(null)
  const [materiali, setMateriali] = useState([])
  const [operatori, setOperatori] = useState([])

  useEffect(() => {
    caricaInterventi()
  }, [])

  async function caricaInterventi() {
    const { data } = await supabase
      .from("interventi")
      .select("*")
      .order("data", { ascending: false })

    setInterventi(data || [])
  }

  async function apriDettaglio(int) {

    setDettaglio(int)

    // materiali
    const { data: mats } = await supabase
      .from("materiali_bollettino")
      .select("*")
      .eq("intervento_id", int.id)

    // operatori
    const { data: ops } = await supabase
      .from("ore_operatori")
      .select("*, operatori(nome)")
      .eq("intervento_id", int.id)

    setMateriali(mats || [])
    setOperatori(ops || [])
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>📋 Storico Interventi</h2>

      {/* LISTA */}
      {interventi.map(i => (
        <div
          key={i.id}
          onClick={() => apriDettaglio(i)}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 5,
            cursor: "pointer"
          }}
        >
          <b>{i.data}</b> - {i.descrizione}
        </div>
      ))}

      {/* DETTAGLIO */}
      {dettaglio && (
        <div style={{ marginTop: 20 }}>

          <h3>Dettaglio Intervento</h3>

          <p><b>Data:</b> {dettaglio.data}</p>
          <p><b>Descrizione:</b> {dettaglio.descrizione}</p>

          <h4>👷 Operatori</h4>
          {operatori.map((o, i) => (
            <div key={i}>
              {o.operatori?.nome} - {o.ore} ore
            </div>
          ))}

          <h4>📦 Materiali</h4>
          {materiali.map((m, i) => (
            <div key={i}>
              {m.codice} - {m.descrizione} ({m.quantita})
            </div>
          ))}

        </div>
      )}

    </div>
  )
}