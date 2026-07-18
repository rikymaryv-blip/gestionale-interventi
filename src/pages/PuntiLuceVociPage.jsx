import { useEffect, useMemo, useState } from "react"
import { supabase } from "../supabaseClient"

const CAPITOLI_STANDARD = [
  { value: "punti_luce", label: "💡 Punti luce" },
  { value: "prese", label: "🔌 Prese" },
  { value: "comandi", label: "🔘 Comandi" },
  { value: "predisposizioni", label: "📦 Predisposizioni" },
  { value: "altro", label: "🧰 Altro" }
]

function creaVoceVuota() {
  return {
    capitolo: "punti_luce",
    voce: "",
    moduli: 1,
    richiede_posti: false,
    posti_fissi: 1,
    posti_default: 1,
    ordine: 1,
    attivo: true
  }
}

function numeroOZero(valore) {
  const numero = Number(valore)
  return Number.isFinite(numero) ? numero : 0
}

function numeroONull(valore) {
  if (valore === "" || valore === null || valore === undefined) return null
  const numero = Number(valore)
  return Number.isFinite(numero) ? numero : null
}

function preparaVocePerForm(voce) {
  return {
    id: voce.id,
    capitolo: voce.capitolo || "altro",
    voce: voce.voce || "",
    moduli: voce.moduli ?? 0,
    richiede_posti: Boolean(voce.richiede_posti),
    posti_fissi: voce.posti_fissi ?? 1,
    posti_default: voce.posti_default ?? 1,
    ordine: voce.ordine ?? 1,
    attivo: voce.attivo !== false
  }
}

function preparaPayload(form) {
  const richiedePosti = Boolean(form.richiede_posti)

  return {
    capitolo: String(form.capitolo || "altro").trim(),
    voce: String(form.voce || "").trim(),
    moduli: richiedePosti ? null : numeroOZero(form.moduli),
    richiede_posti: richiedePosti,
    posti_fissi: richiedePosti ? null : Math.max(1, numeroOZero(form.posti_fissi) || 1),
    posti_default: richiedePosti
      ? Math.max(1, numeroOZero(form.posti_default) || 1)
      : Math.max(1, numeroOZero(form.posti_fissi) || 1),
    ordine: Math.max(0, numeroOZero(form.ordine)),
    attivo: Boolean(form.attivo)
  }
}

function etichettaCapitolo(capitolo) {
  return (
    CAPITOLI_STANDARD.find((item) => item.value === capitolo)?.label ||
    String(capitolo || "").replaceAll("_", " ")
  )
}

function aggiornaProgettiLocali(vecchiaVoce, nuovaVoce) {
  if (typeof window === "undefined") return 0

  let progettiAggiornati = 0

  for (let indice = 0; indice < window.localStorage.length; indice += 1) {
    const chiave = window.localStorage.key(indice)

    if (
      !chiave ||
      (!chiave.startsWith("punti_luce_v2_") &&
        !chiave.startsWith("punti_luce_v3_"))
    ) {
      continue
    }

    try {
      const testo = window.localStorage.getItem(chiave)
      if (!testo) continue

      const progetto = JSON.parse(testo)
      if (!Array.isArray(progetto.stanze)) continue

      let modificato = false

      const stanzeAggiornate = progetto.stanze.map((stanza) => ({
        ...stanza,
        punti: Array.isArray(stanza.punti)
          ? stanza.punti.map((punto) => {
              const stessoCapitolo =
                String(punto.capitolo) === String(vecchiaVoce.capitolo)
              const stessaVoce =
                String(punto.tipo) === String(vecchiaVoce.voce)

              if (!stessoCapitolo || !stessaVoce) return punto

              modificato = true

              let nuovaDescrizione = punto.descrizione

              if (String(punto.descrizione || "") === String(vecchiaVoce.voce)) {
                nuovaDescrizione = nuovaVoce.voce
              } else if (
                String(punto.descrizione || "").startsWith(
                  `${vecchiaVoce.voce} da `
                )
              ) {
                nuovaDescrizione = String(punto.descrizione).replace(
                  vecchiaVoce.voce,
                  nuovaVoce.voce
                )
              }

              return {
                ...punto,
                capitolo: nuovaVoce.capitolo,
                tipo: nuovaVoce.voce,
                descrizione: nuovaDescrizione
              }
            })
          : []
      }))

      if (modificato) {
        window.localStorage.setItem(
          chiave,
          JSON.stringify({
            ...progetto,
            stanze: stanzeAggiornate,
            aggiornatoIl: new Date().toISOString()
          })
        )
        progettiAggiornati += 1
      }
    } catch (error) {
      console.warn(`Impossibile aggiornare il progetto locale ${chiave}`, error)
    }
  }

  return progettiAggiornati
}

