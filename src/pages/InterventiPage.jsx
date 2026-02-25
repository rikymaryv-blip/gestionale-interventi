import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"
import InterventoForm from "../components/InterventoForm"
import InterventoList from "../components/InterventoList"

export default function InterventiPage() {

  const navigate = useNavigate()

  const [interventi, setInterventi] = useState([])
  const [refresh, setRefresh] = useState(false)
  const [interventoInModifica, setInterventoInModifica] = useState(null)

  useEffect(() => {
    loadInterventi()
  }, [refresh])

  async function loadInterventi() {

    const { data: interventiData } = await supabase
      .from("interventi")
      .select(`
        *,
        clienti ( nome ),
        ore_operatori (
          id,
          ore,
          operatore_id,
          operatori ( nome )
        )
      `)
      .order("data", { ascending: false })

    if (!interventiData) return

    const interventiCompleti = await Promise.all(
      interventiData.map(async (intervento) => {

        const { data: materiali } = await supabase
          .from("materiali_bollettino")
          .select("*")
          .eq("intervento_id", intervento.id)

        return {
          ...intervento,
          materiali_bollettino: materiali || []
        }
      })
    )

    setInterventi(interventiCompleti)
  }

  function handleSaved() {
    setInterventoInModifica(null)
    setRefresh(!refresh)
  }

  async function handleDelete(id) {

    if (!window.confirm("Eliminare intervento?")) return

    await supabase.from("materiali_bollettino").delete().eq("intervento_id", id)
    await supabase.from("ore_operatori").delete().eq("intervento_id", id)
    await supabase.from("interventi").delete().eq("id", id)

    setRefresh(!refresh)
  }

  function handleBollettino(id) {
    navigate(`/bollettino/${id}`)
  }

  return (
    <div>

      <h1>Gestione Interventi</h1>

      <InterventoForm
        onSaved={handleSaved}
        interventoDaModificare={interventoInModifica}
      />

      <hr style={{ margin: "30px 0" }} />

      <InterventoList
        interventi={interventi}
        onDelete={handleDelete}
        onEdit={(i) => setInterventoInModifica(i)}
        onBollettino={(i) => handleBollettino(i.id)}
      />

    </div>
  )
}
