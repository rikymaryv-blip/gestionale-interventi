import { useEffect, useMemo, useState } from "react"
import { supabase } from "../supabaseClient"
import * as XLSX from "xlsx"

const serieCivili = ["Living", "Matix", "Linea", "Now", "Altro"]

const scatoleDisponibili = [
  {
    codice: "503",
    moduli: 3,
    descrizioneSupporto: "Supporto 503",
    descrizionePlacca: "Placca 503"
  },
  {
    codice: "504",
    moduli: 4,
    descrizioneSupporto: "Supporto 504",
    descrizionePlacca: "Placca 504"
  },
  {
    codice: "506",
    moduli: 6,
    descrizioneSupporto: "Supporto 506",
    descrizionePlacca: "Placca 506"
  },
  {
    codice: "507",
    moduli: 7,
    descrizioneSupporto: "Supporto 507",
    descrizionePlacca: "Placca 507"
  }
]

function creaId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function creaStanzaVuota(nome = "") {
  return {
    id: creaId(),
    nome,
    scatole: {
      "503": 0,
      "504": 0,
      "506": 0,
      "507": 0
    },
    punti: []
  }
}

function creaRigaSelezione(voce) {
  return {
    selezionata: false,
    quantita: 1,
    posti: Number(voce.posti_default || voce.posti_fissi || 1),
    descrizione: ""
  }
}

function creaLineaVuota() {
  return {
    descrizione: "",
    lunghezza: 1,
    sezione: "1.5",
    numeroFili: 3,
    note: ""
  }
}

function creaMovimentoFiloVuoto() {
  return {
    movimento: "portato",
    sezione: "1.5",
    colore: "",
    metri: 100,
    note: ""
  }
}

function metriConduttoreLinea(linea) {
  return Number(linea?.lunghezza || 0) * Number(linea?.numeroFili || 0)
}

function formatoNumero(valore) {
  const numero = Number(valore || 0)
  return Number.isInteger(numero)
    ? String(numero)
    : numero.toFixed(2).replace(".", ",")
}

