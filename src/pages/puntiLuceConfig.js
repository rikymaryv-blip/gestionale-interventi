import { useEffect, useRef, useState } from "react"
import { supabase } from "../supabaseClient"

const capitoliPuntiLuce = {
  punti_luce: {
    label: "💡 Punti luce",
    voci: [
      { value: "interruttore", label: "Accensione a interruttore", moduli: 1, richiedePosti: false, postiFissi: 1 },
      { value: "deviata", label: "Accensione deviata", moduli: 2, richiedePosti: false, postiFissi: 2 },
      { value: "invertita", label: "Accensione invertita", moduli: null, richiedePosti: true, postiDefault: 3 },
      { value: "pulsante", label: "Accensione a pulsante", moduli: null, richiedePosti: true, postiDefault: 1 }
    ]
  },
  prese: {
    label: "🔌 Punti prese",
    voci: [
      { value: "presa_bipasso", label: "Presa bipasso", moduli: 1, richiedePosti: false },
      { value: "presa_schuko", label: "Presa schuko", moduli: 2, richiedePosti: false },
      { value: "presa_tv", label: "Presa TV", moduli: 1, richiedePosti: false },
      { value: "presa_dati", label: "Presa dati RJ45", moduli: 1, richiedePosti: false },
      { value: "presa_usb", label: "Presa USB", moduli: 1, richiedePosti: false }
    ]
  },
  comandi: {
    label: "🔘 Comandi",
    voci: [
      { value: "tapparella", label: "Comando tapparella", moduli: 2, richiedePosti: false },
      { value: "termostato", label: "Termostato", moduli: 3, richiedePosti: false },
      { value: "citofono", label: "Citofono", moduli: 0, richiedePosti: false }
    ]
  },
  predisposizioni: {
    label: "📦 Predisposizioni",
    voci: [
      { value: "coperchio_cieco", label: "Coperchio cieco", moduli: 0, richiedePosti: false },
      { value: "pred_clima", label: "Predisposizione climatizzatore", moduli: 0, richiedePosti: false },
      { value: "pred_forno", label: "Predisposizione forno", moduli: 0, richiedePosti: false },
      { value: "pred_lavastoviglie", label: "Predisposizione lavastoviglie", moduli: 0, richiedePosti: false },
      { value: "pred_lavatrice", label: "Predisposizione lavatrice", moduli: 0, richiedePosti: false }
    ]
  },
  altro: {
    label: "🧰 Altro",
    voci: [
      { value: "altro", label: "Altro", moduli: 1, richiedePosti: false }
    ]
  }
}

const serieCivili = ["Living", "Matix", "Linea", "Now", "Altro"]

const scatoleDisponibili = [
  { codice: "503", moduli: 3, descrizioneSupporto: "Supporto 503", descrizionePlacca: "Placca 503" },
  { codice: "504", moduli: 4, descrizioneSupporto: "Supporto 504", descrizionePlacca: "Placca 504" },
  { codice: "506", moduli: 6, descrizioneSupporto: "Supporto 506", descrizionePlacca: "Placca 506" },
  { codice: "507", moduli: 7, descrizioneSupporto: "Supporto 507", descrizionePlacca: "Placca 507" }
]

