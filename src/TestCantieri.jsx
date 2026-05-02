import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

export default function TestCantieri() {

  const [cantieri, setCantieri] = useState([])

  useEffect(() => {
    caricaCantieri()
  }, [])

  async function caricaCantieri() {

    const { data, error } = await supabase
      .from("cantieri")
      .select("*")

    console.log("CANTIERI:", data)
    console.log("ERRORE:", error)

    setCantieri(data || [])
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>TEST CANTIERI</h2>

      {cantieri.length === 0 && <div>❌ Nessun dato</div>}

      {cantieri.map(c => (
        <div key={c.id}>
          {c.nome}
        </div>
      ))}
    </div>
  )
}