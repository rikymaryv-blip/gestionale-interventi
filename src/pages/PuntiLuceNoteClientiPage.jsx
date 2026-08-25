import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function PuntiLuceNoteClientiPage() {
  const navigate = useNavigate()

  const [progetti, setProgetti] = useState([])
  const [clienti, setClienti] = useState([])
  const [ricerca, setRicerca] = useState("")
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState("")

  useEffect(() => {
    caricaDati()
  }, [])

  async function caricaDati() {
    setCaricamento(true)
    setErrore("")

    const [risProgetti, risClienti] = await Promise.all([
      supabase
        .from("punti_luce_progetti")
        .select("id, cliente_id, serie, dati, creato_il, aggiornato_il")
        .order("aggiornato_il", { ascending: false }),
      supabase.from("clienti").select("id,nome").order("nome")
    ])

    if (risProgetti.error) {
      console.error(risProgetti.error)
      setErrore("Errore nel caricamento delle note Punti Luce.")
      setProgetti([])
    } else {
      setProgetti(risProgetti.data || [])
    }

    if (risClienti.error) {
      console.error(risClienti.error)
      setErrore((precedente) =>
        precedente
          ? precedente + " Errore nel caricamento clienti."
          : "Errore nel caricamento clienti."
      )
      setClienti([])
    } else {
      setClienti(risClienti.data || [])
    }

    setCaricamento(false)
  }

  function nomeCliente(clienteId) {
    return (
      clienti.find((cliente) => String(cliente.id) === String(clienteId))?.nome ||
      `Cliente ${clienteId}`
    )
  }

  function statistiche(progetto) {
    const dati = progetto?.dati || {}
    const stanze = Array.isArray(dati.stanze) ? dati.stanze : []
    const punti = stanze.reduce(
      (totale, stanza) =>
        totale + (Array.isArray(stanza.punti) ? stanza.punti.length : 0),
      0
    )

    const noteLinee = Array.isArray(dati.lineeGenerali)
      ? dati.lineeGenerali.filter((linea) => String(linea.note || "").trim()).length
      : 0

    const noteFilo = Array.isArray(dati.movimentiFilo)
      ? dati.movimentiFilo.filter((movimento) =>
          String(movimento.note || "").trim()
        ).length
      : 0

    return {
      stanze: stanze.length,
      punti,
      note: noteLinee + noteFilo
    }
  }

  function formattaData(valore) {
    if (!valore) return "-"

    const data = new Date(valore)
    if (Number.isNaN(data.getTime())) return "-"

    return data.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  function apriProgetto(progetto) {
    const params = new URLSearchParams()
    params.set("cliente_id", progetto.cliente_id)
    params.set("serie", progetto.serie || "")

    navigate(`/punti-luce?${params.toString()}`)
  }

  async function eliminaProgetto(progetto) {
    const cliente = nomeCliente(progetto.cliente_id)
    const conferma = window.confirm(
      `Eliminare definitivamente la nota Punti Luce di ${cliente} - ${progetto.serie}?`
    )

    if (!conferma) return

    const { error } = await supabase
      .from("punti_luce_progetti")
      .delete()
      .eq("id", progetto.id)

    if (error) {
      console.error(error)
      alert("Errore durante l'eliminazione: " + error.message)
      return
    }

    setProgetti((precedenti) =>
      precedenti.filter((elemento) => elemento.id !== progetto.id)
    )
  }

  const progettiFiltrati = useMemo(() => {
    const testo = ricerca.trim().toLowerCase()
    if (!testo) return progetti

    return progetti.filter((progetto) => {
      const cliente = nomeCliente(progetto.cliente_id).toLowerCase()
      const serie = String(progetto.serie || "").toLowerCase()
      return cliente.includes(testo) || serie.includes(testo)
    })
  }, [progetti, clienti, ricerca])

  return (
    <div style={styles.pagina}>
      <div style={styles.testata}>
        <div>
          <h1 style={styles.titolo}>📁 Note Clienti - Punti Luce</h1>
          <div style={styles.sottotitolo}>
            Tutti i progetti Punti Luce salvati online su Supabase.
          </div>
        </div>

        <div style={styles.azioniTestata}>
          <button onClick={() => navigate("/punti-luce")} style={styles.btnVerde}>
            ➕ Nuovo progetto
          </button>
          <button onClick={caricaDati} style={styles.btnSecondario}>
            🔄 Aggiorna
          </button>
        </div>
      </div>

      <div style={styles.boxRicerca}>
        <input
          value={ricerca}
          onChange={(evento) => setRicerca(evento.target.value)}
          placeholder="Cerca cliente o serie civile..."
          style={styles.input}
        />

        <div style={styles.contatore}>
          {progettiFiltrati.length} {progettiFiltrati.length === 1 ? "nota" : "note"}
        </div>
      </div>

      {errore && <div style={styles.errore}>{errore}</div>}

      {caricamento ? (
        <div style={styles.vuoto}>Caricamento note...</div>
      ) : progettiFiltrati.length === 0 ? (
        <div style={styles.vuoto}>
          <div style={{ fontSize: 34 }}>📂</div>
          <b>Nessuna nota Punti Luce salvata online.</b>
          <div style={{ marginTop: 6, color: "#667085" }}>
            Apri un progetto Punti Luce e seleziona cliente e serie per salvarlo.
          </div>
        </div>
      ) : (
        <div style={styles.griglia}>
          {progettiFiltrati.map((progetto) => {
            const stats = statistiche(progetto)

            return (
              <div key={progetto.id} style={styles.card}>
                <div style={styles.cardTestata}>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.nomeCliente}>
                      👤 {nomeCliente(progetto.cliente_id)}
                    </div>
                    <div style={styles.serie}>Serie: {progetto.serie || "-"}</div>
                  </div>

                  <div style={styles.badge}>ONLINE</div>
                </div>

                <div style={styles.infoGrid}>
                  <Info label="Stanze" value={stats.stanze} />
                  <Info label="Punti" value={stats.punti} />
                  <Info label="Note" value={stats.note} />
                </div>

                <div style={styles.data}>
                  Ultima modifica: <b>{formattaData(progetto.aggiornato_il)}</b>
                </div>

                <div style={styles.azioniCard}>
                  <button
                    onClick={() => apriProgetto(progetto)}
                    style={styles.btnApri}
                  >
                    ✏️ Apri
                  </button>

                  <button
                    onClick={() => eliminaProgetto(progetto)}
                    style={styles.btnRosso}
                  >
                    🗑 Elimina
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={styles.infoBox}>
      <div style={styles.infoLabel}>{label}</div>
      <div style={styles.infoValore}>{value}</div>
    </div>
  )
}

const styles = {
  pagina: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: 12,
    boxSizing: "border-box"
  },
  testata: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14
  },
  titolo: {
    margin: 0,
    fontSize: 28
  },
  sottotitolo: {
    marginTop: 5,
    color: "#667085"
  },
  azioniTestata: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  boxRicerca: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    padding: 12,
    background: "#f8f9fa",
    border: "1px solid #d0d5dd",
    borderRadius: 10,
    marginBottom: 14
  },
  input: {
    flex: "1 1 260px",
    minWidth: 0,
    padding: "11px 12px",
    border: "1px solid #b9c0c9",
    borderRadius: 8,
    fontSize: 16,
    boxSizing: "border-box"
  },
  contatore: {
    fontWeight: "bold",
    color: "#475467"
  },
  griglia: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12
  },
  card: {
    border: "1px solid #d0d5dd",
    borderRadius: 12,
    background: "white",
    padding: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)"
  },
  cardTestata: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10
  },
  nomeCliente: {
    fontWeight: "bold",
    fontSize: 19,
    overflowWrap: "anywhere"
  },
  serie: {
    marginTop: 4,
    color: "#475467",
    fontWeight: "bold"
  },
  badge: {
    background: "#d1e7dd",
    color: "#0f5132",
    border: "1px solid #a3cfbb",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: "bold"
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginTop: 14
  },
  infoBox: {
    background: "#f8f9fa",
    border: "1px solid #eaecf0",
    borderRadius: 8,
    padding: 8,
    textAlign: "center"
  },
  infoLabel: {
    color: "#667085",
    fontSize: 12
  },
  infoValore: {
    marginTop: 2,
    fontWeight: "bold",
    fontSize: 18
  },
  data: {
    marginTop: 12,
    color: "#475467",
    fontSize: 13
  },
  azioniCard: {
    marginTop: 14,
    display: "flex",
    gap: 8,
    flexWrap: "wrap"
  },
  btnApri: {
    flex: "1 1 120px",
    minHeight: 42,
    border: "none",
    borderRadius: 8,
    background: "#0d6efd",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "10px 14px"
  },
  btnRosso: {
    minHeight: 42,
    border: "none",
    borderRadius: 8,
    background: "#dc3545",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "10px 14px"
  },
  btnVerde: {
    minHeight: 42,
    border: "none",
    borderRadius: 8,
    background: "#198754",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "10px 14px"
  },
  btnSecondario: {
    minHeight: 42,
    border: "1px solid #b9c0c9",
    borderRadius: 8,
    background: "white",
    color: "#101828",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "10px 14px"
  },
  vuoto: {
    padding: 28,
    textAlign: "center",
    border: "1px dashed #b9c0c9",
    borderRadius: 10,
    background: "#fafafa"
  },
  errore: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    background: "#f8d7da",
    color: "#842029",
    border: "1px solid #f5c2c7",
    fontWeight: "bold"
  }
}
