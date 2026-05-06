import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function PreferitiPage() {

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const interventoId = searchParams.get("intervento_id")

  const [preferiti, setPreferiti] = useState([])
  const [ricerca, setRicerca] = useState("")
  const [quantita, setQuantita] = useState({})
  const [soloConPrezzo, setSoloConPrezzo] = useState(false)

  useEffect(() => {
    caricaPreferiti()
  }, [])

  function tornaAllIntervento() {
    if (!interventoId) {
      navigate("/interventi")
      return
    }

    navigate(`/interventi?edit_id=${interventoId}`)
  }

  async function caricaPreferiti() {
    const { data, error } = await supabase
      .from("articoli_preferiti")
      .select("*")
      .order("ultimo_utilizzo", { ascending: false })
      .limit(1000)

    if (error) {
      console.error(error)
      alert("Errore caricamento preferiti: " + error.message)
      return
    }

    setPreferiti(data || [])
  }

  function formatPrezzo(v) {
    const n = Number(v || 0)

    return n.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR"
    })
  }

  function formatData(v) {
    if (!v) return "-"
    return new Date(v).toLocaleDateString("it-IT")
  }

  async function importaPreferito(item) {
    if (!interventoId) {
      alert("Intervento non trovato. Torna negli interventi e riapri Preferiti da lì.")
      return
    }

    const qta = Number(quantita[item.id] || 1)
    const prezzo = Number(item.prezzo || 0)
    const totale = qta * prezzo

    if (qta <= 0) {
      alert("Inserisci una quantità valida")
      return
    }

    const { error } = await supabase
      .from("materiali_bollettino")
      .insert({
        intervento_id: interventoId,
        codice: item.codice || "",
        descrizione: item.descrizione || "",
        quantita: qta,
        prezzo,
        totale
      })

    if (error) {
      console.error(error)
      alert("Errore importazione materiale: " + error.message)
      return
    }

    alert("✅ Materiale importato nell’intervento")
  }

  const preferitiFiltrati = preferiti.filter(p => {
    const testo = ricerca.toLowerCase().trim()

    const codice = p.codice?.toLowerCase() || ""
    const descrizione = p.descrizione?.toLowerCase() || ""

    const matchTesto =
      !testo ||
      codice.includes(testo) ||
      descrizione.includes(testo)

    const matchPrezzo =
      !soloConPrezzo || Number(p.prezzo || 0) > 0

    return matchTesto && matchPrezzo
  })

  return (
    <div style={{ padding: 20 }}>

      <h2>⭐ Materiali Preferiti</h2>

      {interventoId ? (
        <div style={{
          background: "#e7f1ff",
          border: "1px solid #9ec5fe",
          padding: 10,
          borderRadius: 6,
          marginBottom: 12
        }}>
          Stai importando materiali nell’intervento <b>#{interventoId}</b>

          <br />

          <button
            onClick={tornaAllIntervento}
            style={{
              marginTop: 10,
              background: "#0d6efd",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: "pointer"
            }}
          >
            ⬅ Torna all’intervento
          </button>
        </div>
      ) : (
        <div style={{
          background: "#fff3cd",
          border: "1px solid #ffeeba",
          padding: 10,
          borderRadius: 6,
          marginBottom: 12
        }}>
          Consultazione preferiti. Se vuoi importare un materiale in un intervento, apri questa pagina dal tasto ⭐ Preferiti dentro l’intervento.
        </div>
      )}

      {!interventoId && (
        <button onClick={() => navigate("/interventi")}>
          ⬅ Torna a Interventi
        </button>
      )}

      <div style={{
        marginTop: 15,
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <input
          placeholder="Cerca per codice o descrizione..."
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          style={{
            flex: 1,
            minWidth: 260,
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 5
          }}
        />

        <label style={{
          display: "flex",
          gap: 6,
          alignItems: "center"
        }}>
          <input
            type="checkbox"
            checked={soloConPrezzo}
            onChange={(e) => setSoloConPrezzo(e.target.checked)}
          />
          Solo con prezzo
        </label>

        <button
          onClick={() => {
            setRicerca("")
            setSoloConPrezzo(false)
          }}
        >
          Reset
        </button>

        <button onClick={caricaPreferiti}>
          🔄 Aggiorna
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        Risultati: <b>{preferitiFiltrati.length}</b>
      </div>

      {preferitiFiltrati.map(item => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginTop: 8,
            borderRadius: 6,
            background: "white",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div>
              <b>{item.codice || "-"}</b>
            </div>

            <div>
              {item.descrizione || "-"}
            </div>

            <div style={{
              marginTop: 5,
              fontSize: 13,
              color: "#555",
              display: "flex",
              gap: 12,
              flexWrap: "wrap"
            }}>
              <span>
                Prezzo: <b>{formatPrezzo(item.prezzo)}</b>
              </span>

              <span>
                Usato: <b>{item.volte_usato || 0}</b> volte
              </span>

              <span>
                Qta totale: <b>{item.quantita_totale || 0}</b>
              </span>

              <span>
                Ultimo utilizzo: <b>{formatData(item.ultimo_utilizzo)}</b>
              </span>
            </div>
          </div>

          {interventoId && (
            <>
              <input
                type="number"
                value={quantita[item.id] || 1}
                onChange={(e) => setQuantita(prev => ({
                  ...prev,
                  [item.id]: e.target.value
                }))}
                style={{ width: 80, padding: 6 }}
              />

              <button onClick={() => importaPreferito(item)}>
                ➕ Importa
              </button>
            </>
          )}
        </div>
      ))}

    </div>
  )
}