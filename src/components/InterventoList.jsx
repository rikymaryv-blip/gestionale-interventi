iimport { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function InterventiList() {
  const [interventi, setInterventi] = useState([])

  useEffect(() => {
    loadInterventi()
  }, [])

  async function loadInterventi() {

    const { data, error } = await supabase
      .from("interventi")
      .select(`
        id,
        data,
        descrizione,
        cliente_id,
        cantiere_id,
        clienti ( nome ),
        cantieri ( nome ),
        ore_operatori (
          ore,
          operatori ( nome )
        ),
        materiali_bollettino (
          codice,
          descrizione,
          quantita
        )
      `)
      .order("data", { ascending: false })

    if (error) {
      console.error("Errore interventi:", error)
      return
    }

    console.log("INTERVENTI:", data)

    setInterventi(data || [])
  }

  return (
    <div style={{ maxWidth: "900px", margin: "auto" }}>
      <h2>Interventi</h2>

      {interventi.map((i) => (
        <div
          key={i.id}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginTop: "10px",
            borderRadius: "8px"
          }}
        >
          <div><b>Data:</b> {i.data}</div>

          <div><b>Cliente:</b> {i.clienti?.nome || "—"}</div>

          {/* 🔥 CANTIERE */}
          <div><b>Cantiere:</b> {i.cantieri?.nome || "—"}</div>

          <div><b>Descrizione:</b> {i.descrizione}</div>

          <div style={{ marginTop: "8px" }}>
            <b>Operatori:</b>
            {i.ore_operatori?.length > 0 ? (
              i.ore_operatori.map((o, index) => (
                <div key={index}>
                  - {o.operatori?.nome} ({o.ore}h)
                </div>
              ))
            ) : (
              <div>Nessuno</div>
            )}
          </div>

          <div style={{ marginTop: "8px" }}>
            <b>Materiali:</b>
            {i.materiali_bollettino?.length > 0 ? (
              i.materiali_bollettino.map((m, index) => (
                <div key={index}>
                  - {m.codice} | {m.descrizione} x {m.quantita}
                </div>
              ))
            ) : (
              <div>Nessuno</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}