export default function PuntiLucePage() {
  const [clienti, setClienti] = useState([])
  const [vociDB, setVociDB] = useState([])

  const [clienteId, setClienteId] = useState("")
  const [serie, setSerie] = useState("")

  const [stanze, setStanze] = useState([])
  const [stanzaIdCorrente, setStanzaIdCorrente] = useState("")
  const [progettoCaricato, setProgettoCaricato] = useState(false)
  const [ultimoSalvataggio, setUltimoSalvataggio] = useState("")

  const [capitoloAperto, setCapitoloAperto] = useState("")
  const [selezioni, setSelezioni] = useState({})
  const [messaggio, setMessaggio] = useState("")

  const [lineeGenerali, setLineeGenerali] = useState([])
  const [nuovaLinea, setNuovaLinea] = useState(() => creaLineaVuota())

  const [movimentiFilo, setMovimentiFilo] = useState([])
  const [nuovoMovimentoFilo, setNuovoMovimentoFilo] = useState(() =>
    creaMovimentoFiloVuoto()
  )

  useEffect(() => {
    caricaClienti()
    caricaVoci()
  }, [])

  useEffect(() => {
    if (!messaggio) return

    const timer = window.setTimeout(() => {
      setMessaggio("")
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [messaggio])

  useEffect(() => {
    let annullato = false

    async function caricaProgetto() {
      if (!clienteId || !serie) {
        setStanze([])
        setLineeGenerali([])
        setMovimentiFilo([])
        setStanzaIdCorrente("")
        setProgettoCaricato(false)
        setUltimoSalvataggio("")
        resetInserimentoMateriali()
        return
      }

      setProgettoCaricato(false)
      setUltimoSalvataggio("")

      let progetto = null
      let arrivatoDaTablet = false

      const { data: progettoOnline, error: erroreOnline } = await supabase
        .from("punti_luce_progetti")
        .select("dati, aggiornato_il")
        .eq("cliente_id", clienteId)
        .eq("serie", serie)
        .maybeSingle()

      if (annullato) return

      if (erroreOnline) {
        console.error("Errore caricamento progetto online:", erroreOnline)
      }

      if (progettoOnline?.dati) {
        progetto = progettoOnline.dati

        if (progettoOnline.aggiornato_il) {
          setUltimoSalvataggio(
            new Date(progettoOnline.aggiornato_il).toLocaleTimeString()
          )
        }
      } else {
        const salvatoLocale = localStorage.getItem(
          getStorageKey(clienteId, serie)
        )

        if (salvatoLocale) {
          try {
            progetto = JSON.parse(salvatoLocale)
            arrivatoDaTablet = true
          } catch (error) {
            console.error("Errore lettura progetto locale:", error)
          }
        }
      }

      if (progetto) {
        const stanzeSalvate = Array.isArray(progetto.stanze)
          ? progetto.stanze.map((stanza) => ({
              ...stanza,
              punti: Array.isArray(stanza.punti) ? stanza.punti : []
            }))
          : []

        const lineeVecchie = Array.isArray(progetto.stanze)
          ? progetto.stanze.flatMap((stanza) =>
              Array.isArray(stanza.linee) ? stanza.linee : []
            )
          : []

        const lineeSalvate = Array.isArray(progetto.lineeGenerali)
          ? progetto.lineeGenerali
          : lineeVecchie

        let movimentiSalvati = Array.isArray(progetto.movimentiFilo)
          ? progetto.movimentiFilo
          : []

        if (
          movimentiSalvati.length === 0 &&
          Array.isArray(progetto.matasse)
        ) {
          movimentiSalvati = progetto.matasse.flatMap((matassa) => {
            const movimenti = []
            const iniziali = Number(matassa.metriIniziali || 0)
            const rimasti = Number(matassa.metriRimasti || 0)

            if (iniziali > 0) {
              movimenti.push({
                id: creaId(),
                movimento: "portato",
                sezione: matassa.sezione || "",
                colore: matassa.colore || "",
                metri: iniziali,
                note: matassa.note || ""
              })
            }

            if (rimasti > 0) {
              movimenti.push({
                id: creaId(),
                movimento: "tolto",
                sezione: matassa.sezione || "",
                colore: matassa.colore || "",
                metri: rimasti,
                note: "Riportato dal cantiere"
              })
            }

            return movimenti
          })
        }

        setStanze(stanzeSalvate)
        setLineeGenerali(lineeSalvate)
        setMovimentiFilo(movimentiSalvati)
        setStanzaIdCorrente(stanzeSalvate[0]?.id || "")

        if (arrivatoDaTablet) {
          const adesso = new Date().toISOString()
          const datiDaSalvare = {
            clienteId,
            serie,
            stanze: stanzeSalvate,
            lineeGenerali: lineeSalvate,
            movimentiFilo: movimentiSalvati,
            aggiornatoIl: adesso
          }

          const { error: erroreMigrazione } = await supabase
            .from("punti_luce_progetti")
            .upsert(
              {
                cliente_id: clienteId,
                serie,
                dati: datiDaSalvare,
                aggiornato_il: adesso
              },
              { onConflict: "cliente_id,serie" }
            )

          if (annullato) return

          if (erroreMigrazione) {
            console.error("Errore trasferimento progetto online:", erroreMigrazione)
            setMessaggio("Progetto locale caricato, ma non ancora trasferito online")
          } else {
            setUltimoSalvataggio(new Date().toLocaleTimeString())
            setMessaggio("Progetto del tablet trasferito online")
          }
        }
      } else {
        setStanze([])
        setLineeGenerali([])
        setMovimentiFilo([])
        setStanzaIdCorrente("")
      }

      resetInserimentoMateriali()
      setProgettoCaricato(true)
    }

    caricaProgetto()

    return () => {
      annullato = true
    }
  }, [clienteId, serie])

  useEffect(() => {
    if (!progettoCaricato || !clienteId || !serie) return

    const timer = window.setTimeout(async () => {
      const adesso = new Date().toISOString()
      const progetto = {
        clienteId,
        serie,
        stanze,
        lineeGenerali,
        movimentiFilo,
        aggiornatoIl: adesso
      }

      // Manteniamo anche una copia locale di sicurezza sul dispositivo.
      localStorage.setItem(
        getStorageKey(clienteId, serie),
        JSON.stringify(progetto)
      )

      const { error } = await supabase
        .from("punti_luce_progetti")
        .upsert(
          {
            cliente_id: clienteId,
            serie,
            dati: progetto,
            aggiornato_il: adesso
          },
          { onConflict: "cliente_id,serie" }
        )

      if (error) {
        console.error("Errore salvataggio progetto online:", error)
        setUltimoSalvataggio("ERRORE")
        return
      }

      setUltimoSalvataggio(new Date().toLocaleTimeString())
    }, 500)

    return () => window.clearTimeout(timer)
  }, [
    stanze,
    lineeGenerali,
    movimentiFilo,
    clienteId,
    serie,
    progettoCaricato
  ])

  async function caricaClienti() {
    const { data, error } = await supabase
      .from("clienti")
      .select("id,nome")
      .order("nome")

    if (error) {
      console.error(error)
      alert("Errore caricamento clienti")
      return
    }

    setClienti(data || [])
  }

  async function caricaVoci() {
    const { data, error } = await supabase
      .from("punti_luce_voci")
      .select("*")
      .eq("attivo", true)
      .order("capitolo", { ascending: true })
      .order("ordine", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento voci punti luce")
      return
    }

    setVociDB(data || [])
  }

  function getStorageKey(idCliente, nomeSerie) {
    return `punti_luce_v3_${idCliente}_${nomeSerie}`
  }

  const capitoli = useMemo(() => {
    return [...new Set(vociDB.map((voce) => voce.capitolo).filter(Boolean))]
  }, [vociDB])

  const stanzaCorrente =
    stanze.find(
      (stanza) => String(stanza.id) === String(stanzaIdCorrente)
    ) || null

  const clienteSelezionato = clienti.find(
    (cliente) => String(cliente.id) === String(clienteId)
  )

  function labelCapitolo(capitolo) {
    const etichette = {
      punti_luce: "💡 Punti luce",
      prese: "🔌 Prese",
      comandi: "🔘 Comandi",
      predisposizioni: "📦 Predisposizioni",
      altro: "🧰 Altro"
    }

    return (
      etichette[capitolo] ||
      String(capitolo || "")
        .replaceAll("_", " ")
        .toUpperCase()
    )
  }

  function getVoceConfigDaPunto(punto) {
    return vociDB.find(
      (voce) =>
        voce.capitolo === punto.capitolo &&
        voce.voce === punto.tipo
    )
  }

  function calcolaModuliDaScatole(scatole = {}) {
    return scatoleDisponibili.reduce((totale, scatola) => {
      return (
        totale +
        Number(scatole[scatola.codice] || 0) * scatola.moduli
      )
    }, 0)
  }

  function calcolaModuliPunto(punto) {
    const config = getVoceConfigDaPunto(punto)

    if (!config) return 0

    const quantita = Number(punto.quantita || 0)

    if (config.richiede_posti) {
      return (
        quantita *
        Number(punto.posti || config.posti_default || 1)
      )
    }

    return quantita * Number(config.moduli || 0)
  }

  function calcolaModuliUsati(punti = []) {
    return punti.reduce((totale, punto) => {
      return totale + calcolaModuliPunto(punto)
    }, 0)
  }

  const moduliTotaliCorrente = stanzaCorrente
    ? calcolaModuliDaScatole(stanzaCorrente.scatole)
    : 0

  const moduliUsatiCorrente = stanzaCorrente
    ? calcolaModuliUsati(stanzaCorrente.punti)
    : 0

  const moduliRimastiCorrente =
    moduliTotaliCorrente - moduliUsatiCorrente

  function aggiornaStanzaCorrente(modifica) {
    if (!stanzaCorrente) return

    setStanze((precedenti) =>
      precedenti.map((stanza) =>
        String(stanza.id) === String(stanzaCorrente.id)
          ? { ...stanza, ...modifica }
          : stanza
      )
    )
  }

  function cambiaNomeStanza(nome) {
    aggiornaStanzaCorrente({ nome })
  }

  function aggiornaScatola(codice, valore) {
    if (!stanzaCorrente) return

    aggiornaStanzaCorrente({
      scatole: {
        ...stanzaCorrente.scatole,
        [codice]: Math.max(0, Number(valore || 0))
      }
    })
  }

  function variaScatola(codice, variazione) {
    const attuale = Number(
      stanzaCorrente?.scatole?.[codice] || 0
    )

    aggiornaScatola(codice, attuale + variazione)
  }

  function resetInserimentoMateriali() {
    setCapitoloAperto("")
    setSelezioni({})
  }

  function preparaCapitolo(capitolo) {
    const vociCapitolo = vociDB.filter(
      (voce) => voce.capitolo === capitolo
    )

    setSelezioni((precedenti) => {
      const nuove = { ...precedenti }

      vociCapitolo.forEach((voce) => {
        if (!nuove[voce.id]) {
          nuove[voce.id] = creaRigaSelezione(voce)
        }
      })

      return nuove
    })
  }

  function apriChiudiCapitolo(capitolo) {
    if (capitoloAperto === capitolo) {
      setCapitoloAperto("")
      return
    }

    preparaCapitolo(capitolo)
    setCapitoloAperto(capitolo)
  }

  function aggiornaSelezione(voce, campo, valore) {
    setSelezioni((precedenti) => ({
      ...precedenti,
      [voce.id]: {
        ...(precedenti[voce.id] || creaRigaSelezione(voce)),
        [campo]: valore
      }
    }))
  }

  function descrizioneAutomatica(voce, riga) {
    const descrizioneManuale = String(
      riga.descrizione || ""
    ).trim()

    if (descrizioneManuale) {
      return descrizioneManuale
    }

    if (voce.richiede_posti) {
      return `${voce.voce} da ${Number(
        riga.posti || voce.posti_default || 1
      )} posti`
    }

    return voce.voce
  }

  function importaVociCapitolo(capitolo) {
    if (!clienteId) {
      alert("Seleziona prima il cliente")
      return
    }

    if (!serie) {
      alert("Seleziona prima la serie civile")
      return
    }

    if (!stanzaCorrente) {
      alert("Crea o seleziona una stanza")
      return
    }

    if (!stanzaCorrente.nome.trim()) {
      alert("Inserisci il nome della stanza")
      return
    }

    const vociCapitolo = vociDB.filter(
      (voce) => voce.capitolo === capitolo
    )

    const selezionate = vociCapitolo.filter(
      (voce) => selezioni[voce.id]?.selezionata
    )

    if (selezionate.length === 0) {
      alert("Seleziona almeno una voce")
      return
    }

    const nuoviPunti = []
    let quantitaTotaleImportata = 0

    selezionate.forEach((voce) => {
      const riga =
        selezioni[voce.id] || creaRigaSelezione(voce)

      const quantita = Math.max(
        1,
        Number(riga.quantita || 1)
      )

      const posti = voce.richiede_posti
        ? Math.max(
            1,
            Number(riga.posti || voce.posti_default || 1)
          )
        : Number(voce.posti_fissi || 1)

      if (
        String(voce.voce || "").toLowerCase() === "altro" &&
        !String(riga.descrizione || "").trim()
      ) {
        return
      }

      const descrizione = descrizioneAutomatica(voce, riga)

      nuoviPunti.push({
        id: creaId(),
        quantita,
        capitolo,
        tipo: voce.voce,
        posti,
        descrizione
      })

      quantitaTotaleImportata += quantita
    })

    if (nuoviPunti.length === 0) {
      alert("Completa le descrizioni richieste")
      return
    }

    const puntiAggiornati = [...stanzaCorrente.punti]

    nuoviPunti.forEach((nuovoPunto) => {
      const esistente = puntiAggiornati.find(
        (punto) =>
          punto.capitolo === nuovoPunto.capitolo &&
          punto.tipo === nuovoPunto.tipo &&
          Number(punto.posti) === Number(nuovoPunto.posti) &&
          punto.descrizione === nuovoPunto.descrizione
      )

      if (esistente) {
        esistente.quantita =
          Number(esistente.quantita) +
          Number(nuovoPunto.quantita)
      } else {
        puntiAggiornati.push(nuovoPunto)
      }
    })

    aggiornaStanzaCorrente({
      punti: puntiAggiornati
    })

    setSelezioni((precedenti) => {
      const nuove = { ...precedenti }

      vociCapitolo.forEach((voce) => {
        nuove[voce.id] = creaRigaSelezione(voce)
      })

      return nuove
    })

    setMessaggio(
      `Importate ${nuoviPunti.length} voci (${quantitaTotaleImportata} elementi) in ${labelCapitolo(
        capitolo
      )}`
    )
  }

  function totaleQuantitaCapitolo(capitolo) {
    if (!stanzaCorrente) return 0

    return stanzaCorrente.punti
      .filter((punto) => punto.capitolo === capitolo)
      .reduce(
        (totale, punto) =>
          totale + Number(punto.quantita || 0),
        0
      )
  }

  function capitoloUsato(capitolo) {
    return totaleQuantitaCapitolo(capitolo) > 0
  }

  function nuovaStanza() {
    if (!clienteId) {
      alert("Seleziona prima il cliente")
      return
    }

    if (!serie) {
      alert("Seleziona prima la serie civile")
      return
    }

    const numero = stanze.length + 1
    const nuova = creaStanzaVuota(`Nuova stanza ${numero}`)

    setStanze((precedenti) => [...precedenti, nuova])
    setStanzaIdCorrente(nuova.id)
    resetInserimentoMateriali()
    setMessaggio("Nuova stanza pronta")
  }

  function salvaENuovaStanza() {
    if (!stanzaCorrente) {
      nuovaStanza()
      return
    }

    if (!stanzaCorrente.nome.trim()) {
      alert("Inserisci il nome della stanza")
      return
    }

    const numero = stanze.length + 1
    const nuova = creaStanzaVuota(`Nuova stanza ${numero}`)

    setStanze((precedenti) => [...precedenti, nuova])
    setStanzaIdCorrente(nuova.id)
    resetInserimentoMateriali()
    setMessaggio(
      `Stanza "${stanzaCorrente.nome}" salvata. Nuova stanza pronta.`
    )
  }

  function selezionaStanza(id) {
    setStanzaIdCorrente(id)
    resetInserimentoMateriali()
  }

  function eliminaStanza(stanza) {
    if (!stanza) return

    if (
      !window.confirm(
        `Vuoi eliminare la stanza "${stanza.nome}"?`
      )
    ) {
      return
    }

    const nuove = stanze.filter(
      (elemento) =>
        String(elemento.id) !== String(stanza.id)
    )

    setStanze(nuove)

    if (
      String(stanzaIdCorrente) === String(stanza.id)
    ) {
      setStanzaIdCorrente(nuove[0]?.id || "")
      resetInserimentoMateriali()
    }
  }

  function cambiaQuantitaPunto(id, variazione) {
    if (!stanzaCorrente) return

    aggiornaStanzaCorrente({
      punti: stanzaCorrente.punti
        .map((punto) =>
          String(punto.id) === String(id)
            ? {
                ...punto,
                quantita:
                  Number(punto.quantita || 0) + variazione
              }
            : punto
        )
        .filter(
          (punto) => Number(punto.quantita || 0) > 0
        )
    })
  }

  function eliminaPunto(id) {
    if (!stanzaCorrente) return

    aggiornaStanzaCorrente({
      punti: stanzaCorrente.punti.filter(
        (punto) => String(punto.id) !== String(id)
      )
    })
  }

  function aggiungiLinea() {
    if (!clienteId || !serie) {
      alert("Seleziona cliente e serie civile")
      return
    }

    const descrizione = String(nuovaLinea.descrizione || "").trim()
    const lunghezza = Number(nuovaLinea.lunghezza || 0)
    const numeroFili = Number(nuovaLinea.numeroFili || 0)

    if (!descrizione) {
      alert("Inserisci la descrizione della linea")
      return
    }

    if (lunghezza <= 0) {
      alert("Inserisci i metri della linea")
      return
    }

    if (numeroFili <= 0) {
      alert("Inserisci il numero di fili")
      return
    }

    const linea = {
      id: creaId(),
      descrizione,
      lunghezza,
      sezione: String(nuovaLinea.sezione || "").trim(),
      numeroFili,
      note: String(nuovaLinea.note || "").trim()
    }

    setLineeGenerali((precedenti) => [...precedenti, linea])
    setNuovaLinea(creaLineaVuota())

    setMessaggio(
      `Aggiunta linea "${descrizione}": ${formatoNumero(
        lunghezza
      )} m di linea`
    )
  }

  function aggiornaLinea(id, campo, valore) {
    setLineeGenerali((precedenti) =>
      precedenti.map((linea) =>
        String(linea.id) === String(id)
          ? {
              ...linea,
              [campo]:
                campo === "lunghezza" || campo === "numeroFili"
                  ? Math.max(0, Number(valore || 0))
                  : valore
            }
          : linea
      )
    )
  }

  function eliminaLinea(id) {
    setLineeGenerali((precedenti) =>
      precedenti.filter((linea) => String(linea.id) !== String(id))
    )
  }

  function aggiungiMovimentoFilo() {
    if (!clienteId || !serie) {
      alert("Seleziona cliente e serie civile")
      return
    }

    const metri = Number(nuovoMovimentoFilo.metri || 0)

    if (metri <= 0) {
      alert("Inserisci i metri")
      return
    }

    const movimento = {
      id: creaId(),
      movimento:
        nuovoMovimentoFilo.movimento === "tolto" ? "tolto" : "portato",
      sezione: String(nuovoMovimentoFilo.sezione || "").trim(),
      colore: String(nuovoMovimentoFilo.colore || "").trim(),
      metri,
      note: String(nuovoMovimentoFilo.note || "").trim()
    }

    setMovimentiFilo((precedenti) => [...precedenti, movimento])

    setNuovoMovimentoFilo((precedente) => ({
      ...creaMovimentoFiloVuoto(),
      movimento: precedente.movimento,
      sezione: precedente.sezione,
      colore: precedente.colore
    }))

    setMessaggio(
      `${movimento.movimento === "portato" ? "Portati" : "Tolti"} ${formatoNumero(
        metri
      )} m di filo`
    )
  }

  function aggiornaMovimentoFilo(id, campo, valore) {
    setMovimentiFilo((precedenti) =>
      precedenti.map((movimento) =>
        String(movimento.id) === String(id)
          ? {
              ...movimento,
              [campo]:
                campo === "metri"
                  ? Math.max(0, Number(valore || 0))
                  : valore
            }
          : movimento
      )
    )
  }

  function eliminaMovimentoFilo(id) {
    setMovimentiFilo((precedenti) =>
      precedenti.filter(
        (movimento) => String(movimento.id) !== String(id)
      )
    )
  }

  const totaliFilo = useMemo(() => {
    return movimentiFilo.reduce(
      (totale, movimento) => {
        const metri = Number(movimento.metri || 0)

        if (movimento.movimento === "tolto") {
          totale.tolti += metri
        } else {
          totale.portati += metri
        }

        totale.netti = totale.portati - totale.tolti
        return totale
      },
      { portati: 0, tolti: 0, netti: 0 }
    )
  }, [movimentiFilo])

  const riepilogoFili = useMemo(() => {
    const sezioni = new Map()

    function assicuraSezione(sezione) {
      const chiave = String(sezione || "Non indicata")

      if (!sezioni.has(chiave)) {
        sezioni.set(chiave, {
          sezione: chiave,
          metriPortati: 0,
          metriTolti: 0,
          metriNetti: 0,
          metriLinee: 0,
          metriConduttore: 0
        })
      }

      return sezioni.get(chiave)
    }

    movimentiFilo.forEach((movimento) => {
      const riga = assicuraSezione(movimento.sezione)
      const metri = Number(movimento.metri || 0)

      if (movimento.movimento === "tolto") {
        riga.metriTolti += metri
      } else {
        riga.metriPortati += metri
      }

      riga.metriNetti = riga.metriPortati - riga.metriTolti
    })

    lineeGenerali.forEach((linea) => {
      const riga = assicuraSezione(linea.sezione)
      riga.metriLinee += Number(linea.lunghezza || 0)
      riga.metriConduttore += metriConduttoreLinea(linea)
    })

    return [...sezioni.values()].sort((a, b) =>
      String(a.sezione).localeCompare(String(b.sezione), "it", {
        numeric: true
      })
    )
  }, [movimentiFilo, lineeGenerali])

  const riepilogoLinee = useMemo(() => {
    return lineeGenerali.reduce(
      (totale, linea) => {
        totale.metriLinee += Number(linea.lunghezza || 0)
        totale.metriConduttore += metriConduttoreLinea(linea)
        return totale
      },
      { metriLinee: 0, metriConduttore: 0 }
    )
  }, [lineeGenerali])

  const riepilogoGenerale = useMemo(() => {
    const riepilogoStanze = stanze.reduce(
      (totale, stanza) => {
        totale.moduliTotali += calcolaModuliDaScatole(stanza.scatole)
        totale.moduliUsati += calcolaModuliUsati(stanza.punti)

        totale.numeroPunti += (stanza.punti || []).reduce(
          (somma, punto) => somma + Number(punto.quantita || 0),
          0
        )

        totale.numeroScatole += scatoleDisponibili.reduce(
          (somma, scatola) =>
            somma + Number(stanza.scatole?.[scatola.codice] || 0),
          0
        )

        return totale
      },
      {
        moduliTotali: 0,
        moduliUsati: 0,
        numeroPunti: 0,
        numeroScatole: 0
      }
    )

    return {
      ...riepilogoStanze,
      metriPortati: totaliFilo.portati,
      metriTolti: totaliFilo.tolti,
      metriNetti: totaliFilo.netti,
      metriLinee: riepilogoLinee.metriLinee,
      metriConduttore: riepilogoLinee.metriConduttore
    }
  }, [stanze, vociDB, totaliFilo, riepilogoLinee])

  const distintaMateriali = useMemo(() => {
    const mappa = new Map()

    function aggiungi(descrizione, quantita, gruppo) {
      const qta = Number(quantita || 0)

      if (!descrizione || qta <= 0) return

      const chiave = `${gruppo}__${descrizione}`

      if (!mappa.has(chiave)) {
        mappa.set(chiave, {
          gruppo,
          descrizione,
          quantita: 0
        })
      }

      mappa.get(chiave).quantita += qta
    }

    stanze.forEach((stanza) => {
      scatoleDisponibili.forEach((scatola) => {
        const quantita = Number(
          stanza.scatole?.[scatola.codice] || 0
        )

        aggiungi(
          scatola.descrizioneSupporto,
          quantita,
          "MATERIALI BASE"
        )

        aggiungi(
          scatola.descrizionePlacca,
          quantita,
          "MATERIALI BASE"
        )
      })

      ;(stanza.punti || []).forEach((punto) => {
        aggiungi(
          punto.descrizione || punto.tipo,
          punto.quantita,
          labelCapitolo(punto.capitolo)
        )
      })
    })

    return [...mappa.values()].sort((a, b) => {
      if (a.gruppo !== b.gruppo) {
        return a.gruppo.localeCompare(b.gruppo)
      }

      return a.descrizione.localeCompare(b.descrizione)
    })
  }, [stanze, vociDB])

  function esportaExcel() {
    if (!clienteId || !serie) {
      alert("Seleziona cliente e serie")
      return
    }

    if (
      stanze.length === 0 &&
      movimentiFilo.length === 0 &&
      lineeGenerali.length === 0
    ) {
      alert("Non ci sono dati da esportare")
      return
    }

    const righe = []

    righe.push(["PROGETTO PUNTI LUCE"])
    righe.push(["Cliente", clienteSelezionato?.nome || ""])
    righe.push(["Serie civile", serie])
    righe.push(["Data esportazione", new Date().toLocaleDateString()])
    righe.push([])

    stanze.forEach((stanza, indice) => {
      righe.push([`STANZA ${indice + 1}`, stanza.nome])
      righe.push(["SCATOLE"])
      righe.push(["Tipo", "Quantità", "Moduli totali"])

      scatoleDisponibili.forEach((scatola) => {
        const quantita = Number(stanza.scatole?.[scatola.codice] || 0)

        if (quantita > 0) {
          righe.push([
            scatola.codice,
            quantita,
            quantita * scatola.moduli
          ])
        }
      })

      righe.push([])
      righe.push(["PUNTI LUCE"])
      righe.push([
        "Capitolo",
        "Quantità",
        "Descrizione",
        "Posti",
        "Moduli"
      ])

      ;(stanza.punti || []).forEach((punto) => {
        righe.push([
          labelCapitolo(punto.capitolo),
          Number(punto.quantita || 0),
          punto.descrizione || "",
          Number(punto.posti || 0),
          calcolaModuliPunto(punto)
        ])
      })

      righe.push([])
      righe.push([])
    })

    righe.push(["FILO PORTATO E TOLTO"])
    righe.push([
      "Movimento",
      "Sezione",
      "Colore",
      "Metri",
      "Note"
    ])

    movimentiFilo.forEach((movimento) => {
      righe.push([
        movimento.movimento === "tolto" ? "Tolto" : "Portato",
        movimento.sezione || "",
        movimento.colore || "",
        Number(movimento.metri || 0),
        movimento.note || ""
      ])
    })

    righe.push([])
    righe.push(["Totale metri portati", totaliFilo.portati])
    righe.push(["Totale metri tolti", totaliFilo.tolti])
    righe.push(["Metri netti", totaliFilo.netti])
    righe.push([])

    righe.push(["LINEE POSATE"])
    righe.push([
      "Descrizione linea",
      "Metri linea",
      "Sezione",
      "Numero fili",
      "Metri conduttore",
      "Note"
    ])

    lineeGenerali.forEach((linea) => {
      righe.push([
        linea.descrizione || "",
        Number(linea.lunghezza || 0),
        linea.sezione || "",
        Number(linea.numeroFili || 0),
        metriConduttoreLinea(linea),
        linea.note || ""
      ])
    })

    righe.push([])
    righe.push(["Totale metri linee", riepilogoLinee.metriLinee])
    righe.push([
      "Totale metri conduttore",
      riepilogoLinee.metriConduttore
    ])
    righe.push([])

    righe.push(["RIEPILOGO FILI PER SEZIONE"])
    righe.push([
      "Sezione",
      "Portati",
      "Tolti",
      "Netti",
      "Metri linee",
      "Metri conduttore"
    ])

    riepilogoFili.forEach((riga) => {
      righe.push([
        riga.sezione,
        riga.metriPortati,
        riga.metriTolti,
        riga.metriNetti,
        riga.metriLinee,
        riga.metriConduttore
      ])
    })

    righe.push([])
    righe.push(["DISTINTA MATERIALI"])
    righe.push(["Gruppo", "Descrizione", "Quantità"])

    distintaMateriali.forEach((voce) => {
      righe.push([voce.gruppo, voce.descrizione, voce.quantita])
    })

    const foglio = XLSX.utils.aoa_to_sheet(righe)

    foglio["!cols"] = [
      { wch: 26 },
      { wch: 42 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 30 }
    ]

    const file = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(file, foglio, "Punti luce")

    const nomeCliente = String(clienteSelezionato?.nome || "cliente")
      .replace(/[\/:*?"<>|]/g, "_")
      .trim()

    XLSX.writeFile(
      file,
      `punti_luce_${nomeCliente}_${serie}.xlsx`
    )
  }

  async function cancellaProgetto() {
    if (!clienteId || !serie) return

    const conferma = window.prompt(
      "Per cancellare tutto il progetto scrivi CANCELLA"
    )

    if (conferma !== "CANCELLA") return

    const { error } = await supabase
      .from("punti_luce_progetti")
      .delete()
      .eq("cliente_id", clienteId)
      .eq("serie", serie)

    if (error) {
      console.error("Errore cancellazione progetto online:", error)
      alert("Errore cancellazione progetto online: " + error.message)
      return
    }

    localStorage.removeItem(
      getStorageKey(clienteId, serie)
    )

    setStanze([])
    setLineeGenerali([])
    setMovimentiFilo([])
    setStanzaIdCorrente("")
    setUltimoSalvataggio("")
    resetInserimentoMateriali()

    alert("Progetto cancellato online")
  }

  const vociCapitoloAperto = vociDB.filter(
    (voce) => voce.capitolo === capitoloAperto
  )

  return (
    <div style={styles.pagina}>
      <h1 style={{ marginTop: 0 }}>
        💡 Progetto Punti Luce
      </h1>

      {messaggio && (
        <div style={styles.messaggio}>
          {messaggio}
        </div>
      )}

      <div style={styles.box}>
        <div style={styles.grigliaDue}>
          <div>
            <label style={styles.label}>Cliente</label>

            <select
              value={clienteId}
              onChange={(evento) =>
                setClienteId(evento.target.value)
              }
              style={styles.input}
            >
              <option value="">
                -- seleziona cliente --
              </option>

              {clienti.map((cliente) => (
                <option
                  key={cliente.id}
                  value={cliente.id}
                >
                  {cliente.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>
              Serie civile
            </label>

            <select
              value={serie}
              onChange={(evento) =>
                setSerie(evento.target.value)
              }
              style={styles.input}
            >
              <option value="">
                -- seleziona serie --
              </option>

              {serieCivili.map((nomeSerie) => (
                <option
                  key={nomeSerie}
                  value={nomeSerie}
                >
                  {nomeSerie}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.rigaAzioni}>
          <button
            onClick={nuovaStanza}
            style={styles.btnVerde}
          >
            ➕ Nuova stanza
          </button>

          <button
            onClick={esportaExcel}
            style={styles.btnBlu}
          >
            📊 Esporta Excel
          </button>

          <button
            onClick={cancellaProgetto}
            style={styles.btnRosso}
          >
            🗑 Cancella progetto
          </button>

          <span style={styles.testoSecondario}>
            {clienteId && serie
              ? ultimoSalvataggio === "ERRORE"
                ? "⚠️ Copia locale salvata - errore salvataggio online"
                : ultimoSalvataggio
                  ? `☁️ Salvato online alle ${ultimoSalvataggio}`
                  : "☁️ Salvataggio online automatico attivo"
              : "Seleziona cliente e serie"}
          </span>
        </div>
      </div>

      <details style={styles.tendinaStanze}>
        <summary style={styles.summaryStanze}>
          🏠 Stanze salvate ({stanze.length})
        </summary>

        <div style={styles.contenutoTendina}>
          {stanze.length === 0 ? (
            <div style={styles.vuoto}>
              Nessuna stanza salvata.
            </div>
          ) : (
            stanze.map((stanza, indice) => {
              const selezionata =
                String(stanza.id) ===
                String(stanzaIdCorrente)

              const totali = calcolaModuliDaScatole(
                stanza.scatole
              )

              const usati = calcolaModuliUsati(
                stanza.punti
              )

              return (
                <div
                  key={stanza.id}
                  style={{
                    ...styles.rigaStanzaSalvata,
                    background: selezionata
                      ? "#e7f1ff"
                      : "white",
                    borderColor: selezionata
                      ? "#0d6efd"
                      : "#d0d5dd"
                  }}
                >
                  <button
                    onClick={() =>
                      selezionaStanza(stanza.id)
                    }
                    style={styles.btnNomeStanza}
                  >
                    {indice + 1}.{" "}
                    {stanza.nome || "Stanza senza nome"}

                    <small style={styles.dettaglioStanza}>
                      {usati}/{totali} moduli
                    </small>
                  </button>

                  <button
                    onClick={() => eliminaStanza(stanza)}
                    style={styles.btnRossoPiccolo}
                  >
                    Elimina
                  </button>
                </div>
              )
            })
          )}
        </div>
      </details>

      {!stanzaCorrente ? (
        <div style={styles.boxCentrale}>
          <h3>Nessuna stanza selezionata</h3>

          <p>
            Seleziona cliente e serie, poi crea una
            nuova stanza.
          </p>

          <button
            onClick={nuovaStanza}
            style={styles.btnVerde}
          >
            ➕ Nuova stanza
          </button>
        </div>
      ) : (
        <>
          <div style={styles.box}>
            <div style={styles.rigaNomeModuli}>
              <div>
                <label style={styles.label}>
                  Nome stanza
                </label>

                <input
                  value={stanzaCorrente.nome}
                  onChange={(evento) =>
                    cambiaNomeStanza(evento.target.value)
                  }
                  style={styles.input}
                />
              </div>

              <MiniBox
                titolo="Totali"
                valore={moduliTotaliCorrente}
              />

              <MiniBox
                titolo="Inseriti"
                valore={moduliUsatiCorrente}
              />

              <MiniBox
                titolo="Rimasti"
                valore={moduliRimastiCorrente}
                danger={moduliRimastiCorrente < 0}
                ok={
                  moduliRimastiCorrente === 0 &&
                  moduliTotaliCorrente > 0
                }
              />
            </div>

            <div style={styles.grigliaScatole}>
              {scatoleDisponibili.map((scatola) => (
                <div
                  key={scatola.codice}
                  style={styles.boxScatola}
                >
                  <div style={styles.titoloScatola}>
                    {scatola.codice}
                    <span style={styles.testoSecondario}>
                      {scatola.moduli} moduli
                    </span>
                  </div>

                  <div style={styles.controlloQuantita}>
                    <button
                      onClick={() =>
                        variaScatola(
                          scatola.codice,
                          -1
                        )
                      }
                      style={styles.btnMeno}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min="0"
                      value={
                        stanzaCorrente.scatole?.[
                          scatola.codice
                        ] || 0
                      }
                      onChange={(evento) =>
                        aggiornaScatola(
                          scatola.codice,
                          evento.target.value
                        )
                      }
                      style={styles.inputQuantita}
                    />

                    <button
                      onClick={() =>
                        variaScatola(
                          scatola.codice,
                          1
                        )
                      }
                      style={styles.btnPiu}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.box}>
            <h2 style={{ marginTop: 0 }}>
              Inserimento materiali
            </h2>

            <div style={styles.testoSecondario}>
              Apri un capitolo, seleziona tutte le voci,
              inserisci le quantità e importale insieme.
            </div>

            <div style={styles.grigliaCapitoli}>
              {capitoli.map((capitolo) => {
                const usato = capitoloUsato(capitolo)
                const aperto =
                  capitoloAperto === capitolo
                const totale =
                  totaleQuantitaCapitolo(capitolo)

                return (
                  <button
                    key={capitolo}
                    onClick={() =>
                      apriChiudiCapitolo(capitolo)
                    }
                    style={{
                      ...styles.btnCapitolo,
                      background: usato
                        ? "#198754"
                        : aperto
                        ? "#e7f1ff"
                        : "#f2f4f7",
                      color: usato
                        ? "white"
                        : "#101828",
                      borderColor: usato
                        ? "#198754"
                        : aperto
                        ? "#0d6efd"
                        : "#d0d5dd"
                    }}
                  >
                    <span>
                      {labelCapitolo(capitolo)}
                    </span>

                    <small>
                      {usato
                        ? `✓ ${totale}`
                        : aperto
                        ? "aperto"
                        : "apri"}
                    </small>
                  </button>
                )
              })}
            </div>

            {capitoloAperto && (
              <div style={styles.pannelloCapitolo}>
                <h3 style={{ marginTop: 0 }}>
                  {labelCapitolo(capitoloAperto)}
                </h3>

                <div style={styles.tabellaContenitore}>
                  <table style={styles.tabellaSelezione}>
                    <thead>
                      <tr>
                        <th style={styles.th}>
                          Seleziona
                        </th>

                        <th style={styles.th}>
                          Voce
                        </th>

                        <th style={styles.th}>
                          Quantità
                        </th>

                        <th style={styles.th}>
                          Posti
                        </th>

                        <th style={styles.th}>
                          Descrizione / note
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {vociCapitoloAperto.map((voce) => {
                        const riga =
                          selezioni[voce.id] ||
                          creaRigaSelezione(voce)

                        const richiedeDescrizione =
                          String(
                            voce.voce || ""
                          ).toLowerCase() === "altro"

                        return (
                          <tr key={voce.id}>
                            <td
                              style={{
                                ...styles.td,
                                textAlign: "center"
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  riga.selezionata
                                }
                                onChange={(evento) =>
                                  aggiornaSelezione(
                                    voce,
                                    "selezionata",
                                    evento.target.checked
                                  )
                                }
                                style={
                                  styles.checkboxGrande
                                }
                              />
                            </td>

                            <td style={styles.td}>
                              <b>{voce.voce}</b>
                              <div
                                style={
                                  styles.testoSecondario
                                }
                              >
                                {voce.richiede_posti
                                  ? "Moduli secondo i posti"
                                  : `${Number(
                                      voce.moduli || 0
                                    )} moduli`}
                              </div>
                            </td>

                            <td style={styles.td}>
                              <input
                                type="number"
                                min="1"
                                value={riga.quantita}
                                onChange={(evento) =>
                                  aggiornaSelezione(
                                    voce,
                                    "quantita",
                                    evento.target.value
                                  )
                                }
                                style={
                                  styles.inputQuantitaRiga
                                }
                              />
                            </td>

                            <td style={styles.td}>
                              {voce.richiede_posti ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={riga.posti}
                                  onChange={(evento) =>
                                    aggiornaSelezione(
                                      voce,
                                      "posti",
                                      evento.target.value
                                    )
                                  }
                                  style={
                                    styles.inputQuantitaRiga
                                  }
                                />
                              ) : (
                                <span>-</span>
                              )}
                            </td>

                            <td style={styles.td}>
                              <input
                                value={riga.descrizione}
                                onChange={(evento) =>
                                  aggiornaSelezione(
                                    voce,
                                    "descrizione",
                                    evento.target.value
                                  )
                                }
                                placeholder={
                                  richiedeDescrizione
                                    ? "Obbligatoria"
                                    : "Facoltativa"
                                }
                                style={styles.input}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={styles.areaImporta}>
                  <button
                    onClick={() =>
                      importaVociCapitolo(
                        capitoloAperto
                      )
                    }
                    style={styles.btnImporta}
                  >
                    Importa voci selezionate
                  </button>
                </div>
              </div>
            )}
          </div>


          <div style={styles.box}>
            <div style={styles.testataSezione}>
              <div>
                <h2 style={{ margin: 0 }}>
                  📋 Lista completa della stanza
                </h2>

                <div style={styles.testoSecondario}>
                  {stanzaCorrente.nome} ·{" "}
                  {stanzaCorrente.punti.length} righe
                </div>
              </div>

              <div style={styles.riepilogoPiccolo}>
                Totali: <b>{moduliTotaliCorrente}</b>
                {" · "}
                Inseriti: <b>{moduliUsatiCorrente}</b>
                {" · "}
                Rimasti:{" "}
                <b>{moduliRimastiCorrente}</b>
              </div>
            </div>

            {stanzaCorrente.punti.length === 0 ? (
              <div style={styles.vuoto}>
                Nessuna voce importata in questa stanza.
              </div>
            ) : (
              capitoli.map((capitolo) => {
                const lista =
                  stanzaCorrente.punti.filter(
                    (punto) =>
                      punto.capitolo === capitolo
                  )

                if (lista.length === 0) return null

                return (
                  <div
                    key={capitolo}
                    style={styles.gruppoLista}
                  >
                    <h3>
                      {labelCapitolo(capitolo)}
                    </h3>

                    <div
                      style={styles.tabellaContenitore}
                    >
                      <table style={styles.tabella}>
                        <thead>
                          <tr>
                            <th style={styles.th}>
                              Quantità
                            </th>

                            <th style={styles.th}>
                              Descrizione
                            </th>

                            <th style={styles.th}>
                              Posti
                            </th>

                            <th style={styles.th}>
                              Moduli
                            </th>

                            <th style={styles.th}>
                              Azioni
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {lista.map((punto) => (
                            <tr key={punto.id}>
                              <td style={styles.td}>
                                <div
                                  style={
                                    styles.controlloQuantitaPiccolo
                                  }
                                >
                                  <button
                                    onClick={() =>
                                      cambiaQuantitaPunto(
                                        punto.id,
                                        -1
                                      )
                                    }
                                    style={
                                      styles.btnMenoPiccolo
                                    }
                                  >
                                    −
                                  </button>

                                  <b>{punto.quantita}</b>

                                  <button
                                    onClick={() =>
                                      cambiaQuantitaPunto(
                                        punto.id,
                                        1
                                      )
                                    }
                                    style={
                                      styles.btnPiuPiccolo
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              <td style={styles.td}>
                                {punto.descrizione}
                              </td>

                              <td style={styles.td}>
                                {punto.posti}
                              </td>

                              <td style={styles.td}>
                                {calcolaModuliPunto(punto)}
                              </td>

                              <td style={styles.td}>
                                <button
                                  onClick={() =>
                                    eliminaPunto(punto.id)
                                  }
                                  style={
                                    styles.btnRossoPiccolo
                                  }
                                >
                                  Elimina
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })
            )}

            <div style={styles.areaSalva}>
              <button
                onClick={salvaENuovaStanza}
                style={styles.btnSalvaNuova}
              >
                💾 Salva stanza e crea nuova
              </button>
            </div>
          </div>
        </>
      )}


      <div style={styles.box}>
        <div style={styles.testataSezione}>
          <div>
            <h2 style={{ margin: 0 }}>🧶 Filo portato e tolto</h2>
            <div style={styles.testoSecondario}>
              Inserisci ogni volta i metri portati in cantiere oppure i metri
              riportati via.
            </div>
          </div>

          <div style={styles.riepilogoPiccolo}>
            Portati: <b>{formatoNumero(totaliFilo.portati)} m</b>
            {" · "}
            Tolti: <b>{formatoNumero(totaliFilo.tolti)} m</b>
            {" · "}
            Netti: <b>{formatoNumero(totaliFilo.netti)} m</b>
          </div>
        </div>

        <div style={styles.grigliaMovimentoFilo}>
          <div>
            <label style={styles.label}>Movimento</label>
            <select
              value={nuovoMovimentoFilo.movimento}
              onChange={(evento) =>
                setNuovoMovimentoFilo((precedente) => ({
                  ...precedente,
                  movimento: evento.target.value
                }))
              }
              style={styles.input}
            >
              <option value="portato">Portato in cantiere</option>
              <option value="tolto">Tolto / riportato via</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Sezione mm²</label>
            <select
              value={nuovoMovimentoFilo.sezione}
              onChange={(evento) =>
                setNuovoMovimentoFilo((precedente) => ({
                  ...precedente,
                  sezione: evento.target.value
                }))
              }
              style={styles.input}
            >
              {["0.5", "0.75", "1", "1.5", "2.5", "4", "6", "10", "16"].map(
                (sezione) => (
                  <option key={sezione} value={sezione}>
                    {sezione.replace(".", ",")}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label style={styles.label}>Colore</label>
            <input
              value={nuovoMovimentoFilo.colore}
              onChange={(evento) =>
                setNuovoMovimentoFilo((precedente) => ({
                  ...precedente,
                  colore: evento.target.value
                }))
              }
              placeholder="Blu, nero, terra..."
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Metri</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={nuovoMovimentoFilo.metri}
              onChange={(evento) =>
                setNuovoMovimentoFilo((precedente) => ({
                  ...precedente,
                  metri: evento.target.value
                }))
              }
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Note</label>
            <input
              value={nuovoMovimentoFilo.note}
              onChange={(evento) =>
                setNuovoMovimentoFilo((precedente) => ({
                  ...precedente,
                  note: evento.target.value
                }))
              }
              placeholder="Facoltative"
              style={styles.input}
            />
          </div>

          <button
            onClick={aggiungiMovimentoFilo}
            style={styles.btnImporta}
          >
            Aggiungi movimento
          </button>
        </div>

        {movimentiFilo.length === 0 ? (
          <div style={styles.vuoto}>Nessun movimento di filo inserito.</div>
        ) : (
          <div style={{ ...styles.tabellaContenitore, marginTop: 12 }}>
            <table style={styles.tabellaLinee}>
              <thead>
                <tr>
                  <th style={styles.th}>Movimento</th>
                  <th style={styles.th}>Sezione</th>
                  <th style={styles.th}>Colore</th>
                  <th style={styles.th}>Metri</th>
                  <th style={styles.th}>Note</th>
                  <th style={styles.th}>Azioni</th>
                </tr>
              </thead>

              <tbody>
                {movimentiFilo.map((movimento) => (
                  <tr key={movimento.id}>
                    <td style={styles.td}>
                      <select
                        value={movimento.movimento}
                        onChange={(evento) =>
                          aggiornaMovimentoFilo(
                            movimento.id,
                            "movimento",
                            evento.target.value
                          )
                        }
                        style={styles.inputTabella}
                      >
                        <option value="portato">Portato</option>
                        <option value="tolto">Tolto</option>
                      </select>
                    </td>

                    <td style={styles.td}>
                      <select
                        value={movimento.sezione}
                        onChange={(evento) =>
                          aggiornaMovimentoFilo(
                            movimento.id,
                            "sezione",
                            evento.target.value
                          )
                        }
                        style={styles.inputTabella}
                      >
                        {["0.5", "0.75", "1", "1.5", "2.5", "4", "6", "10", "16"].map(
                          (sezione) => (
                            <option key={sezione} value={sezione}>
                              {sezione.replace(".", ",")} mm²
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td style={styles.td}>
                      <input
                        value={movimento.colore}
                        onChange={(evento) =>
                          aggiornaMovimentoFilo(
                            movimento.id,
                            "colore",
                            evento.target.value
                          )
                        }
                        style={styles.inputTabella}
                      />
                    </td>

                    <td style={styles.td}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={movimento.metri}
                        onChange={(evento) =>
                          aggiornaMovimentoFilo(
                            movimento.id,
                            "metri",
                            evento.target.value
                          )
                        }
                        style={styles.inputNumeroTabella}
                      />
                    </td>

                    <td style={styles.td}>
                      <input
                        value={movimento.note || ""}
                        onChange={(evento) =>
                          aggiornaMovimentoFilo(
                            movimento.id,
                            "note",
                            evento.target.value
                          )
                        }
                        style={styles.inputTabella}
                      />
                    </td>

                    <td style={styles.td}>
                      <button
                        onClick={() => eliminaMovimentoFilo(movimento.id)}
                        style={styles.btnRossoPiccolo}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.box}>
        <div style={styles.testataSezione}>
          <div>
            <h2 style={{ margin: 0 }}>📏 Linee posate</h2>
            <div style={styles.testoSecondario}>
              Inserisci i metri reali della linea e una descrizione. La sezione
              e il numero di fili servono per calcolare anche i metri totali di
              conduttore.
            </div>
          </div>

          <div style={styles.riepilogoPiccolo}>
            Metri linee: <b>{formatoNumero(riepilogoLinee.metriLinee)} m</b>
            {" · "}
            Metri filo:{" "}
            <b>{formatoNumero(riepilogoLinee.metriConduttore)} m</b>
          </div>
        </div>

        <div style={styles.grigliaLineaGenerale}>
          <div style={styles.campoLineaLargo}>
            <label style={styles.label}>Descrizione linea</label>
            <input
              value={nuovaLinea.descrizione}
              onChange={(evento) =>
                setNuovaLinea((precedente) => ({
                  ...precedente,
                  descrizione: evento.target.value
                }))
              }
              placeholder="Esempio: Linea prese cucina"
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Metri linea</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={nuovaLinea.lunghezza}
              onChange={(evento) =>
                setNuovaLinea((precedente) => ({
                  ...precedente,
                  lunghezza: evento.target.value
                }))
              }
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.label}>Sezione mm²</label>
            <select
              value={nuovaLinea.sezione}
              onChange={(evento) =>
                setNuovaLinea((precedente) => ({
                  ...precedente,
                  sezione: evento.target.value
                }))
              }
              style={styles.input}
            >
              {["0.5", "0.75", "1", "1.5", "2.5", "4", "6", "10", "16"].map(
                (sezione) => (
                  <option key={sezione} value={sezione}>
                    {sezione.replace(".", ",")}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label style={styles.label}>Numero fili</label>
            <input
              type="number"
              min="1"
              value={nuovaLinea.numeroFili}
              onChange={(evento) =>
                setNuovaLinea((precedente) => ({
                  ...precedente,
                  numeroFili: evento.target.value
                }))
              }
              style={styles.input}
            />
          </div>

          <div style={styles.campoLineaLargo}>
            <label style={styles.label}>Note</label>
            <input
              value={nuovaLinea.note}
              onChange={(evento) =>
                setNuovaLinea((precedente) => ({
                  ...precedente,
                  note: evento.target.value
                }))
              }
              placeholder="Facoltative"
              style={styles.input}
            />
          </div>

          <div style={styles.anteprimaLinea}>
            {formatoNumero(nuovaLinea.lunghezza)} m linea
            {" · "}
            <b>
              {formatoNumero(
                Number(nuovaLinea.lunghezza || 0) *
                  Number(nuovaLinea.numeroFili || 0)
              )}{" "}
              m filo
            </b>
          </div>

          <button onClick={aggiungiLinea} style={styles.btnImporta}>
            Aggiungi linea
          </button>
        </div>

        {lineeGenerali.length === 0 ? (
          <div style={styles.vuoto}>Nessuna linea inserita.</div>
        ) : (
          <div style={{ ...styles.tabellaContenitore, marginTop: 12 }}>
            <table style={styles.tabellaLinee}>
              <thead>
                <tr>
                  <th style={styles.th}>Descrizione</th>
                  <th style={styles.th}>Metri linea</th>
                  <th style={styles.th}>Sezione</th>
                  <th style={styles.th}>Numero fili</th>
                  <th style={styles.th}>Metri filo</th>
                  <th style={styles.th}>Note</th>
                  <th style={styles.th}>Azioni</th>
                </tr>
              </thead>

              <tbody>
                {lineeGenerali.map((linea) => (
                  <tr key={linea.id}>
                    <td style={styles.td}>
                      <input
                        value={linea.descrizione}
                        onChange={(evento) =>
                          aggiornaLinea(
                            linea.id,
                            "descrizione",
                            evento.target.value
                          )
                        }
                        style={styles.inputTabella}
                      />
                    </td>

                    <td style={styles.td}>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={linea.lunghezza}
                        onChange={(evento) =>
                          aggiornaLinea(
                            linea.id,
                            "lunghezza",
                            evento.target.value
                          )
                        }
                        style={styles.inputNumeroTabella}
                      />
                    </td>

                    <td style={styles.td}>
                      <select
                        value={linea.sezione}
                        onChange={(evento) =>
                          aggiornaLinea(
                            linea.id,
                            "sezione",
                            evento.target.value
                          )
                        }
                        style={styles.inputTabella}
                      >
                        {["0.5", "0.75", "1", "1.5", "2.5", "4", "6", "10", "16"].map(
                          (sezione) => (
                            <option key={sezione} value={sezione}>
                              {sezione.replace(".", ",")} mm²
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td style={styles.td}>
                      <input
                        type="number"
                        min="1"
                        value={linea.numeroFili}
                        onChange={(evento) =>
                          aggiornaLinea(
                            linea.id,
                            "numeroFili",
                            evento.target.value
                          )
                        }
                        style={styles.inputNumeroTabella}
                      />
                    </td>

                    <td style={styles.td}>
                      <b>{formatoNumero(metriConduttoreLinea(linea))} m</b>
                    </td>

                    <td style={styles.td}>
                      <input
                        value={linea.note || ""}
                        onChange={(evento) =>
                          aggiornaLinea(
                            linea.id,
                            "note",
                            evento.target.value
                          )
                        }
                        style={styles.inputTabella}
                      />
                    </td>

                    <td style={styles.td}>
                      <button
                        onClick={() => eliminaLinea(linea.id)}
                        style={styles.btnRossoPiccolo}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {riepilogoFili.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3>📊 Riepilogo per sezione</h3>

            <div style={styles.tabellaContenitore}>
              <table style={styles.tabellaLinee}>
                <thead>
                  <tr>
                    <th style={styles.th}>Sezione</th>
                    <th style={styles.th}>Portati</th>
                    <th style={styles.th}>Tolti</th>
                    <th style={styles.th}>Netti</th>
                    <th style={styles.th}>Metri linee</th>
                    <th style={styles.th}>Metri filo calcolati</th>
                  </tr>
                </thead>

                <tbody>
                  {riepilogoFili.map((riga) => (
                    <tr key={riga.sezione}>
                      <td style={styles.td}>
                        <b>
                          {String(riga.sezione).replace(".", ",")} mm²
                        </b>
                      </td>
                      <td style={styles.td}>
                        {formatoNumero(riga.metriPortati)} m
                      </td>
                      <td style={styles.td}>
                        {formatoNumero(riga.metriTolti)} m
                      </td>
                      <td style={styles.td}>
                        <b>{formatoNumero(riga.metriNetti)} m</b>
                      </td>
                      <td style={styles.td}>
                        {formatoNumero(riga.metriLinee)} m
                      </td>
                      <td style={styles.td}>
                        {formatoNumero(riga.metriConduttore)} m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={styles.box}>
        <h2 style={{ marginTop: 0 }}>
          📊 Riepilogo generale
        </h2>

        <div style={styles.grigliaRiepilogo}>
          <MiniBox
            titolo="Stanze"
            valore={stanze.length}
          />

          <MiniBox
            titolo="Scatole"
            valore={riepilogoGenerale.numeroScatole}
          />

          <MiniBox
            titolo="Punti"
            valore={riepilogoGenerale.numeroPunti}
          />

          <MiniBox
            titolo="Moduli totali"
            valore={riepilogoGenerale.moduliTotali}
          />

          <MiniBox
            titolo="Moduli usati"
            valore={riepilogoGenerale.moduliUsati}
          />

          <MiniBox
            titolo="Moduli rimasti"
            valore={
              riepilogoGenerale.moduliTotali -
              riepilogoGenerale.moduliUsati
            }
            danger={
              riepilogoGenerale.moduliTotali -
                riepilogoGenerale.moduliUsati <
              0
            }
          />

          <MiniBox
            titolo="Filo portato"
            valore={`${formatoNumero(riepilogoGenerale.metriPortati)} m`}
          />

          <MiniBox
            titolo="Filo tolto"
            valore={`${formatoNumero(riepilogoGenerale.metriTolti)} m`}
          />

          <MiniBox
            titolo="Filo netto"
            valore={`${formatoNumero(riepilogoGenerale.metriNetti)} m`}
            danger={riepilogoGenerale.metriNetti < 0}
          />

          <MiniBox
            titolo="Metri linee"
            valore={`${formatoNumero(riepilogoGenerale.metriLinee)} m`}
          />

          <MiniBox
            titolo="Metri filo"
            valore={`${formatoNumero(riepilogoGenerale.metriConduttore)} m`}
          />
        </div>
      </div>
    </div>
  )
}

function MiniBox({
  titolo,
  valore,
  danger = false,
  ok = false
}) {
  let background = "#f8f9fa"
  let borderColor = "#d0d5dd"
  let color = "#101828"

  if (danger) {
    background = "#fee4e2"
    borderColor = "#f97066"
    color = "#b42318"
  }

  if (ok) {
    background = "#dcfae6"
    borderColor = "#6ce9a6"
    color = "#067647"
  }

  return (
    <div
      style={{
        ...styles.miniBox,
        background,
        borderColor,
        color
      }}
    >
      <div style={styles.titoloMiniBox}>
        {titolo}
      </div>

      <div style={styles.valoreMiniBox}>
        {valore}
      </div>
    </div>
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

  box: {
    border: "1px solid #d0d5dd",
    borderRadius: 9,
    padding: 12,
    marginTop: 12,
    background: "#ffffff"
  },

  boxCentrale: {
    border: "1px solid #d0d5dd",
    borderRadius: 9,
    padding: 30,
    marginTop: 12,
    background: "#ffffff",
    textAlign: "center"
  },

  messaggio: {
    position: "sticky",
    top: 8,
    zIndex: 50,
    padding: "10px 12px",
    border: "1px solid #75b798",
    borderRadius: 7,
    background: "#d1e7dd",
    fontWeight: "bold"
  },

  grigliaDue: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 10
  },

  label: {
    display: "block",
    marginBottom: 5,
    fontWeight: "bold",
    fontSize: 14
  },

  input: {
    width: "100%",
    padding: 8,
    border: "1px solid #c7cdd4",
    borderRadius: 6,
    boxSizing: "border-box",
    background: "white"
  },

  rigaAzioni: {
    display: "flex",
    gap: 9,
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 10
  },

  testoSecondario: {
    color: "#667085",
    fontSize: 13
  },

  tendinaStanze: {
    marginTop: 12,
    border: "1px solid #d0d5dd",
    borderRadius: 9,
    background: "#ffffff",
    overflow: "hidden"
  },

  summaryStanze: {
    padding: 12,
    cursor: "pointer",
    fontWeight: "bold",
    background: "#f8f9fa"
  },

  contenutoTendina: {
    display: "grid",
    gap: 7,
    padding: 10
  },

  rigaStanzaSalvata: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 8,
    border: "1px solid",
    borderRadius: 7
  },

  btnNomeStanza: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flex: 1,
    border: "none",
    background: "transparent",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: "bold"
  },

  dettaglioStanza: {
    color: "#667085",
    fontWeight: "normal"
  },

  rigaNomeModuli: {
    display: "grid",
    gridTemplateColumns:
      "minmax(250px, 1.6fr) repeat(3, minmax(110px, 0.55fr))",
    gap: 9,
    alignItems: "end"
  },

  miniBox: {
    minHeight: 62,
    padding: 7,
    border: "1px solid",
    borderRadius: 7,
    textAlign: "center"
  },

  titoloMiniBox: {
    fontSize: 13,
    fontWeight: "bold"
  },

  valoreMiniBox: {
    marginTop: 3,
    fontSize: 22,
    fontWeight: "bold"
  },

  grigliaScatole: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 9,
    marginTop: 12
  },

  boxScatola: {
    padding: 9,
    border: "1px solid #d0d5dd",
    borderRadius: 7,
    background: "#f9fafb"
  },

  titoloScatola: {
    display: "flex",
    justifyContent: "space-between",
    gap: 7,
    marginBottom: 7,
    fontWeight: "bold"
  },

  controlloQuantita: {
    display: "grid",
    gridTemplateColumns: "40px 1fr 40px",
    gap: 5
  },

  inputQuantita: {
    width: "100%",
    padding: 7,
    border: "1px solid #c7cdd4",
    borderRadius: 5,
    textAlign: "center",
    fontWeight: "bold"
  },

  btnMeno: {
    border: "none",
    borderRadius: 5,
    background: "#667085",
    color: "white",
    fontSize: 19,
    fontWeight: "bold",
    cursor: "pointer"
  },

  btnPiu: {
    border: "none",
    borderRadius: 5,
    background: "#198754",
    color: "white",
    fontSize: 19,
    fontWeight: "bold",
    cursor: "pointer"
  },

  grigliaCapitoli: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 8,
    marginTop: 12
  },

  btnCapitolo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    padding: "12px 14px",
    border: "2px solid",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    textAlign: "left"
  },

  pannelloCapitolo: {
    marginTop: 12,
    padding: 12,
    border: "2px solid #9ec5fe",
    borderRadius: 8,
    background: "#f8fbff"
  },

  tabellaContenitore: {
    overflowX: "auto"
  },

  tabellaSelezione: {
    width: "100%",
    minWidth: 760,
    borderCollapse: "collapse"
  },

  tabella: {
    width: "100%",
    minWidth: 680,
    borderCollapse: "collapse"
  },

  th: {
    padding: 8,
    border: "1px solid #d0d5dd",
    background: "#f2f4f7",
    textAlign: "left"
  },

  td: {
    padding: 7,
    border: "1px solid #d0d5dd"
  },

  checkboxGrande: {
    width: 20,
    height: 20,
    cursor: "pointer"
  },

  inputQuantitaRiga: {
    width: 85,
    padding: 7,
    border: "1px solid #c7cdd4",
    borderRadius: 5,
    textAlign: "center",
    fontWeight: "bold"
  },

  areaImporta: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 12
  },

  btnImporta: {
    padding: "11px 16px",
    border: "none",
    borderRadius: 7,
    background: "#198754",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15
  },

  testataSezione: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap"
  },

  riepilogoPiccolo: {
    padding: "7px 10px",
    borderRadius: 7,
    background: "#f8f9fa"
  },

  vuoto: {
    marginTop: 10,
    padding: 15,
    borderRadius: 7,
    background: "#f8f9fa",
    color: "#667085",
    textAlign: "center"
  },

  gruppoLista: {
    marginTop: 15
  },

  controlloQuantitaPiccolo: {
    display: "grid",
    gridTemplateColumns: "29px 35px 29px",
    alignItems: "center",
    gap: 4,
    textAlign: "center"
  },

  btnMenoPiccolo: {
    padding: 4,
    border: "none",
    borderRadius: 4,
    background: "#667085",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },

  btnPiuPiccolo: {
    padding: 4,
    border: "none",
    borderRadius: 4,
    background: "#198754",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },

  areaSalva: {
    display: "flex",
    justifyContent: "center",
    marginTop: 20,
    paddingTop: 15,
    borderTop: "2px solid #eaecf0"
  },

  btnSalvaNuova: {
    minWidth: 290,
    padding: "13px 20px",
    border: "none",
    borderRadius: 7,
    background: "#0d6efd",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 16
  },

  grigliaRiepilogo: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 8
  },

  btnVerde: {
    padding: "8px 11px",
    border: "none",
    borderRadius: 6,
    background: "#198754",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },

  btnBlu: {
    padding: "8px 11px",
    border: "none",
    borderRadius: 6,
    background: "#0d6efd",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },

  btnRosso: {
    padding: "8px 11px",
    border: "none",
    borderRadius: 6,
    background: "#dc3545",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },

  btnRossoPiccolo: {
    padding: "6px 9px",
    border: "none",
    borderRadius: 5,
    background: "#dc3545",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold"
  },

  grigliaMovimentoFilo: {
    display: "grid",
    gridTemplateColumns:
      "170px 130px minmax(150px, 1fr) 120px minmax(180px, 1fr) auto",
    gap: 8,
    alignItems: "end",
    marginTop: 12
  },

  grigliaLineaGenerale: {
    display: "grid",
    gridTemplateColumns:
      "minmax(230px, 1.5fr) 120px 130px 110px minmax(180px, 1fr) auto auto",
    gap: 8,
    alignItems: "end",
    marginTop: 12
  },

  grigliaLinea: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1.5fr) 120px 130px 110px minmax(220px, 1fr) minmax(180px, 1fr) auto auto",
    gap: 8,
    alignItems: "end",
    marginTop: 12
  },

  campoLineaLargo: {
    minWidth: 0
  },

  anteprimaLinea: {
    padding: "8px 10px",
    border: "1px solid #9ec5fe",
    borderRadius: 6,
    background: "#e7f1ff",
    whiteSpace: "nowrap"
  },

  grigliaMatassa: {
    display: "grid",
    gridTemplateColumns: "130px minmax(160px, 1fr) 130px 130px minmax(180px, 1fr) auto",
    gap: 8,
    alignItems: "end",
    marginTop: 12
  },

  tabellaLinee: {
    width: "100%",
    minWidth: 820,
    borderCollapse: "collapse"
  },

  inputTabella: {
    width: "100%",
    minWidth: 120,
    padding: 6,
    border: "1px solid #c7cdd4",
    borderRadius: 5,
    boxSizing: "border-box"
  },

  inputNumeroTabella: {
    width: 95,
    padding: 6,
    border: "1px solid #c7cdd4",
    borderRadius: 5,
    boxSizing: "border-box",
    textAlign: "right"
  }
}
