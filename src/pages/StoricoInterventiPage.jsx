import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"

export default function StoricoInterventiPage() {

  const [interventi, setInterventi] = useState([])
  const [clienteFiltro, setClienteFiltro] = useState("")
  const [dataDa, setDataDa] = useState("")
  const [dataA, setDataA] = useState("")

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
        clienti(nome)
      `)
      .order("data", { ascending: false })

    if (error) {
      console.error("Errore interventi:", error)
      return
    }

    setInterventi(data || [])
  }

  // 🔥 APERTURA PDF INTELLIGENTE
  async function apriPDF(id) {

    const path = `bollettini/${id}.pdf`

    const { data } = supabase
      .storage
      .from("bollettini")
      .getPublicUrl(path)

    try {
      const res = await fetch(data.publicUrl)

      if (res.ok) {
        window.open(data.publicUrl, "_blank")
        return
      }

    } catch (e) {
      console.log("PDF non trovato")
    }

    // fallback
    window.open(`/bollettino/${id}`, "_blank")
  }

  // 🔥 FILTRO
  const filtrati = interventi.filter(i => {

    const matchCliente =
      i.clienti?.nome?.toLowerCase().includes(clienteFiltro.toLowerCase())

    const dataInt = new Date(i.data)

    const matchDa = dataDa ? dataInt >= new Date(dataDa) : true
    const matchA = dataA ? dataInt <= new Date(dataA) : true

    return matchCliente && matchDa && matchA
  })

  return (
    <div style={{ padding: 20 }}>

      <h2>📂 Storico Interventi</h2>

      {/* 🔍 FILTRI */}
      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 20
      }}>

        <input
          placeholder="🔍 Cliente"
          value={clienteFiltro}
          onChange={(e) => setClienteFiltro(e.target.value)}
        />

        <div>
          Da:
          <input
            type="date"
            value={dataDa}
            onChange={(e) => setDataDa(e.target.value)}
          />
        </div>

        <div>
          A:
          <input
            type="date"
            value={dataA}
            onChange={(e) => setDataA(e.target.value)}
          />
        </div>

        <button onClick={() => {
          setClienteFiltro("")
          setDataDa("")
          setDataA("")
        }}>
          🔄 Reset
        </button>

      </div>

      {/* 📋 LISTA */}
      {filtrati.length === 0 && (
        <p>Nessun intervento trovato</p>
      )}

      {filtrati.map(i => (
        <div key={i.id} style={{
          border: "1px solid #ccc",
          padding: 10,
          marginTop: 10,
          borderRadius: 6
        }}>

          <div><b>Cliente:</b> {i.clienti?.nome}</div>
          <div><b>Data:</b> {new Date(i.data).toLocaleDateString()}</div>
          <div><b>Descrizione:</b> {i.descrizione}</div>

          <div style={{ marginTop: 10 }}>

            <button onClick={() => apriPDF(i.id)}>
              📄 PDF con firma
            </button>

          </div>

        </div>
      ))}

    </div>
  )
}