export default function PuntiLucePage() {

  const [clienti, setClienti] = useState([])
  const [clienteId, setClienteId] = useState("")
  const [serie, setSerie] = useState("")

  const [stanzaCorrente, setStanzaCorrente] = useState({
    id: Date.now(),
    nome: "",
    scatole: {
      "503": 0,
      "504": 0,
      "506": 0,
      "507": 0
    },
    punti: []
  })

  const [stanze, setStanze] = useState([])
  const [ultimoId, setUltimoId] = useState(null)

  const ultimoRef = useRef(null)

  const primoCapitolo = Object.keys(capitoliPuntiLuce)[0]

  const [nuovo, setNuovo] = useState({
    quantita: 1,
    capitolo: primoCapitolo,
    tipo: capitoliPuntiLuce[primoCapitolo].voci[0].value,
    posti: 1,
    descrizione: ""
  })

  useEffect(() => {
    caricaClienti()
  }, [])

  useEffect(() => {
    if (ultimoRef.current) {
      ultimoRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center"
      })
    }
  }, [ultimoId])

  async function caricaClienti() {
    const { data, error } = await supabase
      .from("clienti")
      .select("id,nome")
      .order("nome")

    if (error) {
      console.error(error)
      return
    }

    setClienti(data || [])
  }

  function getVoceConfig() {
    return capitoliPuntiLuce[nuovo.capitolo]
      ?.voci
      ?.find(v => v.value === nuovo.tipo)
  }

  function postiEffettivi() {
    const voce = getVoceConfig()

    if (!voce) return 1

    if (voce.richiedePosti) {
      return Number(nuovo.posti || voce.postiDefault || 1)
    }

    return voce.postiFissi || 1
  }

  function descrizioneAutomatica() {
    const voce = getVoceConfig()

    if (!voce) return ""

    if (voce.richiedePosti) {
      return `${voce.label} da ${postiEffettivi()} posti`
    }

    return voce.label
  }

  function calcolaModuliDaScatole(scatole) {
    let totale = 0

    scatoleDisponibili.forEach(s => {
      totale += Number(scatole[s.codice] || 0) * s.moduli
    })

    return totale
  }

  function calcolaModuliPunto(punto) {
    const config = capitoliPuntiLuce[punto.capitolo]
      ?.voci
      ?.find(v => v.value === punto.tipo)

    if (!config) return 0

    const qta = Number(punto.quantita || 0)

    if (config.richiedePosti) {
      return qta * Number(punto.posti || config.postiDefault || 1)
    }

    return qta * Number(config.moduli || 0)
  }

  function calcolaModuliUsati(punti) {
    return punti.reduce((tot, p) => {
      return tot + calcolaModuliPunto(p)
    }, 0)
  }

  const moduliTotaliCorrente =
    calcolaModuliDaScatole(stanzaCorrente.scatole)

  const moduliUsatiCorrente =
    calcolaModuliUsati(stanzaCorrente.punti)

  const moduliRimastiCorrente =
    moduliTotaliCorrente - moduliUsatiCorrente

  function cambiaNomeStanza(nome) {
    setStanzaCorrente({
      ...stanzaCorrente,
      nome
    })
  }

  function aggiornaScatola(tipo, valore) {
    setStanzaCorrente({
      ...stanzaCorrente,
      scatole: {
        ...stanzaCorrente.scatole,
        [tipo]: Number(valore)
      }
    })
  }

  function cambiaCapitolo(capitolo) {
    const primaVoce =
      capitoliPuntiLuce[capitolo]?.voci?.[0]

    setNuovo({
      ...nuovo,
      capitolo,
      tipo: primaVoce?.value || "",
      posti: primaVoce?.postiDefault || 1,
      descrizione: ""
    })
  }

  function aggiungiPunto() {
    if (!clienteId) {
      alert("Seleziona cliente")
      return
    }

    if (!serie) {
      alert("Seleziona serie")
      return
    }

    if (!stanzaCorrente.nome.trim()) {
      alert("Inserisci stanza")
      return
    }

    const nuovoPunto = {
      id: Date.now(),
      quantita: Number(nuovo.quantita),
      capitolo: nuovo.capitolo,
      tipo: nuovo.tipo,
      posti: postiEffettivi(),
      descrizione:
        nuovo.descrizione.trim() ||
        descrizioneAutomatica()
    }

    const moduliNuovo =
      calcolaModuliPunto(nuovoPunto)

    if (moduliNuovo > moduliRimastiCorrente) {
      alert("Moduli insufficienti")
      return
    }

    setStanzaCorrente({
      ...stanzaCorrente,
      punti: [
        ...stanzaCorrente.punti,
        nuovoPunto
      ]
    })

    setUltimoId(nuovoPunto.id)

    setNuovo({
      ...nuovo,
      quantita: 1,
      descrizione: ""
    })
  }

  function salvaStanzaCorrente() {
    if (!stanzaCorrente.nome.trim()) return

    const esiste =
      stanze.find(s => s.id === stanzaCorrente.id)

    if (esiste) {
      setStanze(
        stanze.map(s =>
          s.id === stanzaCorrente.id
            ? stanzaCorrente
            : s
        )
      )
    } else {
      setStanze([
        ...stanze,
        stanzaCorrente
      ])
    }
  }

  function nuovaStanza() {
    salvaStanzaCorrente()

    setStanzaCorrente({
      id: Date.now(),
      nome: "",
      scatole: {
        "503": 0,
        "504": 0,
        "506": 0,
        "507": 0
      },
      punti: []
    })

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    })
  }

  function eliminaPunto(id) {
    setStanzaCorrente({
      ...stanzaCorrente,
      punti:
        stanzaCorrente.punti.filter(p => p.id !== id)
    })
  }

  const clienteSelezionato =
    clienti.find(c =>
      String(c.id) === String(clienteId)
    )

  const stanzeDaMostrare = [
    ...stanze.filter(s =>
      s.id !== stanzaCorrente.id
    ),
    ...(stanzaCorrente.nome.trim()
      ? [stanzaCorrente]
      : [])
  ]

  const input = {
    width: "100%",
    padding: 7,
    border: "1px solid #ccc",
    borderRadius: 5,
    boxSizing: "border-box"
  }

  const box = {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    background: "#fafafa"
  }

  const th = {
    border: "1px solid #ccc",
    padding: 7,
    background: "#eee",
    textAlign: "left"
  }

  const td = {
    border: "1px solid #ccc",
    padding: 7
  }

  return (
    <div style={{
      padding: 15,
      maxWidth: 1200,
      margin: "auto"
    }}>

      <h1>💡 Progetto Punti Luce</h1>

      <div style={box}>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10
        }}>

          <div>
            <label>Cliente</label>

            <select
              value={clienteId}
              onChange={(e) =>
                setClienteId(e.target.value)
              }
              style={input}
            >
              <option value="">
                -- seleziona cliente --
              </option>

              {clienti.map(c => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Serie civile</label>

            <select
              value={serie}
              onChange={(e) =>
                setSerie(e.target.value)
              }
              style={input}
            >
              <option value="">
                -- seleziona serie --
              </option>

              {serieCivili.map(s => (
                <option
                  key={s}
                  value={s}
                >
                  {s}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "white",
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 10,
        marginTop: 10
      }}>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1.5fr repeat(3, 100px) 120px",
          gap: 8,
          alignItems: "end"
        }}>

          <div>
            <label>Stanza</label>

            <input
              value={stanzaCorrente.nome}
              onChange={(e) =>
                cambiaNomeStanza(e.target.value)
              }
              placeholder="Esempio: Cucina"
              style={input}
            />
          </div>

          <MiniBox
            titolo="Totali"
            valore={moduliTotaliCorrente}
          />

          <MiniBox
            titolo="Usati"
            valore={moduliUsatiCorrente}
          />

          <MiniBox
            titolo="Rimasti"
            valore={moduliRimastiCorrente}
            danger={moduliRimastiCorrente < 0}
          />

          <button
            onClick={nuovaStanza}
            style={btnVerde}
          >
            ➕ Stanza
          </button>

        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 8,
          marginTop: 10
        }}>

          {scatoleDisponibili.map(s => (

            <div key={s.codice}>
              <label>{s.codice}</label>

              <input
                type="number"
                min="0"
                value={
                  stanzaCorrente.scatole[s.codice]
                }
                onChange={(e) =>
                  aggiornaScatola(
                    s.codice,
                    e.target.value
                  )
                }
                style={input}
              />
            </div>

          ))}

        </div>
      </div>

      <div style={{
        position: "sticky",
        top: 150,
        zIndex: 15,
        background: "white",
        border: "1px solid #ccc",
        borderRadius: 8,
        padding: 10,
        marginTop: 10
      }}>

        <div style={{
          display: "grid",
          gridTemplateColumns:
            "90px 170px 240px 120px 1fr 120px",
          gap: 8,
          alignItems: "end"
        }}>

          <div>
            <label>Q.tà</label>

            <input
              type="number"
              min="1"
              value={nuovo.quantita}
              onChange={(e) =>
                setNuovo({
                  ...nuovo,
                  quantita: e.target.value
                })
              }
              style={input}
            />
          </div>

          <div>
            <label>Capitolo</label>

            <select
              value={nuovo.capitolo}
              onChange={(e) =>
                cambiaCapitolo(e.target.value)
              }
              style={input}
            >
              {Object.entries(capitoliPuntiLuce)
                .map(([key, value]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {value.label}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label>Cosa inserisco</label>

            <select
              value={nuovo.tipo}
              onChange={(e) =>
                setNuovo({
                  ...nuovo,
                  tipo: e.target.value
                })
              }
              style={input}
            >
              {capitoliPuntiLuce[
                nuovo.capitolo
              ]?.voci?.map(v => (
                <option
                  key={v.value}
                  value={v.value}
                >
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Posti</label>

            <input
              type="number"
              min="1"
              disabled={
                !getVoceConfig()?.richiedePosti
              }
              value={postiEffettivi()}
              onChange={(e) =>
                setNuovo({
                  ...nuovo,
                  posti: e.target.value
                })
              }
              style={{
                ...input,
                background:
                  !getVoceConfig()?.richiedePosti
                    ? "#eee"
                    : "white"
              }}
            />
          </div>

          <div>
            <label>Descrizione / note</label>

            <input
              value={nuovo.descrizione}
              onChange={(e) =>
                setNuovo({
                  ...nuovo,
                  descrizione: e.target.value
                })
              }
              placeholder={descrizioneAutomatica()}
              style={input}
            />
          </div>

          <button
            onClick={aggiungiPunto}
            style={btnVerde}
          >
            Aggiungi
          </button>

        </div>

        <div style={{
          marginTop: 10,
          padding: 8,
          borderRadius: 6,
          background: "#e7f1ff",
          border: "1px solid #9ec5fe"
        }}>

          <b>Stai inserendo:</b>{" "}

          {nuovo.quantita} ×{" "}

          {nuovo.descrizione.trim() || descrizioneAutomatica()}{" "}

          — moduli{" "}

          <b>
            {
              calcolaModuliPunto({
                quantita: nuovo.quantita,
                capitolo: nuovo.capitolo,
                tipo: nuovo.tipo,
                posti: postiEffettivi()
              })
            }
          </b>

        </div>
      </div>

      <div style={box}>

        <h3>📋 Riepilogo progetto</h3>

        <div style={{
          marginBottom: 10
        }}>
          <b>Cliente:</b>{" "}
          {clienteSelezionato?.nome || "-"}
          {" | "}
          <b>Serie:</b>{" "}
          {serie || "-"}
        </div>

        {stanzeDaMostrare.length === 0 && (
          <div>Nessuna stanza inserita.</div>
        )}

        {stanzeDaMostrare.map(stanza => {

          const moduliTotali =
            calcolaModuliDaScatole(stanza.scatole)

          const moduliUsati =
            calcolaModuliUsati(stanza.punti)

          const moduliRimasti =
            moduliTotali - moduliUsati

          return (

            <div
              key={stanza.id}
              style={{
                marginTop: 20,
                padding: 10,
                border:
                  stanza.id === stanzaCorrente.id
                    ? "3px solid #0d6efd"
                    : "2px solid #ddd",
                borderRadius: 8,
                background: "white"
              }}
            >

              <h3>🏠 {stanza.nome}</h3>

              <div style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3,120px)",
                gap: 8,
                marginBottom: 12
              }}>

                <MiniBox
                  titolo="Totali"
                  valore={moduliTotali}
                />

                <MiniBox
                  titolo="Usati"
                  valore={moduliUsati}
                />

                <MiniBox
                  titolo="Rimasti"
                  valore={moduliRimasti}
                  danger={moduliRimasti < 0}
                />

              </div>

              <h4>📦 Materiali base</h4>

              <table style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: 15
              }}>

                <thead>
                  <tr>
                    <th style={th}>
                      Quantità
                    </th>

                    <th style={th}>
                      Descrizione
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {scatoleDisponibili.map(s => {

                    const qta =
                      stanza.scatole[s.codice]

                    if (!qta) return null

                    return (
                      <tr key={s.codice}>
                        <td style={td}>
                          {qta}
                        </td>

                        <td style={td}>
                          {s.descrizioneSupporto}
                          {" + "}
                          {s.descrizionePlacca}
                        </td>
                      </tr>
                    )
                  })}

                </tbody>
              </table>

              {Object.entries(capitoliPuntiLuce)
                .map(([key, value]) => {

                  const lista =
                    stanza.punti.filter(
                      p => p.capitolo === key
                    )

                  if (lista.length === 0) {
                    return null
                  }

                  return (

                    <div
                      key={key}
                      style={{
                        marginTop: 15
                      }}
                    >

                      <h4>{value.label}</h4>

                      <table style={{
                        width: "100%",
                        borderCollapse: "collapse"
                      }}>

                        <thead>
                          <tr>

                            <th style={th}>
                              Q.tà
                            </th>

                            <th style={th}>
                              Descrizione
                            </th>

                            <th style={th}>
                              Posti
                            </th>

                            <th style={th}>
                              Moduli
                            </th>

                            <th style={th}>
                              Azioni
                            </th>

                          </tr>
                        </thead>

                        <tbody>

                          {lista.map(p => (

                            <tr
                              key={p.id}
                              ref={
                                p.id === ultimoId
                                  ? ultimoRef
                                  : null
                              }
                              style={{
                                background:
                                  p.id === ultimoId
                                    ? "#fff3cd"
                                    : "white"
                              }}
                            >

                              <td style={td}>
                                {p.quantita}
                              </td>

                              <td style={td}>
                                {p.descrizione}
                              </td>

                              <td style={td}>
                                {p.posti}
                              </td>

                              <td style={td}>
                                {
                                  calcolaModuliPunto(p)
                                }
                              </td>

                              <td style={td}>

                                <button
                                  onClick={() =>
                                    eliminaPunto(p.id)
                                  }
                                  style={btnRosso}
                                >
                                  Elimina
                                </button>

                              </td>

                            </tr>

                          ))}

                        </tbody>

                      </table>

                    </div>

                  )
                })}

            </div>

          )
        })}

      </div>

    </div>
  )
}

function MiniBox({
  titolo,
  valore,
  danger = false
}) {

  return (
    <div style={{
      border: "1px solid #ccc",
      borderRadius: 6,
      padding: 6,
      background:
        danger
          ? "#f8d7da"
          : "#f8f9fa",
      textAlign: "center"
    }}>
      <b>{titolo}</b>

      <div style={{
        fontSize: 20,
        fontWeight: "bold"
      }}>
        {valore}
      </div>
    </div>
  )
}

const btnVerde = {
  padding: 8,
  borderRadius: 6,
  border: "none",
  background: "#198754",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
}

const btnRosso = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "red",
  color: "white",
  cursor: "pointer"
}