function aggiornaCapitoloProgettiLocali(vecchioCapitolo, nuovoCapitolo) {
  if (typeof window === "undefined") return 0

  let progettiAggiornati = 0

  for (let indice = 0; indice < window.localStorage.length; indice += 1) {
    const chiave = window.localStorage.key(indice)

    if (
      !chiave ||
      (!chiave.startsWith("punti_luce_v2_") &&
        !chiave.startsWith("punti_luce_v3_"))
    ) {
      continue
    }

    try {
      const testo = window.localStorage.getItem(chiave)
      if (!testo) continue

      const progetto = JSON.parse(testo)
      if (!Array.isArray(progetto.stanze)) continue

      let modificato = false

      const stanzeAggiornate = progetto.stanze.map((stanza) => ({
        ...stanza,
        punti: Array.isArray(stanza.punti)
          ? stanza.punti.map((punto) => {
              if (String(punto.capitolo) !== String(vecchioCapitolo)) {
                return punto
              }

              modificato = true

              return {
                ...punto,
                capitolo: nuovoCapitolo
              }
            })
          : []
      }))

      if (modificato) {
        window.localStorage.setItem(
          chiave,
          JSON.stringify({
            ...progetto,
            stanze: stanzeAggiornate,
            aggiornatoIl: new Date().toISOString()
          })
        )

        progettiAggiornati += 1
      }
    } catch (error) {
      console.warn(
        `Impossibile aggiornare il capitolo nel progetto locale ${chiave}`,
        error
      )
    }
  }

  return progettiAggiornati
}

