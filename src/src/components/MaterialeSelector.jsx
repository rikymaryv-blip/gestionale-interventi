import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function MaterialeSelector({ onAdd }) {

  // 🔥 FILTRI
  const [quantita, setQuantita] = useState("")
  const [codice, setCodice] = useState("")
  const [descrizione, setDescrizione] = useState("")
  const [filtro1, setFiltro1] = useState("")
  const [filtro2, setFiltro2] = useState("")

  const [risultati, setRisultati] = useState([])

  // 🔥 MANUALE
  const [manuale, setManuale] = useState({
    quantita: "",
    codice: "",
    descrizione: ""
  })

  useEffect(() => {
    cerca()
  }, [codice, descrizione, filtro1, filtro2])

  async function cerca() {
    let query = supabase
      .from("articoli_listino")
      .select("codice, descrizione, ean")
      .limit(500)

    if (codice) {
      query = query.or(
        `codice.ilike.%${codice}%,ean.ilike.%${codice}%`
      )
    }

    if (descrizione) {
      query = query.ilike("descrizione", `%${descrizione}%`)
    }

    if (filtro1) {
      query = query.ilike("descrizione", `%${filtro1}%`)
    }

    if (filtro2) {
      query = query.ilike("descrizione", `%${filtro2}%`)
    }

    const { data } = await query
    setRisultati(data || [])
  }

  // 🔥 SELEZIONE LISTINO
  function seleziona(item) {
    onAdd({
      codice: item.codice,
      descrizione: item.descrizione,
      quantita: Number(quantita) || 1
    })

    resetFiltri()
  }

  // 🔥 RESET
  function resetFiltri() {
    setQuantita("")
    setCodice("")
    setDescrizione("")
    setFiltro1("")
    setFiltro2("")
    setRisultati([])
  }

  // 🔥 MANUALE
  function aggiungiManuale() {
    if (!manuale.descrizione) {
      alert("Inserisci descrizione")
      return
    }

    onAdd({
      codice: manuale.codice || "MANUALE",
      descrizione: manuale.descrizione,
      quantita: Number(manuale.quantita) || 1
    })

    setManuale({
      quantita: "",
      codice: "",
      descrizione: ""
    })
  }

  return (
    <div>

      {/* 🔥 FILTRI */}
      <div style={row}>

        <input
          type="number"
          placeholder="Qta"
          value={quantita}
          onChange={e => setQuantita(e.target.value)}
          style={inputQta}
        />

        <input
          placeholder="Codice / EAN"
          value={codice}
          onChange={e => setCodice(e.target.value)}
          style={inputCodice}
        />

        <input
          placeholder="Descrizione"
          value={descrizione}
          onChange={e => setDescrizione(e.target.value)}
          style={inputDesc}
        />

        <input
          placeholder="Parola 1"
          value={filtro1}
          onChange={e => setFiltro1(e.target.value)}
          style={input}
        />

        <input
          placeholder="Parola 2"
          value={filtro2}
          onChange={e => setFiltro2(e.target.value)}
          style={input}
        />

        <button onClick={resetFiltri}>🔄</button>

      </div>

      {/* 🔥 RISULTATI */}
      <div style={dropdown}>
        {risultati.map((r, i) => (
          <div key={i} onClick={() => seleziona(r)} style={item}>
            <strong>{r.codice}</strong>
            <div>{r.descrizione}</div>
            {r.ean && <small>EAN: {r.ean}</small>}
          </div>
        ))}
      </div>

      {/* 🔥 INSERIMENTO MANUALE */}
      <div style={manualBox}>
        <h4>➕ Inserimento manuale</h4>

        <div style={row}>

          <input
            type="number"
            placeholder="Qta"
            value={manuale.quantita}
            onChange={e =>
              setManuale({ ...manuale, quantita: e.target.value })
            }
            style={inputQta}
          />

          <input
            placeholder="Codice"
            value={manuale.codice}
            onChange={e =>
              setManuale({ ...manuale, codice: e.target.value })
            }
            style={inputCodice}
          />

          <input
            placeholder="Descrizione"
            value={manuale.descrizione}
            onChange={e =>
              setManuale({ ...manuale, descrizione: e.target.value })
            }
            style={inputDesc}
          />

          <button onClick={aggiungiManuale}>➕</button>

        </div>
      </div>

    </div>
  )
}

/* STILI */
const row = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
  alignItems: "center"
}

const input = {
  flex: 1,
  padding: 6
}

const inputQta = {
  width: 60,
  padding: 6,
  textAlign: "center"
}

const inputCodice = {
  width: 140,
  padding: 6
}

const inputDesc = {
  flex: 2,
  padding: 6
}

const dropdown = {
  border: "1px solid #ccc",
  maxHeight: 250,
  overflowY: "auto"
}

const item = {
  padding: 6,
  cursor: "pointer",
  borderBottom: "1px solid #eee"
}

const manualBox = {
  marginTop: 10,
  borderTop: "2px solid #ccc",
  paddingTop: 10
}