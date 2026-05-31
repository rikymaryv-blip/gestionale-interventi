import { useEffect, useState } from "react"
import dayjs from "dayjs"
import { supabase } from "../supabaseClient"
import { useNavigate } from "react-router-dom"

export default function FatturePage() {
  const [clientiMap, setClientiMap] = useState({})
  const [selezionati, setSelezionati] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

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
      .or("archiviato.is.null,archiviato.eq.false")
      .order("data", { ascending: true })

    setLoading(false)

    if (error) {
      console.error("ERRORE LOAD:", error)
      alert("Errore caricamento interventi")
      return
    }

    const map = {}

    data?.forEach((i) => {
      const nome = i.clienti?.nome || "Senza nome"

      if (!map[nome]) map[nome] = []
      map[nome].push(i)
    })

    setClientiMap(map)
    setSelezionati({})
  }

  async function getNomeOperatore(id) {
    if (!id) return "Operatore"

    const { data } = await supabase
      .from("operatori")
      .select("nome")
      .eq("id", id)
      .single()

    return data?.nome || "Operatore"
  }

  function toggleIntervento(cliente, id) {
    setSelezionati((prev) => {
      const attuali = prev[cliente] || []

      const nuovi = attuali.includes(id)
        ? attuali.filter((x) => x !== id)
        : [...attuali, id]

      return {
        ...prev,
        [cliente]: nuovi,
      }
    })
  }

  function selezionaTuttiCliente(cliente) {
    const lista = clientiMap[cliente] || []
    const tuttiId = lista.map((i) => i.id)

    setSelezionati((prev) => ({
      ...prev,
      [cliente]: tuttiId,
    }))
  }

  function deselezionaTuttiCliente(cliente) {
    setSelezionati((prev) => ({
      ...prev,
      [cliente]: [],
    }))
  }

  async function creaFattura(cliente) {
    const listaCompleta = clientiMap[cliente] || []
    const idsSelezionati = selezionati[cliente] || []

    const lista = listaCompleta.filter((i) => idsSelezionati.includes(i.id))

    if (lista.length === 0) {
      alert("Seleziona almeno un intervento da fatturare")
      return
    }

    const conferma = window.confirm(
      `Vuoi creare la fattura per ${lista.length} interventi di ${cliente}?`
    )

    if (!conferma) return

    const { data: fattura, error } = await supabase
      .from("fatture")
      .insert([
        {
          cliente_nome: cliente,
          data: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error || !fattura) {
      console.error(error)
      alert("Errore creazione fattura. Controlla che la tabella fatture esista.")
      return
    }

    for (const i of lista) {
      for (const o of i.ore_operatori || []) {
        const nomeOperatore = await getNomeOperatore(o.operatore_id)

        await supabase.from("fatture_righe").insert({
          fattura_id: fattura.id,
          data: i.data,
          descrizione: i.descrizione,
          operatore: nomeOperatore,
          ore: o.ore,
        })
      }

      for (const m of i.materiali_bollettino || []) {
        await supabase.from("fatture_righe").insert({
          fattura_id: fattura.id,
          data: i.data,
          descrizione: i.descrizione,
          codice: m.codice || "",
          materiale: m.descrizione || "",
          quantita: m.quantita || 0,
        })
      }
    }

    await supabase
      .from("interventi")
      .update({ archiviato: true })
      .in(
        "id",
        lista.map((i) => i.id)
      )

    alert("✅ Fattura salvata")

    navigate("/storico-fatture")
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>💰 Fatture</h2>

      <div style={{ marginBottom: 15 }}>
        <button onClick={() => navigate("/storico-fatture")} style={topButton}>
          📜 Vai allo Storico
        </button>

        <button onClick={load} style={topButton}>
          🔄 Aggiorna interventi
        </button>
      </div>

      {loading && <p>Caricamento interventi...</p>}

      {!loading && Object.keys(clientiMap).length === 0 && (
        <p>Nessun intervento da fatturare</p>
      )}

      {Object.keys(clientiMap).map((cliente) => {
        const lista = clientiMap[cliente]
        const idsSelezionati = selezionati[cliente] || []
        const listaSelezionata = lista.filter((i) =>
          idsSelezionati.includes(i.id)
        )

        const totaleOre = listaSelezionata.reduce(
          (tot, i) =>
            tot +
            (i.ore_operatori || []).reduce(
              (t, o) => t + Number(o.ore || 0),
              0
            ),
          0
        )

        const totaleMateriali = listaSelezionata.reduce(
          (tot, i) =>
            tot +
            (i.materiali_bollettino || []).reduce(
              (t, m) => t + Number(m.quantita || 0),
              0
            ),
          0
        )

        return (
          <div key={cliente} style={cardCliente}>
            <h3>{cliente}</h3>

            <div style={{ marginBottom: 10 }}>
              <strong>Selezionati:</strong> {listaSelezionata.length} /{" "}
              {lista.length}
            </div>

            <div>👷 Ore selezionate: {totaleOre}</div>
            <div>📦 Materiali selezionati: {totaleMateriali}</div>

            <div style={{ marginTop: 10, marginBottom: 10 }}>
              <button
                onClick={() => selezionaTuttiCliente(cliente)}
                style={smallButton}
              >
                ✅ Seleziona tutti
              </button>

              <button
                onClick={() => deselezionaTuttiCliente(cliente)}
                style={smallButton}
              >
                ❌ Deseleziona
              </button>
            </div>

            <hr />

            {lista.map((i) => {
              const checked = idsSelezionati.includes(i.id)

              return (
                <div key={i.id} style={rigaIntervento}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleIntervento(cliente, i.id)}
                    style={{ width: 20, height: 20 }}
                  />

                  <div>
                    <div>
                      📅 {dayjs(i.data).format("DD/MM/YYYY")} -{" "}
                      {i.descrizione}
                    </div>

                    <small>
                      Ore:{" "}
                      {(i.ore_operatori || []).reduce(
                        (t, o) => t + Number(o.ore || 0),
                        0
                      )}{" "}
                      | Materiali:{" "}
                      {(i.materiali_bollettino || []).reduce(
                        (t, m) => t + Number(m.quantita || 0),
                        0
                      )}
                    </small>
                  </div>
                </div>
              )
            })}

            <br />

            <button onClick={() => creaFattura(cliente)} style={createButton}>
              💾 Crea fattura con selezionati
            </button>
          </div>
        )
      })}
    </div>
  )
}

const topButton = {
  marginRight: 10,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  cursor: "pointer",
}

const cardCliente = {
  border: "1px solid #ccc",
  marginTop: 15,
  padding: 15,
  borderRadius: 8,
  background: "#fff",
}

const rigaIntervento = {
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "8px 0",
  borderBottom: "1px solid #eee",
}

const smallButton = {
  marginRight: 8,
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
  cursor: "pointer",
}

const createButton = {
  background: "#198754",
  color: "white",
  border: "none",
  padding: "10px 14px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: "bold",
}