export default function PuntiLuceVociPage() {
  const [voci, setVoci] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState("")
  const [messaggio, setMessaggio] = useState("")

  const [ricerca, setRicerca] = useState("")
  const [filtroCapitolo, setFiltroCapitolo] = useState("tutti")
  const [mostraDisattive, setMostraDisattive] = useState(true)

  const [nuovaVoce, setNuovaVoce] = useState(() => creaVoceVuota())
  const [idInModifica, setIdInModifica] = useState(null)
  const [formModifica, setFormModifica] = useState(null)
  const [voceOriginale, setVoceOriginale] = useState(null)

  const [capitoloInModifica, setCapitoloInModifica] = useState("")
  const [nuovoNomeCapitolo, setNuovoNomeCapitolo] = useState("")

  useEffect(() => {
    caricaVoci()
  }, [])

  useEffect(() => {
    if (!messaggio) return

    const timer = window.setTimeout(() => {
      setMessaggio("")
    }, 3200)

    return () => window.clearTimeout(timer)
  }, [messaggio])

  async function caricaVoci() {
    setCaricamento(true)
    setErrore("")

    const { data, error } = await supabase
      .from("punti_luce_voci")
      .select("*")
      .order("capitolo", { ascending: true })
      .order("ordine", { ascending: true })
      .order("voce", { ascending: true })

    if (error) {
      console.error(error)
      setErrore(`Errore caricamento voci: ${error.message}`)
      setVoci([])
      setCaricamento(false)
      return
    }

    setVoci(data || [])
    setCaricamento(false)
  }

  const capitoliEsistenti = useMemo(() => {
    const insieme = new Set()

    voci.forEach((voce) => {
      if (voce.capitolo) insieme.add(voce.capitolo)
    })

    return [...insieme].sort((a, b) =>
      etichettaCapitolo(a).localeCompare(etichettaCapitolo(b), "it")
    )
  }, [voci])

  const capitoliDisponibili = useMemo(() => {
    if (capitoliEsistenti.length > 0) return capitoliEsistenti

    return CAPITOLI_STANDARD.map((item) => item.value)
  }, [capitoliEsistenti])

  const vociFiltrate = useMemo(() => {
    const testo = ricerca.trim().toLowerCase()

    return voci.filter((voce) => {
      const passaCapitolo =
        filtroCapitolo === "tutti" || voce.capitolo === filtroCapitolo

      const passaAttivo = mostraDisattive || voce.attivo !== false

      const passaRicerca =
        !testo ||
        String(voce.voce || "").toLowerCase().includes(testo) ||
        String(voce.capitolo || "").toLowerCase().includes(testo)

      return passaCapitolo && passaAttivo && passaRicerca
    })
  }, [voci, ricerca, filtroCapitolo, mostraDisattive])

  const vociRaggruppate = useMemo(() => {
    const gruppi = new Map()

    vociFiltrate.forEach((voce) => {
      const capitolo = voce.capitolo || "altro"

      if (!gruppi.has(capitolo)) {
        gruppi.set(capitolo, [])
      }

      gruppi.get(capitolo).push(voce)
    })

    return [...gruppi.entries()]
  }, [vociFiltrate])

  function validaForm(form) {
    if (!String(form.capitolo || "").trim()) {
      alert("Inserisci il capitolo")
      return false
    }

    if (!String(form.voce || "").trim()) {
      alert("Inserisci il nome della voce")
      return false
    }

    if (!form.richiede_posti && numeroONull(form.moduli) === null) {
      alert("Inserisci il numero di moduli")
      return false
    }

    return true
  }

  async function aggiungiVoce() {
    if (!validaForm(nuovaVoce)) return

    setSalvataggio(true)
    setErrore("")

    const payload = preparaPayload(nuovaVoce)

    const { data, error } = await supabase
      .from("punti_luce_voci")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      console.error(error)
      setErrore(`Errore creazione voce: ${error.message}`)
      setSalvataggio(false)
      return
    }

    setVoci((precedenti) => [...precedenti, data])
    setNuovaVoce({
      ...creaVoceVuota(),
      capitolo: nuovaVoce.capitolo,
      ordine: numeroOZero(nuovaVoce.ordine) + 1
    })
    setMessaggio(`Voce "${data.voce}" creata`)
    setSalvataggio(false)
  }

  function iniziaModifica(voce) {
    setIdInModifica(voce.id)
    setVoceOriginale({
      capitolo: voce.capitolo,
      voce: voce.voce
    })
    setFormModifica(preparaVocePerForm(voce))
    setErrore("")
  }

  function annullaModifica() {
    setIdInModifica(null)
    setFormModifica(null)
    setVoceOriginale(null)
  }

  async function salvaModifica() {
    if (!formModifica || !validaForm(formModifica)) return

    setSalvataggio(true)
    setErrore("")

    const payload = preparaPayload(formModifica)

    const { data, error } = await supabase
      .from("punti_luce_voci")
      .update(payload)
      .eq("id", formModifica.id)
      .select("*")
      .single()

    if (error) {
      console.error(error)
      setErrore(`Errore salvataggio modifiche: ${error.message}`)
      setSalvataggio(false)
      return
    }

    let progettiAggiornati = 0

    if (
      voceOriginale &&
      (voceOriginale.voce !== data.voce ||
        voceOriginale.capitolo !== data.capitolo)
    ) {
      progettiAggiornati = aggiornaProgettiLocali(voceOriginale, {
        capitolo: data.capitolo,
        voce: data.voce
      })
    }

    setVoci((precedenti) =>
      precedenti.map((voce) => (voce.id === data.id ? data : voce))
    )

    annullaModifica()
    setSalvataggio(false)

    setMessaggio(
      progettiAggiornati > 0
        ? `Voce modificata. Aggiornati anche ${progettiAggiornati} progetti salvati in questo browser.`
        : `Voce "${data.voce}" modificata`
    )
  }

  async function duplicaVoce(voce) {
    setSalvataggio(true)
    setErrore("")

    const payload = preparaPayload({
      ...preparaVocePerForm(voce),
      voce: `${voce.voce} copia`,
      ordine: numeroOZero(voce.ordine) + 1,
      attivo: true
    })

    const { data, error } = await supabase
      .from("punti_luce_voci")
      .insert(payload)
      .select("*")
      .single()

    if (error) {
      console.error(error)
      setErrore(`Errore duplicazione voce: ${error.message}`)
      setSalvataggio(false)
      return
    }

    setVoci((precedenti) => [...precedenti, data])
    setSalvataggio(false)
    setMessaggio(`Duplicata "${voce.voce}"`)

    window.setTimeout(() => {
      iniziaModifica(data)
    }, 0)
  }

  async function cambiaStato(voce) {
    setSalvataggio(true)
    setErrore("")

    const nuovoStato = voce.attivo === false

    const { data, error } = await supabase
      .from("punti_luce_voci")
      .update({ attivo: nuovoStato })
      .eq("id", voce.id)
      .select("*")
      .single()

    if (error) {
      console.error(error)
      setErrore(`Errore cambio stato: ${error.message}`)
      setSalvataggio(false)
      return
    }

    setVoci((precedenti) =>
      precedenti.map((elemento) =>
        elemento.id === data.id ? data : elemento
      )
    )

    setSalvataggio(false)
    setMessaggio(
      nuovoStato
        ? `Voce "${data.voce}" riattivata`
        : `Voce "${data.voce}" disattivata`
    )
  }

  async function eliminaVoce(voce) {
    const conferma = window.confirm(
      `Eliminare definitivamente la voce "${voce.voce}"?\n\nÈ preferibile disattivarla se è già stata usata nei progetti.`
    )

    if (!conferma) return

    setSalvataggio(true)
    setErrore("")

    const { error } = await supabase
      .from("punti_luce_voci")
      .delete()
      .eq("id", voce.id)

    if (error) {
      console.error(error)
      setErrore(`Errore eliminazione voce: ${error.message}`)
      setSalvataggio(false)
      return
    }

    setVoci((precedenti) =>
      precedenti.filter((elemento) => elemento.id !== voce.id)
    )

    if (idInModifica === voce.id) {
      annullaModifica()
    }

    setSalvataggio(false)
    setMessaggio(`Voce "${voce.voce}" eliminata`)
  }

  function iniziaModificaCapitolo(capitolo) {
    setCapitoloInModifica(capitolo)
    setNuovoNomeCapitolo(capitolo)
    setErrore("")
  }

  function annullaModificaCapitolo() {
    setCapitoloInModifica("")
    setNuovoNomeCapitolo("")
  }

  async function salvaNomeCapitolo() {
    const vecchioCapitolo = String(capitoloInModifica || "").trim()
    const nuovoCapitolo = String(nuovoNomeCapitolo || "").trim()

    if (!vecchioCapitolo) return

    if (!nuovoCapitolo) {
      alert("Scrivi il nuovo nome del capitolo")
      return
    }

    if (nuovoCapitolo === vecchioCapitolo) {
      annullaModificaCapitolo()
      return
    }

    const esisteGia = capitoliEsistenti.some(
      (capitolo) =>
        capitolo !== vecchioCapitolo &&
        capitolo.toLowerCase() === nuovoCapitolo.toLowerCase()
    )

    if (esisteGia) {
      const unisci = window.confirm(
        `Esiste già il capitolo "${nuovoCapitolo}".\n\nVuoi unire tutte le voci di "${vecchioCapitolo}" nel capitolo esistente?`
      )

      if (!unisci) return
    }

    setSalvataggio(true)
    setErrore("")

    const { data, error } = await supabase
      .from("punti_luce_voci")
      .update({ capitolo: nuovoCapitolo })
      .eq("capitolo", vecchioCapitolo)
      .select("*")

    if (error) {
      console.error(error)
      setErrore(`Errore modifica capitolo: ${error.message}`)
      setSalvataggio(false)
      return
    }

    setVoci((precedenti) =>
      precedenti.map((voce) =>
        voce.capitolo === vecchioCapitolo
          ? { ...voce, capitolo: nuovoCapitolo }
          : voce
      )
    )

    setNuovaVoce((precedente) => ({
      ...precedente,
      capitolo:
        precedente.capitolo === vecchioCapitolo
          ? nuovoCapitolo
          : precedente.capitolo
    }))

    setFormModifica((precedente) =>
      precedente
        ? {
            ...precedente,
            capitolo:
              precedente.capitolo === vecchioCapitolo
                ? nuovoCapitolo
                : precedente.capitolo
          }
        : precedente
    )

    setVoceOriginale((precedente) =>
      precedente
        ? {
            ...precedente,
            capitolo:
              precedente.capitolo === vecchioCapitolo
                ? nuovoCapitolo
                : precedente.capitolo
          }
        : precedente
    )

    if (filtroCapitolo === vecchioCapitolo) {
      setFiltroCapitolo(nuovoCapitolo)
    }

    const progettiAggiornati = aggiornaCapitoloProgettiLocali(
      vecchioCapitolo,
      nuovoCapitolo
    )

    annullaModificaCapitolo()
    setSalvataggio(false)

    const numeroVoci = Array.isArray(data) ? data.length : 0

    setMessaggio(
      `Capitolo rinominato in "${nuovoCapitolo}". Aggiornate ${numeroVoci} voci` +
        (progettiAggiornati > 0
          ? ` e ${progettiAggiornati} progetti salvati in questo browser.`
          : ".")
    )
  }

  return (
    <div style={styles.pagina}>
      <div style={styles.testata}>
        <div>
          <h1 style={{ margin: 0 }}>⚙️ Voci Punti Luce</h1>
          <div style={styles.sottotitolo}>
            Crea, modifica, duplica o disattiva le voci senza doverle rifare.
          </div>
        </div>

        <button
          onClick={caricaVoci}
          disabled={caricamento || salvataggio}
          style={styles.btnSecondario}
        >
          🔄 Aggiorna
        </button>
      </div>

      {messaggio && <div style={styles.messaggio}>{messaggio}</div>}
      {errore && <div style={styles.errore}>{errore}</div>}

      <section style={styles.box}>
        <h2 style={styles.h2}>🗂️ Nomi dei capitoli</h2>

        <div style={styles.sottotitolo}>
          Premi “Modifica nome” per rinominare un capitolo. Il nuovo nome viene
          applicato a tutte le voci del capitolo e ai progetti salvati in questo
          browser. Puoi inserire anche un’icona o un’emoji nel nome.
        </div>

        {capitoliEsistenti.length === 0 ? (
          <div style={styles.vuoto}>Nessun capitolo presente.</div>
        ) : (
          <div style={styles.listaCapitoli}>
            {capitoliEsistenti.map((capitolo) => {
              const numeroVoci = voci.filter(
                (voce) => voce.capitolo === capitolo
              ).length

              const modifica = capitoloInModifica === capitolo

              return (
                <div key={capitolo} style={styles.rigaCapitolo}>
                  {modifica ? (
                    <>
                      <input
                        value={nuovoNomeCapitolo}
                        onChange={(event) =>
                          setNuovoNomeCapitolo(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") salvaNomeCapitolo()
                          if (event.key === "Escape") annullaModificaCapitolo()
                        }}
                        autoFocus
                        style={styles.inputNomeCapitolo}
                      />

                      <div style={styles.azioni}>
                        <button
                          onClick={salvaNomeCapitolo}
                          disabled={salvataggio}
                          style={styles.btnBlu}
                        >
                          Salva nome
                        </button>

                        <button
                          onClick={annullaModificaCapitolo}
                          disabled={salvataggio}
                          style={styles.btnSecondarioPiccolo}
                        >
                          Annulla
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={styles.nomeCapitolo}>
                        <b>{etichettaCapitolo(capitolo)}</b>
                        <span style={styles.contatoreCapitolo}>
                          {numeroVoci} voci
                        </span>
                      </div>

                      <button
                        onClick={() => iniziaModificaCapitolo(capitolo)}
                        disabled={salvataggio}
                        style={styles.btnSecondarioPiccolo}
                      >
                        Modifica nome
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section style={styles.box}>
        <h2 style={styles.h2}>➕ Nuova voce</h2>

        <div style={styles.grigliaNuovaVoce}>
          <Campo label="Capitolo">
            <input
              list="capitoli-punti-luce"
              value={nuovaVoce.capitolo}
              onChange={(event) =>
                setNuovaVoce((precedente) => ({
                  ...precedente,
                  capitolo: event.target.value
                }))
              }
              style={styles.input}
            />
          </Campo>

          <Campo label="Nome voce">
            <input
              value={nuovaVoce.voce}
              onChange={(event) =>
                setNuovaVoce((precedente) => ({
                  ...precedente,
                  voce: event.target.value
                }))
              }
              placeholder="Esempio: Presa schuko"
              style={styles.input}
            />
          </Campo>

          <Campo label="Moduli">
            <input
              type="number"
              min="0"
              disabled={nuovaVoce.richiede_posti}
              value={nuovaVoce.richiede_posti ? "" : nuovaVoce.moduli}
              onChange={(event) =>
                setNuovaVoce((precedente) => ({
                  ...precedente,
                  moduli: event.target.value
                }))
              }
              style={{
                ...styles.input,
                background: nuovaVoce.richiede_posti ? "#f2f4f7" : "white"
              }}
            />
          </Campo>

          <Campo label="Ordine">
            <input
              type="number"
              min="0"
              value={nuovaVoce.ordine}
              onChange={(event) =>
                setNuovaVoce((precedente) => ({
                  ...precedente,
                  ordine: event.target.value
                }))
              }
              style={styles.input}
            />
          </Campo>
        </div>

        <div style={styles.opzioniNuovaVoce}>
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={nuovaVoce.richiede_posti}
              onChange={(event) =>
                setNuovaVoce((precedente) => ({
                  ...precedente,
                  richiede_posti: event.target.checked
                }))
              }
            />
            Il numero di moduli dipende dai posti
          </label>

          {nuovaVoce.richiede_posti ? (
            <Campo label="Posti predefiniti">
              <input
                type="number"
                min="1"
                value={nuovaVoce.posti_default}
                onChange={(event) =>
                  setNuovaVoce((precedente) => ({
                    ...precedente,
                    posti_default: event.target.value
                  }))
                }
                style={styles.inputPiccolo}
              />
            </Campo>
          ) : (
            <Campo label="Posti fissi">
              <input
                type="number"
                min="1"
                value={nuovaVoce.posti_fissi}
                onChange={(event) =>
                  setNuovaVoce((precedente) => ({
                    ...precedente,
                    posti_fissi: event.target.value
                  }))
                }
                style={styles.inputPiccolo}
              />
            </Campo>
          )}

          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={nuovaVoce.attivo}
              onChange={(event) =>
                setNuovaVoce((precedente) => ({
                  ...precedente,
                  attivo: event.target.checked
                }))
              }
            />
            Voce attiva
          </label>

          <button
            onClick={aggiungiVoce}
            disabled={salvataggio}
            style={styles.btnVerde}
          >
            {salvataggio ? "Salvataggio..." : "Aggiungi voce"}
          </button>
        </div>
      </section>

      <section style={styles.box}>
        <div style={styles.testataFiltri}>
          <div>
            <h2 style={styles.h2}>📋 Elenco voci</h2>
            <div style={styles.sottotitolo}>
              {vociFiltrate.length} voci visualizzate su {voci.length}
            </div>
          </div>

          <div style={styles.filtri}>
            <input
              value={ricerca}
              onChange={(event) => setRicerca(event.target.value)}
              placeholder="Cerca una voce..."
              style={styles.inputRicerca}
            />

            <select
              value={filtroCapitolo}
              onChange={(event) => setFiltroCapitolo(event.target.value)}
              style={styles.selectFiltro}
            >
              <option value="tutti">Tutti i capitoli</option>
              {capitoliDisponibili.map((capitolo) => (
                <option key={capitolo} value={capitolo}>
                  {etichettaCapitolo(capitolo)}
                </option>
              ))}
            </select>

            <label style={styles.checkLabel}>
              <input
                type="checkbox"
                checked={mostraDisattive}
                onChange={(event) => setMostraDisattive(event.target.checked)}
              />
              Mostra disattive
            </label>
          </div>
        </div>

        {caricamento ? (
          <div style={styles.vuoto}>Caricamento voci...</div>
        ) : vociRaggruppate.length === 0 ? (
          <div style={styles.vuoto}>Nessuna voce trovata.</div>
        ) : (
          vociRaggruppate.map(([capitolo, elenco]) => (
            <div key={capitolo} style={styles.gruppo}>
              <h3 style={styles.titoloCapitolo}>
                {etichettaCapitolo(capitolo)}
                <span style={styles.contatoreCapitolo}>{elenco.length}</span>
              </h3>

              <div style={styles.tabellaContenitore}>
                <table style={styles.tabella}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Ordine</th>
                      <th style={styles.th}>Voce</th>
                      <th style={styles.th}>Moduli</th>
                      <th style={styles.th}>Posti</th>
                      <th style={styles.th}>Stato</th>
                      <th style={styles.th}>Azioni</th>
                    </tr>
                  </thead>

                  <tbody>
                    {elenco.map((voce) => {
                      const modifica = idInModifica === voce.id && formModifica

                      if (modifica) {
                        return (
                          <tr key={voce.id} style={styles.rigaModifica}>
                            <td style={styles.td}>
                              <input
                                type="number"
                                min="0"
                                value={formModifica.ordine}
                                onChange={(event) =>
                                  setFormModifica((precedente) => ({
                                    ...precedente,
                                    ordine: event.target.value
                                  }))
                                }
                                style={styles.inputOrdine}
                              />
                            </td>

                            <td style={styles.td}>
                              <div style={styles.campiModificaVoce}>
                                <input
                                  list="capitoli-punti-luce"
                                  value={formModifica.capitolo}
                                  onChange={(event) =>
                                    setFormModifica((precedente) => ({
                                      ...precedente,
                                      capitolo: event.target.value
                                    }))
                                  }
                                  style={styles.input}
                                />

                                <input
                                  value={formModifica.voce}
                                  onChange={(event) =>
                                    setFormModifica((precedente) => ({
                                      ...precedente,
                                      voce: event.target.value
                                    }))
                                  }
                                  style={styles.input}
                                />
                              </div>
                            </td>

                            <td style={styles.td}>
                              <input
                                type="number"
                                min="0"
                                disabled={formModifica.richiede_posti}
                                value={
                                  formModifica.richiede_posti
                                    ? ""
                                    : formModifica.moduli
                                }
                                onChange={(event) =>
                                  setFormModifica((precedente) => ({
                                    ...precedente,
                                    moduli: event.target.value
                                  }))
                                }
                                style={{
                                  ...styles.inputModuli,
                                  background: formModifica.richiede_posti
                                    ? "#f2f4f7"
                                    : "white"
                                }}
                              />
                            </td>

                            <td style={styles.td}>
                              <div style={styles.postiModifica}>
                                <label style={styles.checkLabelPiccolo}>
                                  <input
                                    type="checkbox"
                                    checked={formModifica.richiede_posti}
                                    onChange={(event) =>
                                      setFormModifica((precedente) => ({
                                        ...precedente,
                                        richiede_posti: event.target.checked
                                      }))
                                    }
                                  />
                                  Variabili
                                </label>

                                <input
                                  type="number"
                                  min="1"
                                  value={
                                    formModifica.richiede_posti
                                      ? formModifica.posti_default
                                      : formModifica.posti_fissi
                                  }
                                  onChange={(event) =>
                                    setFormModifica((precedente) => ({
                                      ...precedente,
                                      [precedente.richiede_posti
                                        ? "posti_default"
                                        : "posti_fissi"]: event.target.value
                                    }))
                                  }
                                  style={styles.inputPosti}
                                />
                              </div>
                            </td>

                            <td style={styles.td}>
                              <label style={styles.checkLabelPiccolo}>
                                <input
                                  type="checkbox"
                                  checked={formModifica.attivo}
                                  onChange={(event) =>
                                    setFormModifica((precedente) => ({
                                      ...precedente,
                                      attivo: event.target.checked
                                    }))
                                  }
                                />
                                Attiva
                              </label>
                            </td>

                            <td style={styles.td}>
                              <div style={styles.azioni}>
                                <button
                                  onClick={salvaModifica}
                                  disabled={salvataggio}
                                  style={styles.btnBlu}
                                >
                                  Salva modifiche
                                </button>

                                <button
                                  onClick={annullaModifica}
                                  disabled={salvataggio}
                                  style={styles.btnSecondarioPiccolo}
                                >
                                  Annulla
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <tr
                          key={voce.id}
                          style={{
                            background: voce.attivo === false ? "#f8f9fa" : "white",
                            opacity: voce.attivo === false ? 0.72 : 1
                          }}
                        >
                          <td style={styles.td}>{voce.ordine ?? 0}</td>
                          <td style={styles.td}>
                            <b>{voce.voce}</b>
                          </td>
                          <td style={styles.td}>
                            {voce.richiede_posti
                              ? "Secondo i posti"
                              : Number(voce.moduli || 0)}
                          </td>
                          <td style={styles.td}>
                            {voce.richiede_posti
                              ? `Variabili · default ${voce.posti_default || 1}`
                              : `Fissi · ${voce.posti_fissi || 1}`}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.badge,
                                background:
                                  voce.attivo === false ? "#eaecf0" : "#dcfae6",
                                color:
                                  voce.attivo === false ? "#475467" : "#067647"
                              }}
                            >
                              {voce.attivo === false ? "Disattiva" : "Attiva"}
                            </span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.azioni}>
                              <button
                                onClick={() => iniziaModifica(voce)}
                                disabled={salvataggio}
                                style={styles.btnBlu}
                              >
                                Modifica
                              </button>

                              <button
                                onClick={() => duplicaVoce(voce)}
                                disabled={salvataggio}
                                style={styles.btnSecondarioPiccolo}
                              >
                                Duplica
                              </button>

                              <button
                                onClick={() => cambiaStato(voce)}
                                disabled={salvataggio}
                                style={
                                  voce.attivo === false
                                    ? styles.btnVerdePiccolo
                                    : styles.btnGiallo
                                }
                              >
                                {voce.attivo === false ? "Riattiva" : "Disattiva"}
                              </button>

                              <button
                                onClick={() => eliminaVoce(voce)}
                                disabled={salvataggio}
                                style={styles.btnRosso}
                              >
                                Elimina
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>

      <datalist id="capitoli-punti-luce">
        {capitoliDisponibili.map((capitolo) => (
          <option key={capitolo} value={capitolo}>
            {etichettaCapitolo(capitolo)}
          </option>
        ))}
      </datalist>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <label style={styles.campo}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  )
}

const styles = {
  pagina: {
    padding: 15,
    maxWidth: 1300,
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
    color: "#101828"
  },
  testata: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap"
  },
  sottotitolo: {
    color: "#667085",
    fontSize: 14,
    marginTop: 4
  },
  box: {
    border: "1px solid #d0d5dd",
    borderRadius: 9,
    padding: 13,
    marginTop: 12,
    background: "white"
  },
  h2: {
    margin: "0 0 10px"
  },
  messaggio: {
    position: "sticky",
    top: 8,
    zIndex: 50,
    marginTop: 10,
    padding: "10px 12px",
    border: "1px solid #75b798",
    borderRadius: 7,
    background: "#d1e7dd",
    fontWeight: "bold"
  },
  errore: {
    marginTop: 10,
    padding: "10px 12px",
    border: "1px solid #f97066",
    borderRadius: 7,
    background: "#fee4e2",
    color: "#b42318",
    fontWeight: "bold"
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0
  },
  label: {
    fontSize: 14,
    fontWeight: "bold"
  },
  input: {
    width: "100%",
    padding: "8px 9px",
    border: "1px solid #c7cdd4",
    borderRadius: 6,
    boxSizing: "border-box",
    background: "white"
  },
  inputPiccolo: {
    width: 110,
    padding: "7px 8px",
    border: "1px solid #c7cdd4",
    borderRadius: 6,
    boxSizing: "border-box"
  },
  grigliaNuovaVoce: {
    display: "grid",
    gridTemplateColumns:
      "minmax(180px, 0.8fr) minmax(260px, 1.5fr) 120px 100px",
    gap: 9,
    alignItems: "end"
  },
  opzioniNuovaVoce: {
    display: "flex",
    gap: 14,
    alignItems: "end",
    flexWrap: "wrap",
    marginTop: 11
  },
  listaCapitoli: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
    gap: 8,
    marginTop: 12
  },
  rigaCapitolo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    minHeight: 48,
    padding: 9,
    border: "1px solid #d0d5dd",
    borderRadius: 7,
    background: "#f9fafb"
  },
  nomeCapitolo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0
  },
  inputNomeCapitolo: {
    flex: 1,
    minWidth: 150,
    padding: "8px 9px",
    border: "1px solid #0d6efd",
    borderRadius: 6,
    boxSizing: "border-box",
    background: "white"
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minHeight: 36,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14
  },
  checkLabelPiccolo: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    cursor: "pointer",
    fontSize: 13
  },
  testataFiltri: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 12,
    flexWrap: "wrap"
  },
  filtri: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap"
  },
  inputRicerca: {
    minWidth: 220,
    padding: "8px 9px",
    border: "1px solid #c7cdd4",
    borderRadius: 6
  },
  selectFiltro: {
    minWidth: 180,
    padding: "8px 9px",
    border: "1px solid #c7cdd4",
    borderRadius: 6,
    background: "white"
  },
  gruppo: {
    marginTop: 18
  },
  titoloCapitolo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "0 0 8px"
  },
  contatoreCapitolo: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 24,
    height: 24,
    padding: "0 6px",
    borderRadius: 999,
    background: "#e7f1ff",
    color: "#0d6efd",
    fontSize: 12
  },
  tabellaContenitore: {
    overflowX: "auto"
  },
  tabella: {
    width: "100%",
    minWidth: 980,
    borderCollapse: "collapse"
  },
  th: {
    padding: 8,
    border: "1px solid #d0d5dd",
    background: "#f2f4f7",
    textAlign: "left",
    whiteSpace: "nowrap"
  },
  td: {
    padding: 7,
    border: "1px solid #d0d5dd",
    verticalAlign: "middle"
  },
  rigaModifica: {
    background: "#fff9e6"
  },
  campiModificaVoce: {
    display: "grid",
    gridTemplateColumns: "150px minmax(230px, 1fr)",
    gap: 6
  },
  inputOrdine: {
    width: 70,
    padding: 7,
    border: "1px solid #c7cdd4",
    borderRadius: 5
  },
  inputModuli: {
    width: 85,
    padding: 7,
    border: "1px solid #c7cdd4",
    borderRadius: 5
  },
  inputPosti: {
    width: 70,
    padding: 6,
    border: "1px solid #c7cdd4",
    borderRadius: 5
  },
  postiModifica: {
    display: "flex",
    alignItems: "center",
    gap: 7
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold"
  },
  azioni: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap"
  },
  vuoto: {
    padding: 20,
    marginTop: 12,
    borderRadius: 7,
    background: "#f8f9fa",
    color: "#667085",
    textAlign: "center"
  },
  btnVerde: {
    padding: "9px 13px",
    border: "none",
    borderRadius: 6,
    background: "#198754",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },
  btnVerdePiccolo: {
    padding: "6px 9px",
    border: "none",
    borderRadius: 5,
    background: "#198754",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },
  btnBlu: {
    padding: "6px 9px",
    border: "none",
    borderRadius: 5,
    background: "#0d6efd",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },
  btnGiallo: {
    padding: "6px 9px",
    border: "1px solid #e0a800",
    borderRadius: 5,
    background: "#ffc107",
    color: "#212529",
    cursor: "pointer",
    fontWeight: "bold"
  },
  btnRosso: {
    padding: "6px 9px",
    border: "none",
    borderRadius: 5,
    background: "#dc3545",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },
  btnSecondario: {
    padding: "8px 11px",
    border: "1px solid #98a2b3",
    borderRadius: 6,
    background: "white",
    color: "#344054",
    cursor: "pointer",
    fontWeight: "bold"
  },
  btnSecondarioPiccolo: {
    padding: "6px 9px",
    border: "1px solid #98a2b3",
    borderRadius: 5,
    background: "white",
    color: "#344054",
    cursor: "pointer",
    fontWeight: "bold"
  }
}