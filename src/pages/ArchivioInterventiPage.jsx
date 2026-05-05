import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"

export default function ArchivioInterventiPage() {

  const navigate = useNavigate()

  const [interventi, setInterventi] = useState([])
  const [loading, setLoading] = useState(false)

  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroData, setFiltroData] = useState("")

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)

    const { data, error } = await supabase
      .from("interventi")
      .select(`
        id,
        data,
        descrizione,
        archiviato,
        cliente_id,
        cantiere_id,
        clienti(nome),
        cantieri(nome),
        materiali_bollettino(id)
      `)
      .eq("archiviato", true)
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento archivio: " + error.message)
      setLoading(false)
      return
    }

    setInterventi(data || [])
    setLoading(false)
  }

  async function ripristinaIntervento(i) {
    if (!confirm("Vuoi ripristinare questo intervento negli interventi salvati?")) return

    const { error } = await supabase
      .from("interventi")
      .update({ archiviato: false })
      .eq("id", i.id)

    if (error) {
      console.error(error)
      alert("Errore ripristino intervento: " + error.message)
      return
    }

    alert("✅ Intervento ripristinato")
    load()
  }

  async function eliminaIntervento(i) {
    if (!confirm("Eliminare definitivamente questo intervento?")) return

    const { error: errorOre } = await supabase
      .from("ore_operatori")
      .delete()
      .eq("intervento_id", i.id)

    if (errorOre) {
      console.error(errorOre)
      alert("Errore eliminazione ore operatori: " + errorOre.message)
      return
    }

    const { error: errorMateriali } = await supabase
      .from("materiali_bollettino")
      .delete()
      .eq("intervento_id", i.id)

    if (errorMateriali) {
      console.error(errorMateriali)
      alert("Errore eliminazione materiali: " + errorMateriali.message)
      return
    }

    const { error: errorIntervento } = await supabase
      .from("interventi")
      .delete()
      .eq("id", i.id)

    if (errorIntervento) {
      console.error(errorIntervento)
      alert("Errore eliminazione intervento: " + errorIntervento.message)
      return
    }

    alert("Intervento eliminato")
    load()
  }

  async function ripristinaEApriInterventi(i) {
    if (!confirm("Vuoi ripristinare questo intervento e tornare alla pagina Interventi?")) return

    const { error } = await supabase
      .from("interventi")
      .update({ archiviato: false })
      .eq("id", i.id)

    if (error) {
      console.error(error)
      alert("Errore ripristino intervento: " + error.message)
      return
    }

    navigate("/interventi")
  }

  const interventiFiltrati = interventi.filter(i => {
    const nomeCliente = i.clienti?.nome?.toLowerCase() || ""
    const testoCliente = filtroCliente.toLowerCase().trim()

    const matchCliente = !testoCliente || nomeCliente.includes(testoCliente)
    const matchData = !filtroData || i.data === filtroData

    return matchCliente && matchData
  })

  return (
    <div style={{ padding: 20 }}>

      <h2>📦 Archivio Interventi</h2>

      <div style={{
        background: "#f8f9fa",
        border: "1px solid #ddd",
        padding: 10,
        borderRadius: 6,
        marginBottom: 15
      }}>
        Qui trovi gli interventi che hai spostato in archivio.
        <br />
        Non sono cancellati: puoi aprirli, importare materiali, ripristinarli o eliminarli.
      </div>

      <button onClick={() => navigate("/interventi")}>
        ⬅ Torna a Interventi
      </button>

      <div style={{
        marginTop: 15,
        marginBottom: 15,
        padding: 10,
        border: "1px solid #ddd",
        borderRadius: 6,
        background: "#fff",
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <input
          placeholder="🔍 Cerca cliente..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          style={{
            padding: 7,
            minWidth: 230,
            border: "1px solid #ccc",
            borderRadius: 5
          }}
        />

        <input
          type="date"
          value={filtroData}
          onChange={(e) => setFiltroData(e.target.value)}
          style={{
            padding: 7,
            border: "1px solid #ccc",
            borderRadius: 5
          }}
        />

        <button
          onClick={() => {
            setFiltroCliente("")
            setFiltroData("")
          }}
        >
          Reset filtri
        </button>

        <span>
          Risultati: <b>{interventiFiltrati.length}</b>
        </span>
      </div>

      {loading && (
        <div style={{ marginTop: 15 }}>
          Caricamento archivio...
        </div>
      )}

      {!loading && interventi.length === 0 && (
        <div style={{
          marginTop: 20,
          padding: 15,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff"
        }}>
          Nessun intervento archiviato.
        </div>
      )}

      {!loading && interventi.length > 0 && interventiFiltrati.length === 0 && (
        <div style={{
          marginTop: 20,
          padding: 15,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff"
        }}>
          Nessun intervento trovato con questi filtri.
        </div>
      )}

      {interventiFiltrati.map(i => (
        <div key={i.id} style={{
          border: "1px solid #ccc",
          marginTop: 10,
          padding: 12,
          borderRadius: 6,
          background: "white"
        }}>

          <div>
            <b>📅 Data:</b> {i.data ? dayjs(i.data).format("DD/MM/YYYY") : "-"}
          </div>

          <div>
            <b>👤 Cliente:</b> {i.clienti?.nome || "-"}
          </div>

          <div>
            <b>🏗️ Cantiere:</b> {i.cantieri?.nome || "-"}
          </div>

          <div>
            <b>📝 Descrizione:</b> {i.descrizione || "-"}
          </div>

          <div>
            <b>📦 Materiali:</b> {i.materiali_bollettino?.length || 0}
          </div>

          <div style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            flexWrap: "wrap"
          }}>

            <button onClick={() => navigate(`/bollettino/${i.id}`)}>
              👁 Apri
            </button>

            <button onClick={() => navigate(`/bolle?intervento_id=${i.id}`)}>
              📦 Bolla
            </button>

            <button onClick={() => navigate(`/carrelli?intervento_id=${i.id}`)}>
              📥 Carrello
            </button>

            <button
              onClick={() => ripristinaIntervento(i)}
              style={{ background: "#198754", color: "white" }}
            >
              ↩️ Ripristina
            </button>

            <button
              onClick={() => ripristinaEApriInterventi(i)}
              style={{ background: "#0d6efd", color: "white" }}
            >
              ✏️ Ripristina e modifica
            </button>

            <button
              onClick={() => eliminaIntervento(i)}
              style={{ background: "red", color: "white" }}
            >
              🗑 Elimina
            </button>

          </div>
        </div>
      ))}

    </div>
  )
}