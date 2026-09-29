import { useEffect, useState, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

export default function CarrelliPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const interventoIdDaUrl = searchParams.get("intervento_id")

  const [carrelli, setCarrelli] = useState([])
  const [righe, setRighe] = useState([])
  const [selected, setSelected] = useState(null)

  const [interventi, setInterventi] = useState([])
  const [interventoSelezionato, setInterventoSelezionato] = useState("")
  const [interventoCorrente, setInterventoCorrente] = useState(null)
  const [materialiIntervento, setMaterialiIntervento] = useState([])

  const [searchNome, setSearchNome] = useState("")
  const [dataDa, setDataDa] = useState("")
  const [dataA, setDataA] = useState("")

  const [filtro1, setFiltro1] = useState("")
  const [filtro2, setFiltro2] = useState("")
  const [filtro3, setFiltro3] = useState("")
  const [filtro4, setFiltro4] = useState("")
  const [descrizioneRicerca, setDescrizioneRicerca] = useState("")

  const ref1 = useRef(null)
  const ref2 = useRef(null)
  const ref3 = useRef(null)
  const ref4 = useRef(null)
  const risultatiMaterialiRef = useRef(null)
  const dettaglioCarrelloRef = useRef(null)
  const ricercaNomeRef = useRef(null)

  const [importando, setImportando] = useState(false)
  const [caricandoCSV, setCaricandoCSV] = useState(false)
  const [mostraPrezzi, setMostraPrezzi] = useState(false)
  const [righeSelezionate, setRigheSelezionate] = useState([])
  const [salvandoRigaId, setSalvandoRigaId] = useState(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  )

  // ===== CREAZIONE CARRELLO DA LISTINO =====
  const [mostraCreaDaListino, setMostraCreaDaListino] = useState(false)
  const [nomeNuovoCarrello, setNomeNuovoCarrello] = useState("")
  const [listinoFiltro1, setListinoFiltro1] = useState("")
  const [listinoFiltro2, setListinoFiltro2] = useState("")
  const [listinoFiltro3, setListinoFiltro3] = useState("")
  const [listinoFiltro4, setListinoFiltro4] = useState("")
  const [risultatiListino, setRisultatiListino] = useState([])
  const [listinoSelezionati, setListinoSelezionati] = useState([])
  const [quantitaListino, setQuantitaListino] = useState({})
  const [righeNuovoCarrello, setRigheNuovoCarrello] = useState([])
  const [cercandoListino, setCercandoListino] = useState(false)
  const [salvandoNuovoCarrello, setSalvandoNuovoCarrello] = useState(false)

  // ===== INSIEMI CARRELLI =====
  const [insiemiCarrelli, setInsiemiCarrelli] = useState([])
  const [nomeNuovoInsieme, setNomeNuovoInsieme] = useState("")
  const [insiemeDestinazione, setInsiemeDestinazione] = useState("")
  const [carrelliSelezionatiInsieme, setCarrelliSelezionatiInsieme] = useState([])
  const [salvandoInsieme, setSalvandoInsieme] = useState(false)
  const [mostraGestioneInsiemi, setMostraGestioneInsiemi] = useState(false)

  // ===== RICERCA PULITA CARRELLI =====
  const [ricercaInsieme, setRicercaInsieme] = useState("")
  const [ricercaNomeCarrello, setRicercaNomeCarrello] = useState("")
  const [ricercaPromemoria, setRicercaPromemoria] = useState("")
  const [ricercaEseguita, setRicercaEseguita] = useState(false)
  const [focusSuggerimenti, setFocusSuggerimenti] = useState(null)
  const [indiceSuggerimentoNome, setIndiceSuggerimentoNome] = useState(-1)
  const [indiceSuggerimentoFornitore, setIndiceSuggerimentoFornitore] = useState(-1)
  const [indiceSuggerimentoPromemoria, setIndiceSuggerimentoPromemoria] = useState(-1)

  // ===== RICERCA VELOCE NEI PREFERITI =====
  const [ricercaVelocePreferiti, setRicercaVelocePreferiti] = useState("")
  const [ricercaVelocePreferiti2, setRicercaVelocePreferiti2] = useState("")
  const [risultatiPreferiti, setRisultatiPreferiti] = useState([])
  const [cercandoPreferiti, setCercandoPreferiti] = useState(false)
  const [preferitiSelezionati, setPreferitiSelezionati] = useState([])
  const [quantitaPreferiti, setQuantitaPreferiti] = useState({})
  const [inserendoPreferiti, setInserendoPreferiti] = useState(false)
  const risultatiPreferitiRef = useRef(null)

  useEffect(() => {
    function aggiornaVista() {
      setIsMobile(window.innerWidth <= 768)
    }

    aggiornaVista()
    window.addEventListener("resize", aggiornaVista)
    return () => window.removeEventListener("resize", aggiornaVista)
  }, [])

  useEffect(() => {
    caricaCarrelli()
    caricaInterventi()
    caricaInsiemiCarrelli()
  }, [])

  useEffect(() => {
    if (interventoIdDaUrl) {
      setInterventoSelezionato(interventoIdDaUrl)
      caricaMaterialiIntervento(interventoIdDaUrl)
    }
  }, [interventoIdDaUrl])

  useEffect(() => {
    const id = interventoIdDaUrl || interventoSelezionato
    if (id) caricaMaterialiIntervento(id)
    else setMaterialiIntervento([])
  }, [interventoSelezionato, interventoIdDaUrl])

  // Ricerca veloce LIVE nei Preferiti: i due campi lavorano insieme (AND)
  useEffect(() => {
    const testo1 = String(ricercaVelocePreferiti || "").trim()
    const testo2 = String(ricercaVelocePreferiti2 || "").trim()

    if (!testo1 && !testo2) {
      setRisultatiPreferiti([])
      setPreferitiSelezionati([])
      setQuantitaPreferiti({})
      setCercandoPreferiti(false)
      return
    }

    setPreferitiSelezionati([])
    setQuantitaPreferiti({})

    const timer = setTimeout(() => {
      cercaNeiPreferiti(testo1, testo2, false)
    }, 220)

    return () => clearTimeout(timer)
  }, [ricercaVelocePreferiti, ricercaVelocePreferiti2, ricercaInsieme, ricercaNomeCarrello, selected?.id])

  function tornaAllIntervento() {
    const id = interventoIdDaUrl || interventoSelezionato
    if (!id) {
      navigate("/interventi")
      return
    }
    navigate(`/interventi?edit_id=${id}`)
  }

  async function caricaCarrelli() {
    const { data, error } = await supabase
      .from("bolle_acquisto")
      .select("*")
      .eq("tipo", "carrello")
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento carrelli: " + error.message)
      return
    }

    setCarrelli(data || [])
  }

  async function caricaInsiemiCarrelli() {
    const { data, error } = await supabase
      .from("insiemi_carrelli")
      .select("id, nome, created_at")
      .order("nome", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento insiemi: " + error.message)
      return
    }

    setInsiemiCarrelli(data || [])
  }

  async function creaNuovoInsieme() {
    const nomePulito = nomeNuovoInsieme.trim()

    if (!nomePulito) {
      alert("Scrivi il nome dell'insieme")
      return
    }

    const giaPresente = insiemiCarrelli.some(
      i => String(i.nome || "").trim().toLowerCase() === nomePulito.toLowerCase()
    )

    if (giaPresente) {
      alert("Questo insieme esiste già")
      setInsiemeDestinazione(nomePulito)
      return
    }

    setSalvandoInsieme(true)

    try {
      const { data, error } = await supabase
        .from("insiemi_carrelli")
        .insert({ nome: nomePulito })
        .select("id, nome, created_at")
        .single()

      if (error) {
        console.error(error)
        alert("Errore creazione insieme: " + error.message)
        return
      }

      setInsiemiCarrelli(prev => [...prev, data].sort((a, b) =>
        String(a.nome || "").localeCompare(String(b.nome || ""), "it")
      ))
      setInsiemeDestinazione(data.nome)
      setNomeNuovoInsieme("")
      alert(`✅ Insieme "${data.nome}" creato`)
    } finally {
      setSalvandoInsieme(false)
    }
  }

  async function rinominaInsiemeSelezionato() {
    const nomeVecchio = String(insiemeDestinazione || "").trim()

    if (!nomeVecchio) {
      alert("Seleziona prima l'insieme da rinominare")
      return
    }

    const nuovoNomeInput = window.prompt("Nuovo nome insieme", nomeVecchio)
    if (nuovoNomeInput === null) return

    const nuovoNome = nuovoNomeInput.trim()

    if (!nuovoNome) {
      alert("Il nome dell'insieme non può essere vuoto")
      return
    }

    if (nuovoNome.toLowerCase() === nomeVecchio.toLowerCase()) {
      if (nuovoNome !== nomeVecchio) {
        // consente solo una variazione di maiuscole/minuscole
      } else {
        return
      }
    }

    const duplicato = insiemiCarrelli.some(i =>
      String(i.nome || "").trim().toLowerCase() === nuovoNome.toLowerCase() &&
      String(i.nome || "").trim().toLowerCase() !== nomeVecchio.toLowerCase()
    )

    if (duplicato) {
      alert(`Esiste già un insieme chiamato "${nuovoNome}"`)
      return
    }

    const insiemeRecord = insiemiCarrelli.find(i => String(i.nome || "").trim() === nomeVecchio)
    if (!insiemeRecord?.id) {
      alert("Non trovo l'insieme da rinominare")
      return
    }

    const conferma = window.confirm(
      `Vuoi rinominare l'insieme "${nomeVecchio}" in "${nuovoNome}"?\n\n` +
      `Verranno aggiornati automaticamente anche tutti i carrelli contenuti.`
    )

    if (!conferma) return

    setSalvandoInsieme(true)

    try {
      const { error: carrelliError } = await supabase
        .from("bolle_acquisto")
        .update({ insieme_carrello: nuovoNome })
        .eq("insieme_carrello", nomeVecchio)

      if (carrelliError) {
        console.error(carrelliError)
        alert("Errore aggiornamento carrelli: " + carrelliError.message)
        return
      }

      const { error: insiemeError } = await supabase
        .from("insiemi_carrelli")
        .update({ nome: nuovoNome })
        .eq("id", insiemeRecord.id)

      if (insiemeError) {
        console.error(insiemeError)

        // Prova a ripristinare i carrelli al vecchio nome per non lasciare dati incoerenti.
        const { error: rollbackError } = await supabase
          .from("bolle_acquisto")
          .update({ insieme_carrello: nomeVecchio })
          .eq("insieme_carrello", nuovoNome)

        if (rollbackError) console.error("Errore rollback rinomina insieme:", rollbackError)

        alert("Errore rinomina insieme: " + insiemeError.message)
        return
      }

      setInsiemiCarrelli(prev => prev
        .map(i => i.id === insiemeRecord.id ? { ...i, nome: nuovoNome } : i)
        .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "it"))
      )

      setCarrelli(prev => prev.map(c =>
        String(c.insieme_carrello || "").trim() === nomeVecchio
          ? { ...c, insieme_carrello: nuovoNome }
          : c
      ))

      setSelected(prev =>
        prev && String(prev.insieme_carrello || "").trim() === nomeVecchio
          ? { ...prev, insieme_carrello: nuovoNome }
          : prev
      )

      if (ricercaInsieme === nomeVecchio) setRicercaInsieme(nuovoNome)
      setInsiemeDestinazione(nuovoNome)

      alert(`✅ Insieme rinominato in "${nuovoNome}"`)
    } finally {
      setSalvandoInsieme(false)
    }
  }

  function toggleCarrelloPerInsieme(c) {
    // I carrelli già assegnati a un insieme non possono essere selezionati di nuovo.
    if (String(c.insieme_carrello || "").trim()) return

    const id = String(c.id)
    setCarrelliSelezionatiInsieme(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function selezionaTuttiCarrelliVisibili() {
    const ids = carrelliFiltrati.map(c => String(c.id))
    setCarrelliSelezionatiInsieme(prev => Array.from(new Set([...prev, ...ids])))
  }

  function deselezionaCarrelliInsieme() {
    setCarrelliSelezionatiInsieme([])
  }

  async function spostaCarrelliNellInsieme() {
    if (!insiemeDestinazione) {
      alert("Seleziona prima l'insieme di destinazione")
      return
    }

    if (carrelliSelezionatiInsieme.length === 0) {
      alert("Seleziona almeno un carrello")
      return
    }

    setSalvandoInsieme(true)

    try {
      const { error } = await supabase
        .from("bolle_acquisto")
        .update({ insieme_carrello: insiemeDestinazione })
        .in("id", carrelliSelezionatiInsieme)

      if (error) {
        console.error(error)
        alert("Errore spostamento carrelli: " + error.message)
        return
      }

      setCarrelli(prev => prev.map(c =>
        carrelliSelezionatiInsieme.includes(String(c.id))
          ? { ...c, insieme_carrello: insiemeDestinazione }
          : c
      ))

      alert(`✅ ${carrelliSelezionatiInsieme.length} carrello/i spostati in ${insiemeDestinazione}`)
      setCarrelliSelezionatiInsieme([])
    } finally {
      setSalvandoInsieme(false)
    }
  }


  async function rimuoviCarrelloDaInsieme(c) {
    if (!c?.id) return
    const nomeCarrello = c.nome || c.nome_carrello || "Carrello"
    const gruppoAttuale = String(c.insieme_carrello || "").trim()
    if (!gruppoAttuale) return
    const conferma = window.confirm(`Vuoi togliere "${nomeCarrello}" dal gruppo "${gruppoAttuale}"?`)
    if (!conferma) return

    setSalvandoInsieme(true)
    try {
      const { error } = await supabase
        .from("bolle_acquisto")
        .update({ insieme_carrello: null })
        .eq("id", c.id)

      if (error) {
        console.error(error)
        alert("Errore rimozione dal gruppo: " + error.message)
        return
      }

      setCarrelli(prev => prev.map(x =>
        String(x.id) === String(c.id) ? { ...x, insieme_carrello: null } : x
      ))

      if (selected && String(selected.id) === String(c.id)) {
        setSelected(prev => prev ? { ...prev, insieme_carrello: null } : prev)
      }
    } finally {
      setSalvandoInsieme(false)
    }
  }

  function eseguiRicercaCarrelli() {
    if (!ricercaInsieme && !ricercaNomeCarrello.trim() && !ricercaPromemoria.trim()) {
      alert("Compila almeno un campo di ricerca")
      return
    }

    setRicercaEseguita(true)
    setSelected(null)
    setRighe([])
    setRigheSelezionate([])
    setDescrizioneRicerca("")
  }

  function azzeraRicercaCarrelli() {
    setRicercaInsieme("")
    setRicercaNomeCarrello("")
    setRicercaPromemoria("")
    setRicercaEseguita(false)
    setFocusSuggerimenti(null)
    setIndiceSuggerimentoNome(-1)
    setIndiceSuggerimentoFornitore(-1)
    setIndiceSuggerimentoPromemoria(-1)
    setRicercaVelocePreferiti("")
    setRicercaVelocePreferiti2("")
    setRisultatiPreferiti([])
    setPreferitiSelezionati([])
    setQuantitaPreferiti({})
    setSelected(null)
    setRighe([])
    setRigheSelezionate([])
    setDescrizioneRicerca("")
    setFiltro1("")
    setFiltro2("")
    setFiltro3("")
    setFiltro4("")

    setTimeout(() => ricercaNomeRef.current?.focus(), 50)
  }

  function idPreferito(a) {
    return String(a.id || a.codice || `${a.descrizione || ""}`)
  }

  function preferitoSelezionato(a) {
    return preferitiSelezionati.includes(idPreferito(a))
  }

  function togglePreferito(a) {
    const id = idPreferito(a)
    setPreferitiSelezionati(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      return [...prev, id]
    })
    setQuantitaPreferiti(prev => ({
      ...prev,
      [id]: prev[id] || 1
    }))
  }

  function aggiornaQuantitaPreferito(a, valore) {
    const id = idPreferito(a)
    setQuantitaPreferiti(prev => ({ ...prev, [id]: valore }))
  }

  async function inserisciPreferitiSelezionati() {
    if (inserendoPreferiti) return

    const interventoFinale = interventoIdDaUrl || interventoSelezionato
    if (!interventoFinale) {
      alert("Seleziona prima l'intervento in cui inserire i materiali")
      return
    }

    const scelti = risultatiPreferiti.filter(a => preferitiSelezionati.includes(idPreferito(a)))
    if (scelti.length === 0) {
      alert("Seleziona almeno un materiale")
      return
    }

    const carrelloContesto = selected?.id
      ? selected
      : carrelli.find(c =>
          String(c.nome || c.nome_carrello || "").trim().toLowerCase() === String(ricercaNomeCarrello || "").trim().toLowerCase() &&
          String(c.insieme_carrello || "").trim() === String(ricercaInsieme || "").trim()
        )

    const materiali = scelti.map(a => {
      const id = idPreferito(a)
      const quantita = Math.max(1, Number(quantitaPreferiti[id] || 1))
      const prezzo = Number(a.prezzo || 0)
      return {
        codice: a.codice || "",
        descrizione: a.descrizione || "",
        quantita,
        prezzo,
        totale: quantita * prezzo
      }
    })

    const giaPresenti = materiali.filter(m => materialeGiaPresente(m))
    let finali = materiali

    if (giaPresenti.length > 0) {
      const elenco = giaPresenti.slice(0, 8).map(m => `- ${m.codice || "Senza codice"} ${m.descrizione || ""}`).join("\n")
      const conferma = window.confirm(
        `⚠️ ${giaPresenti.length} materiale/i risultano già presenti nell'intervento.\n\n${elenco}\n\nOK = inserisci anche i duplicati\nANNULLA = inserisci solo quelli nuovi`
      )
      if (!conferma) finali = materiali.filter(m => !materialeGiaPresente(m))
    }

    if (finali.length === 0) {
      alert("Nessun materiale nuovo da inserire")
      return
    }

    setInserendoPreferiti(true)
    try {
      const { error } = await supabase
        .from("materiali_bollettino")
        .insert(finali.map(m => ({
          intervento_id: interventoFinale,
          codice: m.codice,
          descrizione: m.descrizione,
          quantita: m.quantita,
          prezzo: m.prezzo,
          totale: m.totale,
          carrello_id: carrelloContesto?.id || null
        })))

      if (error) {
        console.error(error)
        alert("Errore inserimento materiali nell'intervento: " + error.message)
        return
      }

      await aggiornaPreferiti(finali)

      if (carrelloContesto?.id) {
        await supabase.from("bolle_acquisto").update({ usata: true }).eq("id", carrelloContesto.id)
      }

      await caricaMaterialiIntervento(interventoFinale)
      setPreferitiSelezionati([])
      setQuantitaPreferiti({})
      alert(`✅ Inseriti ${finali.length} materiale/i nell'intervento`)
    } finally {
      setInserendoPreferiti(false)
    }
  }

  async function cercaNeiPreferiti(
    valore1 = ricercaVelocePreferiti,
    valore2 = ricercaVelocePreferiti2,
    scorriAiRisultati = true
  ) {
    const testo1 = String(valore1 || "").trim()
    const testo2 = String(valore2 || "").trim()

    if (!testo1 && !testo2) {
      setRisultatiPreferiti([])
      return
    }

    function corrispondeCriterio(articolo, criterio) {
      const originale = String(criterio || "").trim()
      if (!originale) return true

      const normale = normalizzaTesto(originale)
      const compatto = originale.toLowerCase().replace(/[^a-z0-9]/g, "")
      const codiceCompatto = String(articolo.codice || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
      const testoCompleto = normalizzaTesto(
        `${articolo.codice || ""} ${articolo.descrizione || ""}`
      )
      const parole = normale.split(" ").map(p => p.trim()).filter(Boolean)

      if (compatto && codiceCompatto.includes(compatto)) return true
      if (normale && testoCompleto.includes(normale)) return true
      return parole.length > 0 && parole.every(p => testoCompleto.includes(p))
    }

    setCercandoPreferiti(true)
    setRisultatiPreferiti([])

    try {
      // Se abbiamo scelto Nome carrello + Fornitore (o abbiamo un carrello aperto),
      // limitiamo i Preferiti ai materiali realmente presenti in quel/i carrello/i.
      let idsCarrelliContesto = []

      if (ricercaNomeCarrello.trim() && ricercaInsieme) {
        const nomeScelto = ricercaNomeCarrello.trim().toLowerCase()
        idsCarrelliContesto = carrelli
          .filter(c =>
            String(c.nome || c.nome_carrello || "").trim().toLowerCase() === nomeScelto &&
            String(c.insieme_carrello || "").trim() === ricercaInsieme
          )
          .map(c => c.id)
      } else if (selected?.id) {
        idsCarrelliContesto = [selected.id]
      }

      let codiciConsentiti = null
      let descrizioniConsentite = null
      let ordineCarrello = null

      if (idsCarrelliContesto.length > 0) {
        const { data: righeContesto, error: righeContestoError } = await supabase
          .from("bolle_righe")
          .select("bolla_id, codice, descrizione, ordine, id")
          .in("bolla_id", idsCarrelliContesto)
          .order("ordine", { ascending: true })
          .order("id", { ascending: true })

        if (righeContestoError) {
          console.error(righeContestoError)
          alert("Errore controllo materiali del carrello: " + righeContestoError.message)
          return
        }

        codiciConsentiti = new Set(
          (righeContesto || [])
            .map(r => String(r.codice || "").trim().toLowerCase())
            .filter(Boolean)
        )
        descrizioniConsentite = new Set(
          (righeContesto || [])
            .map(r => normalizzaTesto(r.descrizione || ""))
            .filter(Boolean)
        )

        // Mappa l'ordine salvato nel carrello. Se per qualche motivo lo stesso
        // articolo compare più volte, manteniamo la posizione più alta (numero minore).
        ordineCarrello = new Map()
        ;(righeContesto || []).forEach((r, index) => {
          const codice = String(r.codice || "").trim().toLowerCase()
          const descrizione = normalizzaTesto(r.descrizione || "")
          const posizione = Number(r.ordine || 0) > 0 ? Number(r.ordine) : index + 1
          const chiavi = []
          if (codice) chiavi.push(`c:${codice}`)
          if (descrizione) chiavi.push(`d:${descrizione}`)

          chiavi.forEach(chiave => {
            const precedente = ordineCarrello.get(chiave)
            if (precedente == null || posizione < precedente) {
              ordineCarrello.set(chiave, posizione)
            }
          })
        })
      }

      const tutti = []
      const STEP = 1000
      let start = 0
      let continua = true

      while (continua) {
        const { data, error } = await supabase
          .from("articoli_preferiti")
          .select("id, codice, descrizione, prezzo, volte_usato, quantita_totale, ultimo_utilizzo")
          .order("volte_usato", { ascending: false })
          .range(start, start + STEP - 1)

        if (error) {
          console.error(error)
          alert("Errore ricerca preferiti: " + error.message)
          return
        }

        const blocco = data || []
        tutti.push(...blocco)

        if (blocco.length < STEP) continua = false
        else start += STEP
      }

      const filtrati = tutti.filter(a => {
        if (codiciConsentiti && descrizioniConsentite) {
          const codice = String(a.codice || "").trim().toLowerCase()
          const descrizione = normalizzaTesto(a.descrizione || "")
          const appartieneAlCarrello =
            (codice && codiciConsentiti.has(codice)) ||
            (!codice && descrizione && descrizioniConsentite.has(descrizione))

          if (!appartieneAlCarrello) return false
        }

        return corrispondeCriterio(a, testo1) && corrispondeCriterio(a, testo2)
      })

      filtrati.sort((a, b) => {
        // Se siamo nel contesto di un carrello, usa SEMPRE l'ordine salvato
        // in bolle_righe. In questo modo la lista verde ha la stessa disposizione
        // della schermata "Apri materiali".
        if (ordineCarrello) {
          const codiceA = String(a.codice || "").trim().toLowerCase()
          const codiceB = String(b.codice || "").trim().toLowerCase()
          const descrizioneA = normalizzaTesto(a.descrizione || "")
          const descrizioneB = normalizzaTesto(b.descrizione || "")

          const ordineA =
            (codiceA && ordineCarrello.get(`c:${codiceA}`)) ||
            (descrizioneA && ordineCarrello.get(`d:${descrizioneA}`)) ||
            Number.MAX_SAFE_INTEGER
          const ordineB =
            (codiceB && ordineCarrello.get(`c:${codiceB}`)) ||
            (descrizioneB && ordineCarrello.get(`d:${descrizioneB}`)) ||
            Number.MAX_SAFE_INTEGER

          if (ordineA !== ordineB) return ordineA - ordineB
        }

        // Fuori dal contesto di un carrello manteniamo l'ordinamento storico
        // dei Preferiti per frequenza di utilizzo.
        const usoA = Number(a.volte_usato || 0)
        const usoB = Number(b.volte_usato || 0)
        if (usoA !== usoB) return usoB - usoA
        return String(a.descrizione || "").localeCompare(String(b.descrizione || ""), "it")
      })

      setRisultatiPreferiti(filtrati)

      if (scorriAiRisultati) {
        setTimeout(() => {
          risultatiPreferitiRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start"
          })
        }, 100)
      }
    } finally {
      setCercandoPreferiti(false)
    }
  }

  async function scegliSuggerimentoNome(valore, mantieniFornitore = false) {
    const nomeScelto = String(valore || "").trim()
    const nomeSceltoLower = nomeScelto.toLowerCase()

    const carrelliCompatibili = carrelli.filter(c =>
      String(c.nome || c.nome_carrello || "").trim().toLowerCase() === nomeSceltoLower
    )

    const fornitoriCompatibili = Array.from(new Set(
      carrelliCompatibili
        .map(c => String(c.insieme_carrello || "").trim())
        .filter(Boolean)
    ))

    setRicercaNomeCarrello(nomeScelto)
    setFocusSuggerimenti(null)
    setIndiceSuggerimentoNome(-1)
    setRicercaEseguita(true)
    setSelected(null)
    setRighe([])
    setRigheSelezionate([])
    setDescrizioneRicerca("")

    // Se il materiale/carrello esiste presso un solo fornitore,
    // saltiamo automaticamente la scelta del fornitore.
    if (!mantieniFornitore && fornitoriCompatibili.length === 1) {
      const unicoFornitore = fornitoriCompatibili[0]
      setRicercaInsieme(unicoFornitore)

      const carrelliUnicoFornitore = carrelliCompatibili.filter(c =>
        String(c.insieme_carrello || "").trim() === unicoFornitore
      )

      // Se c'è un solo carrello corrispondente, apriamo subito i materiali.
      if (carrelliUnicoFornitore.length === 1) {
        await selezionaCarrello(carrelliUnicoFornitore[0])
      }
      return
    }

    if (!mantieniFornitore) setRicercaInsieme("")
  }

  async function scegliSuggerimentoFornitore(valore) {
    const fornitoreScelto = String(valore || "").trim()
    setRicercaInsieme(fornitoreScelto)
    setFocusSuggerimenti(null)
    setIndiceSuggerimentoFornitore(-1)
    setRicercaEseguita(true)
    setSelected(null)
    setRighe([])
    setRigheSelezionate([])
    setDescrizioneRicerca("")

    const testoNome = ricercaNomeCarrello.trim().toLowerCase()
    if (testoNome) {
      const compatibili = carrelli.filter(c =>
        String(c.insieme_carrello || "").trim().toLowerCase() === fornitoreScelto.toLowerCase() &&
        String(c.nome || c.nome_carrello || "").trim().toLowerCase().includes(testoNome)
      )

      if (compatibili.length === 1) {
        const c = compatibili[0]
        setRicercaNomeCarrello(String(c.nome || c.nome_carrello || "").trim())
        await selezionaCarrello(c)
      }
    }
  }

  function scegliSuggerimentoPromemoria(valore) {
    setRicercaPromemoria(valore)
    setFocusSuggerimenti(null)
    setIndiceSuggerimentoPromemoria(-1)
    setRicercaEseguita(true)
  }

  async function caricaInterventi() {
    const { data, error } = await supabase
      .from("interventi")
      .select("id, data, descrizione, clienti(nome)")
      .or("archiviato.is.null,archiviato.eq.false")
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento interventi: " + error.message)
      return
    }

    setInterventi(data || [])

    if (interventoIdDaUrl) {
      const trovato = (data || []).find(i => String(i.id) === String(interventoIdDaUrl))
      setInterventoCorrente(trovato || null)
      setInterventoSelezionato(interventoIdDaUrl)
    }
  }

  async function caricaMaterialiIntervento(interventoId) {
    if (!interventoId) {
      setMaterialiIntervento([])
      return
    }

    const { data, error } = await supabase
      .from("materiali_bollettino")
      .select("id, codice, descrizione, quantita")
      .eq("intervento_id", interventoId)

    if (error) {
      console.error(error)
      alert("Errore controllo materiali già presenti: " + error.message)
      return
    }

    setMaterialiIntervento(data || [])
  }

  function chiediCodiceOperazione() {
    const codice = window.prompt("Inserisci codice per continuare")
    if (codice === null) return false
    if (codice !== "1234") {
      alert("Codice errato")
      return false
    }
    return true
  }

  async function modificaNomeCarrelloSelezionato() {
    if (!selected?.id) {
      alert("Seleziona prima un carrello")
      return
    }

    if (!chiediCodiceOperazione()) return

    const nomeAttuale = selected.nome_carrello || selected.nome || ""
    const nuovoNome = window.prompt("Nuovo nome carrello", nomeAttuale)
    if (nuovoNome === null) return

    const nomePulito = nuovoNome.trim()
    if (!nomePulito) {
      alert("Il nome non può essere vuoto")
      return
    }

    const { error } = await supabase
      .from("bolle_acquisto")
      .update({
        nome: nomePulito,
        nome_carrello: nomePulito
      })
      .eq("id", selected.id)

    if (error) {
      console.error(error)
      alert("Errore modifica nome carrello: " + error.message)
      return
    }

    alert("✅ Nome carrello modificato")

    setSelected({
      ...selected,
      nome: nomePulito,
      nome_carrello: nomePulito
    })

    setCarrelli(carrelli.map(c =>
      c.id === selected.id
        ? { ...c, nome: nomePulito, nome_carrello: nomePulito }
        : c
    ))
  }

  async function eliminaCarrelloSelezionato() {
    if (!selected?.id) {
      alert("Seleziona prima un carrello")
      return
    }

    if (!chiediCodiceOperazione()) return

    const nomeCarrello = selected.nome || selected.nome_carrello || "Carrello"
    const conferma = window.confirm(
      `Vuoi eliminare il carrello "${nomeCarrello}" e tutte le sue righe?`
    )

    if (!conferma) return

    const { error: righeError } = await supabase
      .from("bolle_righe")
      .delete()
      .eq("bolla_id", selected.id)

    if (righeError) {
      console.error(righeError)
      alert("Errore eliminazione righe: " + righeError.message)
      return
    }

    const { error: carrelloError } = await supabase
      .from("bolle_acquisto")
      .delete()
      .eq("id", selected.id)

    if (carrelloError) {
      console.error(carrelloError)
      alert("Errore eliminazione carrello: " + carrelloError.message)
      return
    }

    alert("✅ Carrello eliminato")

    setSelected(null)
    setRighe([])
    setRigheSelezionate([])
    setDescrizioneRicerca("")
    caricaCarrelli()
  }

  async function selezionaCarrello(c) {
    if (selected?.id === c.id) {
      setSelected(null)
      setRighe([])
      setRigheSelezionate([])
      setDescrizioneRicerca("")
      return
    }

    setSelected(c)
    setDescrizioneRicerca(c.descrizione_ricerca || "")
    setFiltro1("")
    setFiltro2("")
    setFiltro3("")
    setFiltro4("")
    setRigheSelezionate([])

    if (interventoIdDaUrl) {
      setInterventoSelezionato(interventoIdDaUrl)
    }

    const { data, error } = await supabase
      .from("bolle_righe")
      .select("*")
      .eq("bolla_id", c.id)
      .order("ordine", { ascending: true })
      .order("id", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento righe carrello: " + error.message)
      return
    }

    setRighe(data || [])

    setTimeout(() => {
      risultatiMaterialiRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    }, 200)
  }

  function leggiNumero(valore) {
    if (valore === null || valore === undefined) return 0

    let pulito = String(valore)
      .replace("€", "")
      .replaceAll('"', "")
      .replaceAll("'", "")
      .replace(/\s/g, "")
      .trim()

    if (!pulito) return 0

    if (pulito.includes(",") && pulito.includes(".")) {
      pulito = pulito.replace(/\./g, "").replace(",", ".")
    } else if (pulito.includes(",")) {
      pulito = pulito.replace(",", ".")
    }

    const numero = Number(pulito)
    return isNaN(numero) ? 0 : numero
  }

  function formatPrezzo(valore) {
    const n = Number(valore || 0)
    return n.toLocaleString("it-IT", {
      style: "currency",
      currency: "EUR"
    })
  }

  function sbloccaPrezzi() {
    if (mostraPrezzi) {
      setMostraPrezzi(false)
      return
    }

    const codice = window.prompt("Inserisci codice")

    if (codice === "1234") {
      setMostraPrezzi(true)
    } else if (codice !== null) {
      alert("Codice errato")
    }
  }

  function normalizzaTesto(testo) {
    return String(testo || "")
      .toLowerCase()
      .replaceAll(",", " ")
      .replaceAll(".", " ")
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replaceAll("/", " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  function resetCreaCarrelloDaListino() {
    setNomeNuovoCarrello("")
    setListinoFiltro1("")
    setListinoFiltro2("")
    setListinoFiltro3("")
    setListinoFiltro4("")
    setRisultatiListino([])
    setListinoSelezionati([])
    setQuantitaListino({})
    setRigheNuovoCarrello([])
  }

  function filtriListinoAttivi() {
    return [listinoFiltro1, listinoFiltro2, listinoFiltro3, listinoFiltro4]
      .map(normalizzaTesto)
      .filter(Boolean)
  }

  async function cercaArticoliListino() {
    const filtri = filtriListinoAttivi()

    if (filtri.length === 0) {
      alert("Inserisci almeno una parola/codice per cercare nel listino")
      return
    }

    setCercandoListino(true)

    try {
      const primoFiltro = filtri[0].replaceAll("%", "")

      const tuttiRisultati = []
      const STEP_LISTINO = 1000
      let start = 0
      let continua = true

      while (continua) {
        const { data, error } = await supabase
          .from("articoli_prezzi")
          .select("codice, descrizione, ean, produttore, unita_misura, prezzo, prezzo_lordo, prezzo_netto")
          .or(`codice.ilike.%${primoFiltro}%,descrizione.ilike.%${primoFiltro}%,ean.ilike.%${primoFiltro}%,produttore.ilike.%${primoFiltro}%`)
          .order("descrizione", { ascending: true })
          .range(start, start + STEP_LISTINO - 1)

        if (error) {
          console.error(error)
          alert("Errore ricerca listino: " + error.message)
          return
        }

        const blocco = data || []
        tuttiRisultati.push(...blocco)

        if (blocco.length < STEP_LISTINO) {
          continua = false
        } else {
          start += STEP_LISTINO
          await new Promise(res => setTimeout(res, 5))
        }
      }

      const filtrati = tuttiRisultati.filter(a => {
        const testo = normalizzaTesto(`
          ${a.codice || ""}
          ${a.descrizione || ""}
          ${a.ean || ""}
          ${a.produttore || ""}
        `)

        return filtri.every(f => testo.includes(f))
      })

      setRisultatiListino(filtrati)
      setListinoSelezionati([])
      setQuantitaListino({})
    } finally {
      setCercandoListino(false)
    }
  }

  function idArticoloListino(a) {
    return String(a.codice || a.ean || a.descrizione || "")
  }

  function articoloListinoSelezionato(a) {
    return listinoSelezionati.includes(idArticoloListino(a))
  }

  function toggleArticoloListino(a) {
    const id = idArticoloListino(a)
    if (!id) return

    if (listinoSelezionati.includes(id)) {
      setListinoSelezionati(prev => prev.filter(x => x !== id))
    } else {
      setListinoSelezionati(prev => [...prev, id])
      setQuantitaListino(prev => ({
        ...prev,
        [id]: prev[id] || 1
      }))
    }
  }

  function aggiornaQuantitaArticoloListino(a, valore) {
    const id = idArticoloListino(a)
    setQuantitaListino(prev => ({
      ...prev,
      [id]: valore
    }))
  }

  function selezionaTuttiRisultatiListino() {
    const ids = risultatiListino.map(a => idArticoloListino(a)).filter(Boolean)
    setListinoSelezionati(Array.from(new Set(ids)))

    setQuantitaListino(prev => {
      const nuovo = { ...prev }
      ids.forEach(id => {
        if (!nuovo[id]) nuovo[id] = 1
      })
      return nuovo
    })
  }

  function selezionaTutteSopraUltimoListino() {
    if (risultatiListino.length === 0) return

    let ultimoIndice = -1

    risultatiListino.forEach((a, index) => {
      if (articoloListinoSelezionato(a)) {
        ultimoIndice = index
      }
    })

    if (ultimoIndice < 0) {
      alert("Seleziona prima l'ultima riga fino a cui vuoi arrivare")
      return
    }

    const articoliDaSelezionare = risultatiListino.slice(0, ultimoIndice + 1)
    const ids = articoliDaSelezionare.map(a => idArticoloListino(a)).filter(Boolean)

    setListinoSelezionati(prev => Array.from(new Set([...prev, ...ids])))

    setQuantitaListino(prev => {
      const nuovo = { ...prev }
      ids.forEach(id => {
        if (!nuovo[id]) nuovo[id] = 1
      })
      return nuovo
    })
  }

  function deselezionaTuttiRisultatiListino() {
    setListinoSelezionati([])
  }

  function aggiungiArticoloAlNuovoCarrello(a, quantitaDaAggiungere = 1, chiediConferma = true) {
    const codice = String(a.codice || "").trim()
    const quantita = leggiNumero(quantitaDaAggiungere) || 1

    const giaPresente = righeNuovoCarrello.find(r =>
      codice && String(r.codice || "").trim() === codice
    )

    if (giaPresente) {
      if (chiediConferma) {
        const conferma = window.confirm(
          `L'articolo ${codice} è già nel carrello. Vuoi aumentare la quantità di ${quantita}?`
        )

        if (!conferma) return
      }

      setRigheNuovoCarrello(prev => prev.map(r => {
        if (String(r.codice || "").trim() !== codice) return r
        const nuovaQuantita = Number(r.quantita || 0) + quantita
        return {
          ...r,
          quantita: nuovaQuantita,
          totale: nuovaQuantita * Number(r.prezzo || 0)
        }
      }))
      return
    }

    const prezzo = Number(a.prezzo_netto || a.prezzo || a.prezzo_lordo || 0)

    setRigheNuovoCarrello(prev => [
      ...prev,
      {
        temp_id: `${Date.now()}_${Math.random()}`,
        codice: codice,
        descrizione: a.descrizione || "",
        ean: a.ean || "",
        produttore: a.produttore || "",
        unita_misura: a.unita_misura || "PZ",
        quantita,
        prezzo,
        totale: quantita * prezzo
      }
    ])
  }

  function aggiungiSelezionatiAlNuovoCarrello() {
    const selezionati = risultatiListino.filter(a => articoloListinoSelezionato(a))

    if (selezionati.length === 0) {
      alert("Seleziona almeno un materiale dal listino")
      return
    }

    selezionati.forEach(a => {
      const id = idArticoloListino(a)
      aggiungiArticoloAlNuovoCarrello(a, quantitaListino[id] || 1, false)
    })

    setListinoSelezionati([])
    alert(`✅ Aggiunti ${selezionati.length} materiali al nuovo carrello`)
  }

  function aggiornaRigaNuovoCarrello(tempId, campo, valore) {
    setRigheNuovoCarrello(prev => prev.map(r => {
      if (r.temp_id !== tempId) return r

      const aggiornata = {
        ...r,
        [campo]: valore
      }

      if (campo === "quantita" || campo === "prezzo") {
        aggiornata.totale = Number(
          campo === "quantita" ? valore : aggiornata.quantita
        ) * Number(
          campo === "prezzo" ? valore : aggiornata.prezzo
        )
      }

      return aggiornata
    }))
  }

  function eliminaRigaNuovoCarrello(tempId) {
    setRigheNuovoCarrello(prev => prev.filter(r => r.temp_id !== tempId))
  }

  async function salvaCarrelloDaListino() {
    if (salvandoNuovoCarrello) return

    const nomePulito = nomeNuovoCarrello.trim()

    if (!nomePulito) {
      alert("Inserisci il nome del carrello")
      return
    }

    const materiali = righeNuovoCarrello
      .filter(r => String(r.codice || "").trim() || String(r.descrizione || "").trim())
      .map(r => {
        const quantita = leggiNumero(r.quantita) || 1
        const prezzo = leggiNumero(r.prezzo)

        return {
          codice: String(r.codice || "").trim(),
          descrizione: String(r.descrizione || "").trim(),
          quantita,
          prezzo,
          totale: quantita * prezzo
        }
      })

    if (materiali.length === 0) {
      alert("Aggiungi almeno un materiale al carrello")
      return
    }

    const { data: giaPresente, error: controlloError } = await supabase
      .from("bolle_acquisto")
      .select("id")
      .eq("tipo", "carrello")
      .eq("nome_carrello", nomePulito)
      .maybeSingle()

    if (controlloError) {
      console.error(controlloError)
      alert("Errore controllo carrello esistente: " + controlloError.message)
      return
    }

    if (giaPresente?.id) {
      const conferma = window.confirm(
        "Esiste già un carrello con questo nome. Vuoi crearne comunque un altro?"
      )
      if (!conferma) return
    }

    setSalvandoNuovoCarrello(true)

    try {
      const { data: carrello, error } = await supabase
        .from("bolle_acquisto")
        .insert({
          nome: nomePulito,
          nome_carrello: nomePulito,
          data: new Date().toISOString(),
          tipo: "carrello",
          usata: false,
          descrizione_ricerca: filtriListinoAttivi().join(" ")
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        alert("Errore creazione carrello: " + error.message)
        return
      }

      const { error: righeError } = await supabase
        .from("bolle_righe")
        .insert(materiali.map((m, index) => ({
          bolla_id: carrello.id,
          ordine: index + 1,
          codice: m.codice,
          descrizione: m.descrizione,
          quantita: m.quantita,
          prezzo: m.prezzo,
          totale: m.totale
        })))

      if (righeError) {
        console.error(righeError)
        alert("Errore inserimento righe carrello: " + righeError.message)
        return
      }

      await aggiornaPreferiti(materiali)

      alert(`✅ Carrello creato da listino\nRighe: ${materiali.length}`)

      resetCreaCarrelloDaListino()
      setMostraCreaDaListino(false)
      await caricaCarrelli()
      await selezionaCarrello(carrello)
    } finally {
      setSalvandoNuovoCarrello(false)
    }
  }

  function trovaPrezzoDaColonne(colonne) {
    const indiciPossibili = [12, 11, 13, 14, 15, 16, 18, 19, 20, 21, 22]

    for (const indice of indiciPossibili) {
      const valore = leggiNumero(colonne[indice])
      if (valore > 0) return valore
    }

    return 0
  }

  function idRigaCarrello(r) {
    return String(
      r.id ||
      `${r.bolla_id || ""}_${r.codice || ""}_${r.descrizione || ""}_${r.quantita || ""}`
    )
  }

  async function cambiaPosizioneRigaCarrello(r, valorePosizione) {
    if (!r?.id || !selected?.id) return

    const posizioneRichiesta = Math.max(1, Math.min(righe.length, parseInt(valorePosizione, 10) || 1))
    const indiceAttuale = righe.findIndex(x => String(x.id) === String(r.id))
    if (indiceAttuale < 0) return

    const lista = [...righe]
    const [rigaDaSpostare] = lista.splice(indiceAttuale, 1)
    lista.splice(posizioneRichiesta - 1, 0, rigaDaSpostare)

    const listaRiordinata = lista.map((x, index) => ({
      ...x,
      ordine: index + 1
    }))

    // Aggiorno subito la schermata: la posizione scelta si vede immediatamente.
    setRighe(listaRiordinata)

    const risultati = await Promise.all(
      listaRiordinata.map(x =>
        supabase
          .from("bolle_righe")
          .update({ ordine: x.ordine })
          .eq("id", x.id)
      )
    )

    const errore = risultati.find(x => x.error)?.error
    if (errore) {
      console.error(errore)
      alert("Errore salvataggio posizione materiale: " + errore.message)

      const { data: righeAggiornate } = await supabase
        .from("bolle_righe")
        .select("*")
        .eq("bolla_id", selected.id)
        .order("ordine", { ascending: true })
        .order("id", { ascending: true })

      if (righeAggiornate) setRighe(righeAggiornate)
    }
  }

  function aggiornaCampoRiga(id, campo, valore) {
    setRighe(prev => prev.map(r =>
      String(idRigaCarrello(r)) === String(id)
        ? {
            ...r,
            [campo]: valore,
            ...(campo === "quantita" || campo === "prezzo"
              ? {
                  totale:
                    campo === "quantita"
                      ? Number(valore || 0) * Number(r.prezzo || 0)
                      : Number(r.quantita || 0) * Number(valore || 0)
                }
              : {})
          }
        : r
    ))
  }

  async function salvaRigaCarrello(r) {
    if (!r?.id) {
      alert("Questa riga non ha ID, non posso salvarla")
      return
    }

    if (!chiediCodiceOperazione()) return

    const quantita = leggiNumero(r.quantita)
    const prezzo = leggiNumero(r.prezzo)
    const totale = quantita * prezzo

    if (!String(r.codice || "").trim() && !String(r.descrizione || "").trim()) {
      alert("Codice e descrizione non possono essere entrambi vuoti")
      return
    }

    setSalvandoRigaId(r.id)

    try {
      const { error } = await supabase
        .from("bolle_righe")
        .update({
          codice: String(r.codice || "").trim(),
          descrizione: String(r.descrizione || "").trim(),
          quantita,
          prezzo,
          totale
        })
        .eq("id", r.id)

      if (error) {
        console.error(error)
        alert("Errore salvataggio riga: " + error.message)
        return
      }

      setRighe(prev => prev.map(x =>
        x.id === r.id
          ? {
              ...x,
              codice: String(r.codice || "").trim(),
              descrizione: String(r.descrizione || "").trim(),
              quantita,
              prezzo,
              totale
            }
          : x
      ))

      alert("✅ Riga carrello modificata")
    } finally {
      setSalvandoRigaId(null)
    }
  }

  async function eliminaRigaCarrello(r) {
    if (!r?.id) {
      alert("Questa riga non ha ID, non posso eliminarla")
      return
    }

    if (!chiediCodiceOperazione()) return

    const conferma = window.confirm(
      `Vuoi eliminare questa riga?\n\n${r.codice || "Senza codice"} ${r.descrizione || ""}`
    )

    if (!conferma) return

    const { error } = await supabase
      .from("bolle_righe")
      .delete()
      .eq("id", r.id)

    if (error) {
      console.error(error)
      alert("Errore eliminazione riga: " + error.message)
      return
    }

    setRighe(prev => prev.filter(x => x.id !== r.id))
    setRigheSelezionate(prev => prev.filter(x => x !== idRigaCarrello(r)))

    alert("✅ Riga eliminata")
  }

  async function aggiungiRigaVuotaCarrello() {
    if (!selected?.id) {
      alert("Seleziona prima un carrello")
      return
    }

    if (!chiediCodiceOperazione()) return

    const { data, error } = await supabase
      .from("bolle_righe")
      .insert({
        bolla_id: selected.id,
        ordine: righe.reduce((max, x) => Math.max(max, Number(x.ordine || 0)), 0) + 1,
        codice: "",
        descrizione: "NUOVO MATERIALE",
        quantita: 1,
        prezzo: 0,
        totale: 0
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert("Errore aggiunta riga: " + error.message)
      return
    }

    setRighe(prev => [...prev, data])
    alert("✅ Riga aggiunta")
  }

  function chiaveMateriale(r) {
    return `${String(r.codice || "").trim().toLowerCase()}_${String(r.descrizione || "").trim().toLowerCase()}`
  }

  function materialeGiaPresente(r) {
    const codice = String(r.codice || "").trim().toLowerCase()
    const key = chiaveMateriale(r)

    return materialiIntervento.some(m => {
      const codiceM = String(m.codice || "").trim().toLowerCase()
      const descrizioneM = String(m.descrizione || "").trim().toLowerCase()
      const keyM = `${codiceM}_${descrizioneM}`

      if (codice && codiceM && codice === codiceM) return true
      return key === keyM
    })
  }

  function rigaSelezionata(r) {
    return righeSelezionate.includes(idRigaCarrello(r))
  }

  function toggleRigaSelezionata(r) {
    const id = idRigaCarrello(r)

    if (righeSelezionate.includes(id)) {
      setRigheSelezionate(righeSelezionate.filter(x => x !== id))
    } else {
      setRigheSelezionate([...righeSelezionate, id])
    }
  }

  function selezionaTutteFiltrate() {
    const idsFiltrate = righeFiltrate.map(r => idRigaCarrello(r))
    const unite = Array.from(new Set([...righeSelezionate, ...idsFiltrate]))
    setRigheSelezionate(unite)
  }

  function deselezionaTutte() {
    setRigheSelezionate([])
  }

  function applicaEsempioNeiFiltri() {
    const parole = normalizzaTesto(descrizioneRicerca)
      .split(" ")
      .filter(Boolean)
      .slice(0, 4)

    setFiltro1(parole[0] || "")
    setFiltro2(parole[1] || "")
    setFiltro3(parole[2] || "")
    setFiltro4(parole[3] || "")

    setTimeout(() => {
      risultatiMaterialiRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    }, 100)
  }

  async function salvaDescrizioneRicerca() {
    if (!selected?.id) return

    const { error } = await supabase
      .from("bolle_acquisto")
      .update({
        descrizione_ricerca: descrizioneRicerca
      })
      .eq("id", selected.id)

    if (error) {
      console.error(error)
      alert("Errore salvataggio promemoria ricerca: " + error.message)
      return
    }

    alert("✅ Promemoria ricerca salvato")

    setSelected({
      ...selected,
      descrizione_ricerca: descrizioneRicerca
    })

    setCarrelli(carrelli.map(c =>
      c.id === selected.id
        ? { ...c, descrizione_ricerca: descrizioneRicerca }
        : c
    ))
  }

  async function aggiornaPreferiti(materiali) {
    const validi = materiali
      .filter(m => m.codice || m.descrizione)
      .map(m => ({
        codice: String(m.codice || "").trim(),
        descrizione: String(m.descrizione || "").trim(),
        quantita: Number(m.quantita || 0),
        prezzo: Number(m.prezzo || 0)
      }))

    if (validi.length === 0) return

    const raggruppati = {}

    for (const m of validi) {
      const key = m.codice || m.descrizione

      if (!raggruppati[key]) {
        raggruppati[key] = {
          codice: m.codice,
          descrizione: m.descrizione,
          quantita: 0,
          prezzo: 0
        }
      }

      raggruppati[key].quantita += Number(m.quantita || 0)

      if (Number(m.prezzo || 0) > Number(raggruppati[key].prezzo || 0)) {
        raggruppati[key].prezzo = Number(m.prezzo || 0)
      }
    }

    const lista = Object.values(raggruppati)
    const codici = lista.map(m => m.codice).filter(Boolean)

    if (codici.length === 0) return

    const { data: esistenti, error: selectError } = await supabase
      .from("articoli_preferiti")
      .select("id, codice, descrizione, prezzo, volte_usato, quantita_totale")
      .in("codice", codici)

    if (selectError) {
      console.error(selectError)
      alert("Errore controllo preferiti: " + selectError.message)
      return
    }

    const mappaEsistenti = new Map((esistenti || []).map(e => [String(e.codice), e]))

    for (const m of lista) {
      const esistente = m.codice ? mappaEsistenti.get(String(m.codice)) : null

      if (!esistente) {
        const { error: insertError } = await supabase
          .from("articoli_preferiti")
          .insert({
            codice: m.codice || null,
            descrizione: m.descrizione || null,
            prezzo: Number(m.prezzo || 0),
            volte_usato: 1,
            quantita_totale: Number(m.quantita || 0),
            ultimo_utilizzo: new Date().toISOString()
          })

        if (insertError) {
          console.error(insertError)
          alert("Errore inserimento preferito: " + insertError.message)
          return
        }
      } else {
        const prezzoVecchio = Number(esistente.prezzo || 0)
        const prezzoNuovo = Number(m.prezzo || 0)
        const prezzoDaSalvare = prezzoNuovo > prezzoVecchio ? prezzoNuovo : prezzoVecchio

        const { error: updateError } = await supabase
          .from("articoli_preferiti")
          .update({
            descrizione: esistente.descrizione || m.descrizione || null,
            prezzo: prezzoDaSalvare,
            volte_usato: Number(esistente.volte_usato || 0) + 1,
            quantita_totale: Number(esistente.quantita_totale || 0) + Number(m.quantita || 0),
            ultimo_utilizzo: new Date().toISOString()
          })
          .eq("id", esistente.id)

        if (updateError) {
          console.error(updateError)
          alert("Errore aggiornamento preferito: " + updateError.message)
          return
        }
      }
    }
  }

  async function inserisciInIntervento(soloSelezionate = false) {
    if (importando) return

    const interventoFinale = interventoIdDaUrl || interventoSelezionato

    if (!interventoFinale) {
      alert("Seleziona intervento")
      return
    }

    if (!selected) {
      alert("Seleziona carrello")
      return
    }

    if (!righe.length) {
      alert("Questo carrello non ha righe")
      return
    }

    const righeDaUsare = soloSelezionate
      ? righeFiltrate.filter(r => righeSelezionate.includes(idRigaCarrello(r)))
      : righeFiltrate

    if (soloSelezionate && righeDaUsare.length === 0) {
      alert("Seleziona almeno una riga del carrello")
      return
    }

    if (!soloSelezionate && righeDaUsare.length === 0) {
      alert("Non ci sono righe filtrate da importare")
      return
    }

    const righeValide = righeDaUsare.filter(r => r.codice || r.descrizione)
    const righeGiaPresenti = righeValide.filter(r => materialeGiaPresente(r))
    const righeNuove = righeValide.filter(r => !materialeGiaPresente(r))

    let righeFinali = righeValide

    if (righeGiaPresenti.length > 0) {
      const elenco = righeGiaPresenti
        .slice(0, 8)
        .map(r => `- ${r.codice || "Senza codice"} ${r.descrizione || ""}`)
        .join("\n")

      const altri = righeGiaPresenti.length > 8
        ? `\n...e altri ${righeGiaPresenti.length - 8} materiali`
        : ""

      const conferma = window.confirm(
        `⚠️ Attenzione: ${righeGiaPresenti.length} materiale/i risultano già presenti in questo intervento.\n\n${elenco}${altri}\n\nVuoi inserirli di nuovo?\n\nOK = inserisci anche i duplicati\nANNULLA = inserisci solo quelli nuovi`
      )

      if (!conferma) {
        righeFinali = righeNuove
      }
    }

    if (righeFinali.length === 0) {
      alert("Nessun materiale nuovo da inserire")
      return
    }

    setImportando(true)

    try {
      const materialiDaInserire = righeFinali.map(r => ({
        intervento_id: interventoFinale,
        codice: r.codice || "",
        descrizione: r.descrizione || "",
        quantita: Number(r.quantita || 1),
        prezzo: Number(r.prezzo || 0),
        totale: Number(r.quantita || 1) * Number(r.prezzo || 0),
        carrello_id: selected.id
      }))

      const { error: insertError } = await supabase
        .from("materiali_bollettino")
        .insert(materialiDaInserire)

      if (insertError) {
        console.error(insertError)
        alert("Errore inserimento materiali intervento: " + insertError.message)
        return
      }

      await aggiornaPreferiti(righeFinali)

      const { error: updateError } = await supabase
        .from("bolle_acquisto")
        .update({ usata: true })
        .eq("id", selected.id)

      if (updateError) {
        console.error(updateError)
        alert("Materiali inseriti, ma errore nel segnare il carrello come usato: " + updateError.message)
        return
      }

      alert(
        soloSelezionate
          ? "✅ Materiali selezionati inseriti nell’intervento"
          : "✅ Materiali filtrati inseriti nell’intervento"
      )

      await caricaMaterialiIntervento(interventoFinale)

      azzeraRicercaCarrelli()
      caricaCarrelli()
    } finally {
      setImportando(false)
    }
  }

  async function importaCSV(file) {
    if (caricandoCSV) return
    setCaricandoCSV(true)

    try {
      const text = await file.text()
      const righeFile = text.split(/\r?\n/).filter(r => r.trim() !== "")

      if (righeFile.length < 2) {
        alert("File vuoto o non valido")
        return
      }

      const materiali = []
      const primaRiga = righeFile[1]?.split(";")
      const nomeCarrello = primaRiga?.[17]?.replaceAll('"', "").trim() || "Carrello"

      for (let i = 1; i < righeFile.length; i++) {
        const colonne = righeFile[i].split(";")

        const codice = colonne[1]?.replaceAll('"', "").trim()
        const descrizione = colonne[6]?.replaceAll('"', "").trim()
        const quantita = leggiNumero(colonne[10]) || 1
        const prezzo = trovaPrezzoDaColonne(colonne)
        const totale = quantita * prezzo

        if (codice || descrizione) {
          materiali.push({
            codice,
            descrizione,
            quantita,
            prezzo,
            totale
          })
        }
      }

      if (materiali.length === 0) {
        alert("❌ Nessun materiale trovato")
        return
      }

      const { data: giaPresente } = await supabase
        .from("bolle_acquisto")
        .select("id")
        .eq("tipo", "carrello")
        .eq("nome_carrello", nomeCarrello)
        .maybeSingle()

      if (giaPresente?.id) {
        alert("⚠️ Questo carrello sembra già importato")
        return
      }

      const { data: carrello, error } = await supabase
        .from("bolle_acquisto")
        .insert({
          nome: nomeCarrello,
          nome_carrello: nomeCarrello,
          data: new Date().toISOString(),
          tipo: "carrello",
          usata: false,
          descrizione_ricerca: ""
        })
        .select()
        .single()

      if (error) {
        console.error(error)
        alert("Errore creazione carrello: " + error.message)
        return
      }

      const { error: righeError } = await supabase
        .from("bolle_righe")
        .insert(
          materiali.map((m, index) => ({
            bolla_id: carrello.id,
            ordine: index + 1,
            codice: m.codice,
            descrizione: m.descrizione,
            quantita: m.quantita,
            prezzo: m.prezzo,
            totale: m.totale
          }))
        )

      if (righeError) {
        console.error(righeError)
        alert("Errore inserimento righe carrello: " + righeError.message)
        return
      }

      await aggiornaPreferiti(materiali)

      const conPrezzo = materiali.filter(m => Number(m.prezzo || 0) > 0).length

      alert(`✅ Carrello importato e preferiti aggiornati\nRighe: ${materiali.length}\nRighe con prezzo: ${conPrezzo}`)

      caricaCarrelli()
    } finally {
      setCaricandoCSV(false)
    }
  }

  const carrelliFiltrati = carrelli.filter(c => {
    const nomeCarrello = c.nome || c.nome_carrello || ""

    const nomeOk =
      !searchNome ||
      nomeCarrello.toLowerCase().includes(searchNome.toLowerCase())

    const dataCarrello = c.data ? c.data.substring(0, 10) : ""
    const daOk = !dataDa || dataCarrello >= dataDa
    const aOk = !dataA || dataCarrello <= dataA

    return nomeOk && daOk && aOk
  })

  const carrelliInsiemeSelezionato = insiemeDestinazione
    ? carrelli.filter(c => String(c.insieme_carrello || "").trim() === String(insiemeDestinazione || "").trim())
    : []

  const carrelliNonAssegnati = carrelliFiltrati.filter(c =>
    !String(c.insieme_carrello || "").trim()
  )

  const nomeCarrelloScelto = ricercaNomeCarrello.trim().toLowerCase()

  const carrelliConNomeScelto = nomeCarrelloScelto
    ? carrelli.filter(c =>
        String(c.nome || c.nome_carrello || "").trim().toLowerCase() === nomeCarrelloScelto
      )
    : []

  const fornitoriDisponibili = Array.from(new Set(
    carrelliConNomeScelto
      .map(c => String(c.insieme_carrello || "").trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "it"))

  const risultatiRicercaCarrelli = ricercaEseguita && ricercaInsieme
    ? carrelliConNomeScelto.filter(c =>
        String(c.insieme_carrello || "") === ricercaInsieme
      )
    : []

  // Quando descrizione/nome carrello + fornitore identificano un solo carrello,
  // apri automaticamente i materiali senza richiedere un altro clic.
  useEffect(() => {
    if (!ricercaEseguita || !ricercaInsieme || !ricercaNomeCarrello.trim()) return
    if (risultatiRicercaCarrelli.length !== 1) return

    const carrello = risultatiRicercaCarrelli[0]
    if (String(selected?.id || "") === String(carrello.id || "")) return

    selezionaCarrello(carrello)
  }, [
    ricercaEseguita,
    ricercaInsieme,
    ricercaNomeCarrello,
    risultatiRicercaCarrelli.length,
    selected?.id
  ])

  const testoSuggerimentoNome = ricercaNomeCarrello.trim().toLowerCase()
  const suggerimentiNomeCarrello = testoSuggerimentoNome
    ? Array.from(new Set(
        carrelli
          .filter(c =>
            !ricercaInsieme.trim() ||
            String(c.insieme_carrello || "").toLowerCase().includes(ricercaInsieme.trim().toLowerCase())
          )
          .map(c => String(c.nome || c.nome_carrello || "").trim())
          .filter(Boolean)
          .filter(nome => nome.toLowerCase().includes(testoSuggerimentoNome))
      )).slice(0, 10)
    : []

  const testoSuggerimentoFornitore = ricercaInsieme.trim().toLowerCase()
  const tuttiFornitori = Array.from(new Set(
    carrelli
      .map(c => String(c.insieme_carrello || "").trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "it"))

  const fornitoriCompatibiliConNome = ricercaNomeCarrello.trim()
    ? Array.from(new Set(
        carrelli
          .filter(c => String(c.nome || c.nome_carrello || "").toLowerCase().includes(ricercaNomeCarrello.trim().toLowerCase()))
          .map(c => String(c.insieme_carrello || "").trim())
          .filter(Boolean)
      ))
    : tuttiFornitori

  const suggerimentiFornitore = testoSuggerimentoFornitore
    ? fornitoriCompatibiliConNome.filter(nome => nome.toLowerCase().includes(testoSuggerimentoFornitore)).slice(0, 10)
    : fornitoriCompatibiliConNome.slice(0, 10)

  // Se il testo corrisponde esattamente a un fornitore lo usiamo subito.
  // Se invece il testo parziale identifica UN SOLO fornitore, lo consideriamo
  // già sufficiente per mostrare i suoi carrelli (es. INS -> INSET).
  const fornitoreEsatto = tuttiFornitori.find(
    nome => nome.toLowerCase() === testoSuggerimentoFornitore
  ) || ""

  const fornitoreEffettivo = fornitoreEsatto ||
    (testoSuggerimentoFornitore && suggerimentiFornitore.length === 1
      ? suggerimentiFornitore[0]
      : "")

  const carrelliDelFornitore = fornitoreEffettivo
    ? Array.from(new Set(
        carrelli
          .filter(c => String(c.insieme_carrello || "").trim().toLowerCase() === fornitoreEffettivo.toLowerCase())
          .map(c => String(c.nome || c.nome_carrello || "").trim())
          .filter(Boolean)
      )).sort((a, b) => a.localeCompare(b, "it"))
    : []

  const righeFiltrate = righe.filter(r => {
    const testoCompleto = normalizzaTesto(`
      ${r.codice || ""}
      ${r.descrizione || ""}
      ${r.produttore || ""}
      ${r.marca || ""}
      ${r.ean || ""}
    `)

    const filtri = [filtro1, filtro2, filtro3, filtro4]
      .map(normalizzaTesto)
      .filter(Boolean)

    return filtri.every(filtro => testoCompleto.includes(filtro))
  })

  const righeFiltrateSelezionate = righeFiltrate.filter(r =>
    righeSelezionate.includes(idRigaCarrello(r))
  )

  return (
    <div style={isMobile ? { padding: 8, width: "100%", boxSizing: "border-box", overflowX: "hidden" } : { padding: 20 }}>
      <h2>🛒 Carrelli</h2>

      {interventoIdDaUrl && (
        <div style={{
          background: "#e7f1ff",
          border: "1px solid #9ec5fe",
          color: "#084298",
          padding: 10,
          borderRadius: 6,
          marginBottom: 12
        }}>
          <b>Importazione diretta attiva</b>
          <div>
            Stai importando materiali nell’intervento:{" "}
            <b>
              #{interventoIdDaUrl}
              {interventoCorrente?.data ? ` - ${interventoCorrente.data}` : ""}
              {interventoCorrente?.clienti?.nome ? ` - ${interventoCorrente.clienti.nome}` : ""}
            </b>
          </div>

          {interventoCorrente?.descrizione && (
            <div>Descrizione: {interventoCorrente.descrizione}</div>
          )}

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
      )}

      {!interventoIdDaUrl && (
        <button
          onClick={() => navigate("/interventi")}
          style={{
            marginBottom: 10,
            padding: "8px 12px",
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          ⬅ Torna a Interventi
        </button>
      )}

      <input
        type="file"
        accept=".csv"
        disabled={caricandoCSV}
        style={isMobile ? { width: "100%", maxWidth: "100%" } : undefined}
        onChange={(e) => {
          const file = e.target.files[0]
          if (file) importaCSV(file)
          e.target.value = ""
        }}
      />

      {caricandoCSV && (
        <div style={{ marginTop: 8 }}>Caricamento CSV...</div>
      )}

      <div style={{
        marginTop: 18,
        padding: 12,
        border: "1px solid #0d6efd",
        borderRadius: 8,
        background: "#f8fbff"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap"
        }}>
          <div>
            <h3 style={{ margin: 0 }}>➕ Crea carrello da listino</h3>
            <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
              Cerca negli articoli importati nel listino e crea un carrello manuale.
            </div>
          </div>

          <button
            onClick={() => setMostraCreaDaListino(!mostraCreaDaListino)}
            style={{
              background: mostraCreaDaListino ? "#6c757d" : "#0d6efd",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: "pointer"
            }}
          >
            {mostraCreaDaListino ? "Chiudi creazione" : "➕ Nuovo da listino"}
          </button>
        </div>

        {mostraCreaDaListino && (
          <div style={{ marginTop: 14 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 1fr) auto",
              gap: 10,
              alignItems: "center",
              marginBottom: 12
            }}>
              <input
                value={nomeNuovoCarrello}
                onChange={(e) => setNomeNuovoCarrello(e.target.value)}
                placeholder="Nome nuovo carrello es. Appartamento Rossi piano terra"
                style={{ padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
              />

              <button
                onClick={salvaCarrelloDaListino}
                disabled={salvandoNuovoCarrello || righeNuovoCarrello.length === 0}
                style={{
                  background: righeNuovoCarrello.length === 0 ? "#ccc" : "#198754",
                  color: righeNuovoCarrello.length === 0 ? "black" : "white",
                  border: "none",
                  padding: "9px 12px",
                  borderRadius: 5,
                  cursor: salvandoNuovoCarrello || righeNuovoCarrello.length === 0 ? "not-allowed" : "pointer"
                }}
              >
                {salvandoNuovoCarrello ? "Salvataggio..." : "💾 Salva carrello"}
              </button>
            </div>

            <div style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 10
            }}>
              <input
                placeholder="Filtro 1 es. VIM / PHL"
                value={listinoFiltro1}
                onChange={(e) => setListinoFiltro1(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") cercaArticoliListino() }}
                style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 160, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
              />

              <input
                placeholder="Filtro 2 es. presa"
                value={listinoFiltro2}
                onChange={(e) => setListinoFiltro2(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") cercaArticoliListino() }}
                style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 160, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
              />

              <input
                placeholder="Filtro 3 es. bianco"
                value={listinoFiltro3}
                onChange={(e) => setListinoFiltro3(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") cercaArticoliListino() }}
                style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 160, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
              />

              <input
                placeholder="Filtro 4 es. codice/EAN"
                value={listinoFiltro4}
                onChange={(e) => setListinoFiltro4(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") cercaArticoliListino() }}
                style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 160, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
              />

              <button
                onClick={cercaArticoliListino}
                disabled={cercandoListino}
                style={{
                  background: "#0d6efd",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 5,
                  cursor: cercandoListino ? "not-allowed" : "pointer"
                }}
              >
                {cercandoListino ? "Cerco..." : "🔎 Cerca listino"}
              </button>

              <button
                onClick={() => {
                  setListinoFiltro1("")
                  setListinoFiltro2("")
                  setListinoFiltro3("")
                  setListinoFiltro4("")
                  setRisultatiListino([])
                  setListinoSelezionati([])
                  setQuantitaListino({})
                }}
              >
                Reset ricerca
              </button>
            </div>

            <div style={{
              marginBottom: 10,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center"
            }}>
              <span>
                Risultati listino: <b>{risultatiListino.length}</b> — Selezionati: <b>{listinoSelezionati.length}</b> — Righe nel nuovo carrello: <b>{righeNuovoCarrello.length}</b>
              </span>

              <button
                onClick={selezionaTuttiRisultatiListino}
                disabled={risultatiListino.length === 0}
                style={{
                  background: risultatiListino.length === 0 ? "#ccc" : "#0d6efd",
                  color: risultatiListino.length === 0 ? "black" : "white",
                  border: "none",
                  padding: "7px 10px",
                  borderRadius: 5,
                  cursor: risultatiListino.length === 0 ? "not-allowed" : "pointer"
                }}
              >
                ☑ Seleziona tutti
              </button>

              <button
                onClick={selezionaTutteSopraUltimoListino}
                disabled={risultatiListino.length === 0 || listinoSelezionati.length === 0}
                style={{
                  background: risultatiListino.length === 0 || listinoSelezionati.length === 0 ? "#ccc" : "#fd7e14",
                  color: risultatiListino.length === 0 || listinoSelezionati.length === 0 ? "black" : "white",
                  border: "none",
                  padding: "7px 10px",
                  borderRadius: 5,
                  cursor: risultatiListino.length === 0 || listinoSelezionati.length === 0 ? "not-allowed" : "pointer"
                }}
              >
                ⬆ Seleziona tutte sopra
              </button>

              <button
                onClick={deselezionaTuttiRisultatiListino}
                disabled={listinoSelezionati.length === 0}
                style={{
                  background: listinoSelezionati.length === 0 ? "#ccc" : "#6c757d",
                  color: listinoSelezionati.length === 0 ? "black" : "white",
                  border: "none",
                  padding: "7px 10px",
                  borderRadius: 5,
                  cursor: listinoSelezionati.length === 0 ? "not-allowed" : "pointer"
                }}
              >
                ☐ Deseleziona
              </button>

              <button
                onClick={aggiungiSelezionatiAlNuovoCarrello}
                disabled={listinoSelezionati.length === 0}
                style={{
                  background: listinoSelezionati.length === 0 ? "#ccc" : "#198754",
                  color: listinoSelezionati.length === 0 ? "black" : "white",
                  border: "none",
                  padding: "7px 10px",
                  borderRadius: 5,
                  cursor: listinoSelezionati.length === 0 ? "not-allowed" : "pointer"
                }}
              >
                ➕ Aggiungi selezionati al carrello
              </button>
            </div>

            {risultatiListino.length > 0 && (
              <div style={{
                maxHeight: 420,
                overflowY: "auto",
                overflowX: isMobile ? "auto" : "visible",
                border: "1px solid #ddd",
                borderRadius: 6,
                background: "white",
                marginBottom: 14
              }}>
                {risultatiListino.map(a => {
                  const id = idArticoloListino(a)
                  const selezionato = articoloListinoSelezionato(a)

                  return (
                    <div
                      key={`${a.codice}_${a.ean}`}
                      onClick={() => toggleArticoloListino(a)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: mostraPrezzi ? "45px 130px 1fr 90px 120px" : "45px 130px 1fr 90px",
                        minWidth: isMobile ? (mostraPrezzi ? 650 : 530) : "auto",
                        gap: 8,
                        alignItems: "center",
                        padding: 8,
                        borderBottom: "1px solid #eee",
                        background: selezionato ? "#e7f1ff" : "white",
                        cursor: "pointer"
                      }}
                    >
                      <div>
                        <input
                          type="checkbox"
                          checked={selezionato}
                          onChange={() => toggleArticoloListino(a)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: 22, height: 22, cursor: "pointer" }}
                        />
                      </div>

                      <div>
                        <b>{a.codice}</b>
                        {a.produttore && (
                          <div style={{ fontSize: 12, color: "#555" }}>{a.produttore}</div>
                        )}
                      </div>

                      <div>
                        {a.descrizione}
                        {a.ean && (
                          <div style={{ fontSize: 12, color: "#777" }}>EAN: {a.ean}</div>
                        )}
                      </div>

                      <div>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={quantitaListino[id] || 1}
                          onChange={(e) => aggiornaQuantitaArticoloListino(a, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: "100%", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                        />
                      </div>

                      {mostraPrezzi && (
                        <div>
                          <b>{formatPrezzo(a.prezzo_netto || a.prezzo || a.prezzo_lordo || 0)}</b>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {righeNuovoCarrello.length > 0 && (
              <div style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                background: "white",
                padding: 10,
                overflowX: isMobile ? "auto" : "visible"
              }}>
                <h4 style={{ marginTop: 0 }}>Materiali nel nuovo carrello</h4>

                {righeNuovoCarrello.map(r => (
                  <div
                    key={r.temp_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: mostraPrezzi ? "130px 1fr 90px 110px 90px" : "130px 1fr 90px 90px",
                      minWidth: isMobile ? (mostraPrezzi ? 620 : 500) : "auto",
                      gap: 8,
                      alignItems: "center",
                      borderBottom: "1px solid #eee",
                      padding: "6px 0"
                    }}
                  >
                    <input
                      value={r.codice || ""}
                      onChange={(e) => aggiornaRigaNuovoCarrello(r.temp_id, "codice", e.target.value)}
                      style={{ padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                    />

                    <input
                      value={r.descrizione || ""}
                      onChange={(e) => aggiornaRigaNuovoCarrello(r.temp_id, "descrizione", e.target.value)}
                      style={{ padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                    />

                    <input
                      type="number"
                      value={r.quantita || ""}
                      onChange={(e) => aggiornaRigaNuovoCarrello(r.temp_id, "quantita", e.target.value)}
                      style={{ padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                    />

                    {mostraPrezzi && (
                      <input
                        type="number"
                        step="0.01"
                        value={r.prezzo || ""}
                        onChange={(e) => aggiornaRigaNuovoCarrello(r.temp_id, "prezzo", e.target.value)}
                        style={{ padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                      />
                    )}

                    <button
                      onClick={() => eliminaRigaNuovoCarrello(r.temp_id)}
                      style={{
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        padding: "6px 8px",
                        borderRadius: 5,
                        cursor: "pointer"
                      }}
                    >
                      🗑
                    </button>
                  </div>
                ))}

                <div style={{ marginTop: 10, fontWeight: "bold" }}>
                  Totale righe: {righeNuovoCarrello.length}
                  {mostraPrezzi && (
                    <> — Totale: {formatPrezzo(righeNuovoCarrello.reduce((acc, r) => acc + Number(r.totale || 0), 0))}</>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 20,
        padding: 14,
        border: "2px solid #0d6efd",
        borderRadius: 10,
        background: "#f8fbff"
      }}>
        <h3 style={{ marginTop: 0, marginBottom: 6 }}>🔎 Trova materiali carrello</h3>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
          Puoi partire dalla <b>descrizione/nome carrello</b> oppure dal <b>fornitore</b>. I due percorsi si filtrano automaticamente.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, alignItems: "start" }}>
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 4 }}>Descrizione / nome carrello</div>
            <input
              ref={ricercaNomeRef}
              value={ricercaNomeCarrello}
              onFocus={() => setFocusSuggerimenti("nome")}
              onChange={(e) => {
                setRicercaNomeCarrello(e.target.value)
                setRicercaEseguita(false)
                setSelected(null)
                setRighe([])
                setRigheSelezionate([])
                setFocusSuggerimenti("nome")
                setIndiceSuggerimentoNome(-1)
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && suggerimentiNomeCarrello.length > 0) {
                  e.preventDefault()
                  setIndiceSuggerimentoNome(prev => prev < suggerimentiNomeCarrello.length - 1 ? prev + 1 : 0)
                } else if (e.key === "ArrowUp" && suggerimentiNomeCarrello.length > 0) {
                  e.preventDefault()
                  setIndiceSuggerimentoNome(prev => prev > 0 ? prev - 1 : suggerimentiNomeCarrello.length - 1)
                } else if (e.key === "Enter") {
                  e.preventDefault()
                  if (indiceSuggerimentoNome >= 0 && suggerimentiNomeCarrello[indiceSuggerimentoNome]) {
                    scegliSuggerimentoNome(suggerimentiNomeCarrello[indiceSuggerimentoNome])
                  } else if (suggerimentiNomeCarrello.length === 1) {
                    scegliSuggerimentoNome(suggerimentiNomeCarrello[0])
                  }
                } else if (e.key === "Escape") {
                  setFocusSuggerimenti(null)
                  setIndiceSuggerimentoNome(-1)
                }
              }}
              placeholder="Es. MANICOTTI STAGNI, CURVA STAGNA..."
              autoComplete="off"
              style={{ width: "100%", padding: 10, boxSizing: "border-box", fontSize: 16 }}
            />

            {focusSuggerimenti === "nome" && suggerimentiNomeCarrello.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, background: "white",
                border: "1px solid #bbb", borderTop: "none", borderRadius: "0 0 7px 7px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 300, overflowY: "auto"
              }}>
                {suggerimentiNomeCarrello.map((nome, index) => (
                  <div
                    key={`sugg_nome_${nome}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => scegliSuggerimentoNome(nome)}
                    style={{
                      padding: "10px 12px", borderBottom: "1px solid #eee", cursor: "pointer",
                      background: indiceSuggerimentoNome === index ? "#e7f1ff" : "white"
                    }}
                  >
                    🛒 {nome}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 4 }}>Fornitore</div>
            <input
              value={ricercaInsieme}
              onFocus={() => setFocusSuggerimenti("fornitore")}
              onChange={(e) => {
                setRicercaInsieme(e.target.value)
                setRicercaEseguita(false)
                setFocusSuggerimenti("fornitore")
                setIndiceSuggerimentoFornitore(-1)
                setSelected(null)
                setRighe([])
                setRigheSelezionate([])
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && suggerimentiFornitore.length > 0) {
                  e.preventDefault()
                  setIndiceSuggerimentoFornitore(prev => prev < suggerimentiFornitore.length - 1 ? prev + 1 : 0)
                } else if (e.key === "ArrowUp" && suggerimentiFornitore.length > 0) {
                  e.preventDefault()
                  setIndiceSuggerimentoFornitore(prev => prev > 0 ? prev - 1 : suggerimentiFornitore.length - 1)
                } else if (e.key === "Enter") {
                  e.preventDefault()
                  if (indiceSuggerimentoFornitore >= 0 && suggerimentiFornitore[indiceSuggerimentoFornitore]) {
                    scegliSuggerimentoFornitore(suggerimentiFornitore[indiceSuggerimentoFornitore])
                  } else if (suggerimentiFornitore.length === 1) {
                    scegliSuggerimentoFornitore(suggerimentiFornitore[0])
                  }
                } else if (e.key === "Escape") {
                  setFocusSuggerimenti(null)
                  setIndiceSuggerimentoFornitore(-1)
                }
              }}
              placeholder="Es. INSET, SONEPAR..."
              autoComplete="off"
              style={{ width: "100%", padding: 10, boxSizing: "border-box", fontSize: 16 }}
            />

            {focusSuggerimenti === "fornitore" && suggerimentiFornitore.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 31, background: "white",
                border: "1px solid #bbb", borderTop: "none", borderRadius: "0 0 7px 7px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)", maxHeight: 300, overflowY: "auto"
              }}>
                {suggerimentiFornitore.map((fornitore, index) => (
                  <div
                    key={`sugg_forn_${fornitore}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => scegliSuggerimentoFornitore(fornitore)}
                    style={{
                      padding: "10px 12px", borderBottom: "1px solid #eee", cursor: "pointer",
                      background: indiceSuggerimentoFornitore === index ? "#f1e9ff" : "white"
                    }}
                  >
                    🏪 {fornitore}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {fornitoreEffettivo && !ricercaNomeCarrello.trim() && carrelliDelFornitore.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 0.8fr) minmax(360px, 1.6fr)",
              gap: 14,
              alignItems: "start"
            }}>
              <div style={{ background: "white", border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Fornitore selezionato</div>
                <div style={{ padding: "12px 14px", border: "2px solid #6f42c1", background: "#eee5ff", borderRadius: 8, fontWeight: 700, fontSize: 17 }}>
                  🏪 {fornitoreEffettivo}
                </div>
              </div>

              <div style={{ background: "white", border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Scegli il carrello</div>
                {carrelliDelFornitore.map(nome => (
                  <button
                    key={`carrello_forn_${nome}`}
                    onClick={() => {
                      setRicercaInsieme(fornitoreEffettivo)
                      scegliSuggerimentoNome(nome, true)
                    }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: isMobile ? "14px 12px" : "11px 12px", marginBottom: 7,
                      minHeight: isMobile ? 52 : 44, borderRadius: 8,
                      border: "1px solid #d5d5d5", background: "white", cursor: "pointer",
                      fontWeight: 650, fontSize: isMobile ? 16 : 15
                    }}
                  >
                    🛒 {nome}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {ricercaEseguita && ricercaNomeCarrello.trim() && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8 }}>
              Fornitori che trattano <span style={{ color: "#0d6efd" }}>{ricercaNomeCarrello}</span>
            </div>

            {fornitoriDisponibili.length === 0 ? (
              <div style={{ padding: 10, background: "#fff3cd", border: "1px solid #ffe69c", borderRadius: 6 }}>
                Nessun fornitore associato a questo carrello. Puoi assegnarlo da “Gestisci insiemi e carrelli”.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 8
              }}>
                {fornitoriDisponibili.map(fornitore => {
                  const numero = carrelliConNomeScelto.filter(c => c.insieme_carrello === fornitore).length
                  const attivo = ricercaInsieme === fornitore
                  return (
                    <button
                      key={`fornitore_${fornitore}`}
                      onClick={() => {
                        setRicercaInsieme(fornitore)
                        setRicercaEseguita(true)
                        setSelected(null)
                        setRighe([])
                        setRigheSelezionate([])
                      }}
                      style={{
                        width: "100%", textAlign: "left",
                        background: attivo ? "#eee5ff" : "white",
                        color: "#222",
                        border: attivo ? "2px solid #6f42c1" : "1px solid #d5d5d5",
                        padding: isMobile ? "14px 12px" : "11px 12px",
                        minHeight: isMobile ? 52 : 44, borderRadius: 8, cursor: "pointer",
                        fontWeight: attivo ? 750 : 650, fontSize: isMobile ? 16 : 15
                      }}
                    >
                      🏪 {fornitore}{numero > 1 ? ` (${numero})` : ""}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {ricercaEseguita && ricercaInsieme && (
          <div style={{ marginTop: 18 }}>
            <div style={{ marginBottom: 8, fontWeight: "bold" }}>
              {ricercaNomeCarrello} — fornitore {ricercaInsieme}
            </div>

            {risultatiRicercaCarrelli.map(c => {
              const nomeCarrello = c.nome || c.nome_carrello || "Carrello"
              return (
                <div
                  key={`ricerca_${c.id}`}
                  style={{
                    marginTop: 8,
                    padding: 11,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    background: "white",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap"
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 17 }}>🛒 <b>{nomeCarrello}</b></div>
                    <div style={{ marginTop: 4, fontSize: 13 }}>
                      🏪 Fornitore: <b>{c.insieme_carrello}</b>
                    </div>
                    <div
                      onClick={() => {
                        if (c.descrizione_ricerca) {
                          setRicercaVelocePreferiti(c.descrizione_ricerca)
                        }
                      }}
                      title={c.descrizione_ricerca ? "Clicca per cercare questo promemoria nei Preferiti" : ""}
                      style={{
                        marginTop: 6,
                        padding: 8,
                        background: c.descrizione_ricerca ? "#fff3cd" : "#f5f5f5",
                        borderRadius: 5,
                        fontSize: 13,
                        cursor: c.descrizione_ricerca ? "pointer" : "default",
                        border: c.descrizione_ricerca ? "1px solid #ffe69c" : "1px solid transparent"
                      }}
                    >
                      📝 Promemoria: <b>{c.descrizione_ricerca || "Nessun promemoria"}</b>
                      {c.descrizione_ricerca && (
                        <span style={{ marginLeft: 8, color: "#0d6efd", fontWeight: "bold" }}>
                          🔎 Cerca nei Preferiti
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "9px 12px",
                      borderRadius: 6,
                      background: "#e8f5e9",
                      color: "#146c43",
                      fontWeight: "bold",
                      fontSize: 13
                    }}
                  >
                    📦 Materiali aperti automaticamente
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selected && righe.length > 0 && (
          <div ref={risultatiMaterialiRef} style={{
            marginTop: 16,
            padding: isMobile ? 10 : 14,
            background: "white",
            border: "2px solid #198754",
            borderRadius: 10
          }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
              📦 Materiali — {selected.nome_carrello || selected.nome || "Carrello"}
            </div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
              🏪 {selected.insieme_carrello || ricercaInsieme || "Fornitore non indicato"}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <input
                placeholder="Filtra codice o descrizione"
                value={filtro1}
                onChange={(e) => setFiltro1(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: 10, fontSize: 16, border: "1px solid #bbb", borderRadius: 6 }}
              />
              <input
                placeholder="Secondo filtro"
                value={filtro2}
                onChange={(e) => setFiltro2(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: 10, fontSize: 16, border: "1px solid #bbb", borderRadius: 6 }}
              />
            </div>

            <div style={{ marginBottom: 8, fontSize: 13 }}>
              Trovati <b>{righeFiltrate.length}</b> materiali — selezionati <b>{righeSelezionate.length}</b>
            </div>

            <div style={{ maxHeight: isMobile ? "52vh" : 430, overflowY: "auto", border: "1px solid #e2e2e2", borderRadius: 8 }}>
              {righeFiltrate.map(r => {
                const rigaId = idRigaCarrello(r)
                const checked = righeSelezionate.includes(rigaId)
                return (
                  <div
                    key={`rapido_${rigaId}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "34px 1fr 72px" : "34px minmax(110px, 0.7fr) 1.8fr 80px",
                      gap: 8,
                      alignItems: "center",
                      padding: isMobile ? "11px 8px" : "9px 10px",
                      borderBottom: "1px solid #eee",
                      background: checked ? "#eef8f1" : "white"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRigaSelezionata(r)}
                      style={{ width: 20, height: 20 }}
                    />
                    {isMobile ? (
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 750, overflowWrap: "anywhere" }}>{r.codice || "Senza codice"}</div>
                        <div style={{ fontSize: 14, marginTop: 2, overflowWrap: "anywhere" }}>{r.descrizione || ""}</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 750, overflowWrap: "anywhere" }}>{r.codice || "Senza codice"}</div>
                        <div style={{ overflowWrap: "anywhere" }}>{r.descrizione || ""}</div>
                      </>
                    )}
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={r.quantita || 1}
                      onChange={(e) => aggiornaCampoRiga(rigaId, "quantita", e.target.value)}
                      aria-label="Quantità"
                      style={{ width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #bbb", borderRadius: 6, fontSize: 16 }}
                    />
                  </div>
                )
              })}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <button
                onClick={selezionaTutteFiltrate}
                disabled={righeFiltrate.length === 0}
                style={{ padding: "9px 12px" }}
              >
                ☑ Seleziona visibili
              </button>
              <button
                onClick={() => inserisciInIntervento(true)}
                disabled={importando || righeSelezionate.length === 0}
                style={{
                  flex: isMobile ? "1 1 100%" : "0 0 auto",
                  background: righeSelezionate.length ? "#198754" : "#bbb",
                  color: "white",
                  border: "none",
                  padding: isMobile ? "13px 14px" : "10px 16px",
                  borderRadius: 7,
                  fontWeight: 800,
                  fontSize: isMobile ? 16 : 15,
                  cursor: righeSelezionate.length ? "pointer" : "not-allowed"
                }}
              >
                {importando ? "Inserimento..." : `➕ Inserisci selezionati (${righeSelezionate.length})`}
              </button>
            </div>
          </div>
        )}

        <div style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <button onClick={azzeraRicercaCarrelli} style={{ padding: "8px 12px" }}>
            Azzera ricerca
          </button>

          <input
            value={ricercaVelocePreferiti}
            onChange={(e) => setRicercaVelocePreferiti(e.target.value)}
            placeholder="Ricerca veloce 1: codice o descrizione"
            autoComplete="off"
            style={{
              flex: isMobile ? "1 1 100%" : "1 1 300px",
              minWidth: isMobile ? 0 : 260,
              padding: 9,
              border: "1px solid #aaa",
              borderRadius: 6,
              boxSizing: "border-box"
            }}
          />

          <input
            value={ricercaVelocePreferiti2}
            onChange={(e) => setRicercaVelocePreferiti2(e.target.value)}
            placeholder="Ricerca veloce 2: altro codice / descrizione"
            autoComplete="off"
            style={{
              flex: isMobile ? "1 1 100%" : "1 1 300px",
              minWidth: isMobile ? 0 : 260,
              padding: 9,
              border: "1px solid #aaa",
              borderRadius: 6,
              boxSizing: "border-box"
            }}
          />

          {(ricercaVelocePreferiti.trim() || ricercaVelocePreferiti2.trim()) && (
            <span style={{ fontSize: 13, color: "#555" }}>
              {cercandoPreferiti ? "Cerco..." : `Risultati: ${risultatiPreferiti.length}`}
            </span>
          )}
        </div>

        {(risultatiPreferiti.length > 0 || ((ricercaVelocePreferiti.trim() || ricercaVelocePreferiti2.trim()) && !cercandoPreferiti)) && (
          <div
            ref={risultatiPreferitiRef}
            style={{
              marginTop: 14,
              padding: 12,
              border: "1px solid #198754",
              borderRadius: 8,
              background: "#f4fff8"
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 8
            }}>
              <div style={{ fontWeight: "bold" }}>
              ⭐ Preferiti trovati: {risultatiPreferiti.length}
              {ricercaNomeCarrello.trim() && ricercaInsieme ? (
                <span style={{ marginLeft: 8, fontSize: 13, color: "#555" }}>
                  — solo {ricercaNomeCarrello} / {ricercaInsieme}
                </span>
              ) : selected?.id ? (
                <span style={{ marginLeft: 8, fontSize: 13, color: "#555" }}>
                  — solo carrello aperto
                </span>
              ) : null}
              </div>

              <button
                onClick={inserisciPreferitiSelezionati}
                disabled={preferitiSelezionati.length === 0 || inserendoPreferiti}
                style={{
                  background: preferitiSelezionati.length === 0 ? "#ccc" : "#198754",
                  color: preferitiSelezionati.length === 0 ? "#555" : "white",
                  border: "none",
                  padding: "9px 14px",
                  borderRadius: 6,
                  cursor: preferitiSelezionati.length === 0 || inserendoPreferiti ? "not-allowed" : "pointer",
                  fontWeight: "bold"
                }}
              >
                {inserendoPreferiti
                  ? "Inserimento..."
                  : `➕ Inserisci selezionati nell'intervento (${preferitiSelezionati.length})`}
              </button>
            </div>

            {risultatiPreferiti.length === 0 ? (
              <div>Nessun materiale preferito trovato con questa ricerca.</div>
            ) : (
              risultatiPreferiti.slice(0, 100).map(a => {
                const selezionato = preferitoSelezionato(a)
                const id = idPreferito(a)

                return (
                  <div
                    key={`pref_${a.id || a.codice}_${a.descrizione}`}
                    onClick={() => togglePreferito(a)}
                    style={{
                      padding: "9px 10px",
                      marginTop: 6,
                      border: selezionato ? "2px solid #0d6efd" : "1px solid #cfe8d7",
                      borderRadius: 6,
                      background: selezionato ? "#e7f1ff" : "white",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={selezionato}
                        onChange={() => togglePreferito(a)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: 22, height: 22, cursor: "pointer" }}
                      />

                      <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                        <div>
                          <b>{a.codice || "Senza codice"}</b> — {a.descrizione || "Senza descrizione"}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 12, color: "#666" }}>
                          Usato {Number(a.volte_usato || 0)} volte
                          {Number(a.quantita_totale || 0) > 0 ? ` — Quantità totale ${a.quantita_totale}` : ""}
                        </div>
                      </div>

                      {selezionato && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <b>Q.tà</b>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={quantitaPreferiti[id] || 1}
                            onChange={(e) => aggiornaQuantitaPreferito(a, e.target.value)}
                            style={{ width: 75, padding: 7, border: "1px solid #aaa", borderRadius: 5 }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {risultatiPreferiti.length > 100 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                Visualizzati i primi 100 risultati. Affina la ricerca per restringere l'elenco.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => setMostraGestioneInsiemi(!mostraGestioneInsiemi)}
          style={{
            background: mostraGestioneInsiemi ? "#6c757d" : "#6f42c1",
            color: "white",
            border: "none",
            padding: "8px 12px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          {mostraGestioneInsiemi ? "▲ Chiudi gestione insiemi" : "⚙️ Gestisci insiemi e carrelli"}
        </button>
      </div>

      {mostraGestioneInsiemi && (
        <div style={{
          marginTop: 10,
          padding: 12,
          border: "2px solid #6f42c1",
          borderRadius: 8,
          background: "#f8f5ff"
        }}>
          <h3 style={{ marginTop: 0 }}>🗂 Gestione insiemi</h3>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <input
              value={nomeNuovoInsieme}
              onChange={(e) => setNomeNuovoInsieme(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") creaNuovoInsieme() }}
              placeholder="Nome nuovo insieme es. INSET"
              style={isMobile ? { width: "100%", padding: 8, boxSizing: "border-box" } : { minWidth: 260, padding: 8 }}
            />
            <button onClick={creaNuovoInsieme} disabled={!nomeNuovoInsieme.trim() || salvandoInsieme}>
              ➕ Crea insieme
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(220px, 0.8fr) minmax(360px, 1.6fr)",
            gap: 14,
            alignItems: "start"
          }}>
            <div style={{ background: "white", border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Gruppi creati</div>
              {insiemiCarrelli.length === 0 ? (
                <div style={{ color: "#666" }}>Nessun gruppo creato.</div>
              ) : (
                insiemiCarrelli.map(i => {
                  const attivo = String(insiemeDestinazione || "") === String(i.nome || "")
                  const quanti = carrelli.filter(c =>
                    String(c.insieme_carrello || "").trim() === String(i.nome || "").trim()
                  ).length
                  return (
                    <button
                      key={i.id}
                      onClick={() => {
                        setInsiemeDestinazione(i.nome)
                        setCarrelliSelezionatiInsieme([])
                      }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "9px 10px", marginBottom: 6, borderRadius: 6,
                        border: attivo ? "2px solid #6f42c1" : "1px solid #ddd",
                        background: attivo ? "#eee5ff" : "white",
                        cursor: "pointer", fontWeight: attivo ? 700 : 500
                      }}
                    >
                      🗂 {i.nome} <span style={{ color: "#666" }}>({quanti})</span>
                    </button>
                  )
                })
              )}
            </div>

            <div style={{ background: "white", border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
              {!insiemeDestinazione ? (
                <div style={{ color: "#666" }}>Seleziona un gruppo a sinistra per vedere e modificare i carrelli contenuti.</div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <b>Gruppo: {insiemeDestinazione}</b> — {carrelliInsiemeSelezionato.length} carrello/i
                    </div>
                    <button
                      onClick={rinominaInsiemeSelezionato}
                      disabled={salvandoInsieme}
                      style={{ background: "#fd7e14", color: "white", border: "none", padding: "8px 12px", borderRadius: 5 }}
                    >
                      ✏️ Rinomina gruppo
                    </button>
                  </div>

                  {carrelliInsiemeSelezionato.length === 0 ? (
                    <div style={{ color: "#666" }}>Questo gruppo non contiene ancora carrelli.</div>
                  ) : (
                    carrelliInsiemeSelezionato.map(c => {
                      const nomeCarrello = c.nome || c.nome_carrello || "Carrello"
                      return (
                        <div key={`gruppo_${c.id}`} style={{ padding: 8, marginTop: 6, border: "1px solid #e1e1e1", borderRadius: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ flex: 1, minWidth: 180 }}>🛒 <b>{nomeCarrello}</b></span>
                          <button onClick={() => selezionaCarrello(c)}>📦 Apri</button>
                          <button onClick={() => rimuoviCarrelloDaInsieme(c)} disabled={salvandoInsieme} style={{ color: "#b42318" }}>
                            ↩️ Togli dal gruppo
                          </button>
                        </div>
                      )
                    })
                  )}
                </>
              )}
            </div>
          </div>

          <div style={{ marginTop: 16, background: "white", border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Carrelli non assegnati</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <input
                placeholder="Filtra carrelli non assegnati per nome"
                value={searchNome}
                onChange={(e) => setSearchNome(e.target.value)}
                style={isMobile ? { width: "100%", padding: 8, boxSizing: "border-box" } : { minWidth: 340, padding: 8 }}
              />
              <select
                value={insiemeDestinazione}
                onChange={(e) => setInsiemeDestinazione(e.target.value)}
                style={isMobile ? { width: "100%", padding: 8, boxSizing: "border-box" } : { minWidth: 230, padding: 8 }}
              >
                <option value="">Scegli gruppo...</option>
                {insiemiCarrelli.map(i => <option key={i.id} value={i.nome}>{i.nome}</option>)}
              </select>
              <button onClick={spostaCarrelliNellInsieme} disabled={!insiemeDestinazione || carrelliSelezionatiInsieme.length === 0 || salvandoInsieme}>
                📦 Inserisci nel gruppo ({carrelliSelezionatiInsieme.length})
              </button>
              <button onClick={deselezionaCarrelliInsieme} disabled={carrelliSelezionatiInsieme.length === 0}>☐ Deseleziona</button>
            </div>

            <div style={{ marginBottom: 8, color: "#555" }}>Da assegnare: <b>{carrelliNonAssegnati.length}</b></div>

            {carrelliNonAssegnati.length === 0 ? (
              <div style={{ color: "#666" }}>Nessun carrello non assegnato.</div>
            ) : (
              carrelliNonAssegnati.map(c => {
                const nomeCarrello = c.nome || c.nome_carrello || "Carrello"
                return (
                  <div key={`non_assegnato_${c.id}`} style={{ padding: 8, marginTop: 5, border: "1px solid #ddd", borderRadius: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input type="checkbox" checked={carrelliSelezionatiInsieme.includes(String(c.id))} onChange={() => toggleCarrelloPerInsieme(c)} style={{ width: 22, height: 22 }} />
                    <span style={{ flex: 1, minWidth: 180 }}>🛒 <b>{nomeCarrello}</b></span>
                    <button onClick={() => selezionaCarrello(c)}>📦 Apri</button>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button onClick={modificaNomeCarrelloSelezionato} disabled={!selected}>✏️ Modifica nome selezionato</button>
            <button onClick={eliminaCarrelloSelezionato} disabled={!selected}>🗑 Elimina selezionato</button>
          </div>
        </div>
      )}

      {selected && (
        <div
          ref={dettaglioCarrelloRef}
          style={{
            marginTop: 20,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#f8f9fa"
          }}
        >
          <h3 style={{ marginTop: 0 }}>📦 Righe carrello</h3>

          <div style={{
            background: "#fff3cd",
            border: "1px solid #ffe69c",
            borderRadius: 6,
            padding: 10,
            marginBottom: 12
          }}>
            <b>📝 Promemoria ricerca di questo carrello</b>

            <div style={{ marginTop: 6, marginBottom: 6, fontSize: 13 }}>
              Scrivi parole utili per ritrovare velocemente i materiali.
              Esempio: <b>PHL GU10 3000 15000</b>
            </div>

            <textarea
              value={descrizioneRicerca}
              onChange={(e) => setDescrizioneRicerca(e.target.value)}
              placeholder="Esempio: PHL GU10 3000 15000 oppure faretti bagno piano terra"
              style={{
                width: "100%",
                minHeight: 70,
                padding: 8,
                border: "1px solid #ccc",
                borderRadius: 5,
                boxSizing: "border-box"
              }}
            />

            <div style={{
              marginTop: 8,
              display: "flex",
              gap: 8,
              flexWrap: "wrap"
            }}>
              <button
                onClick={salvaDescrizioneRicerca}
                style={{
                  background: "#198754",
                  color: "white",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 5,
                  cursor: "pointer"
                }}
              >
                💾 Salva promemoria
              </button>

              <button
                onClick={applicaEsempioNeiFiltri}
                disabled={!descrizioneRicerca.trim()}
                style={{
                  background: descrizioneRicerca.trim() ? "#0d6efd" : "#ccc",
                  color: descrizioneRicerca.trim() ? "white" : "black",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: 5,
                  cursor: descrizioneRicerca.trim() ? "pointer" : "not-allowed"
                }}
              >
                ⚡ Usa come ricerca
              </button>
            </div>
          </div>

          <button
            onClick={sbloccaPrezzi}
            style={{
              marginBottom: 10,
              background: mostraPrezzi ? "#dc3545" : "#198754",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: "pointer"
            }}
          >
            {mostraPrezzi ? "🙈 Nascondi prezzi" : "👁 Mostra prezzi"}
          </button>

          <button
            onClick={aggiungiRigaVuotaCarrello}
            style={{
              marginLeft: isMobile ? 0 : 10,
              marginBottom: 10,
              background: "#0d6efd",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: "pointer"
            }}
          >
            ➕ Aggiungi riga al carrello
          </button>

          <button
            onClick={() => {
              setSelected(null)
              setRighe([])
              setRigheSelezionate([])
              setDescrizioneRicerca("")
            }}
            style={{ marginLeft: isMobile ? 0 : 10, marginBottom: isMobile ? 10 : 0 }}
          >
            ❌ Chiudi
          </button>

          <div style={{
            marginTop: 10,
            marginBottom: 10,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            <input
              ref={ref1}
              placeholder="Filtro 1 es. PHL..."
              value={filtro1}
              onChange={(e) => setFiltro1(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ref2.current?.focus() }}
              style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 170, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
            />

            <input
              ref={ref2}
              placeholder="Filtro 2 es. GU..."
              value={filtro2}
              onChange={(e) => setFiltro2(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ref3.current?.focus() }}
              style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 170, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
            />

            <input
              ref={ref3}
              placeholder="Filtro 3 es. 3000..."
              value={filtro3}
              onChange={(e) => setFiltro3(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ref4.current?.focus() }}
              style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 170, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
            />

            <input
              ref={ref4}
              placeholder="Filtro 4 es. 15000..."
              value={filtro4}
              onChange={(e) => setFiltro4(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  risultatiMaterialiRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                  })
                }
              }}
              style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8, border: "1px solid #ccc", borderRadius: 5 } : { minWidth: 170, padding: 8, border: "1px solid #ccc", borderRadius: 5 }}
            />

            <button
              onClick={() => {
                setFiltro1("")
                setFiltro2("")
                setFiltro3("")
                setFiltro4("")
                ref1.current?.focus()
              }}
            >
              Reset materiali
            </button>
          </div>

          <div ref={risultatiMaterialiRef} style={{ marginBottom: 10 }}>
            Materiali trovati: <b>{righeFiltrate.length}</b> / {righe.length}
            {" "}— Selezionati visibili: <b>{righeFiltrateSelezionate.length}</b>
            {" "}— Selezionati totali: <b>{righeSelezionate.length}</b>
          </div>

          <div style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 10,
            alignItems: "center"
          }}>
            <button
              onClick={selezionaTutteFiltrate}
              disabled={righeFiltrate.length === 0}
              style={{
                background: "#0d6efd",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: 5,
                cursor: righeFiltrate.length === 0 ? "not-allowed" : "pointer"
              }}
            >
              ☑ Seleziona tutte le filtrate
            </button>

            <button
              onClick={deselezionaTutte}
              disabled={righeSelezionate.length === 0}
              style={{
                background: "#6c757d",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: 5,
                cursor: righeSelezionate.length === 0 ? "not-allowed" : "pointer"
              }}
            >
              ☐ Deseleziona tutte
            </button>
          </div>

          {righeFiltrate.length === 0 && (
            <div style={{
              marginTop: 10,
              padding: 10,
              background: "white",
              border: "1px solid #ddd",
              borderRadius: 6
            }}>
              Nessuna riga trovata con questi filtri.
            </div>
          )}

          <div>
          {righeFiltrate.map((r) => {
            const giaPresente = materialeGiaPresente(r)
            const rigaId = idRigaCarrello(r)
            const selezionata = rigaSelezionata(r)

            return (
              <div
                key={rigaId}
                style={{
                  border: giaPresente
                    ? "2px solid #ffc107"
                    : selezionata
                      ? "2px solid #0d6efd"
                      : "1px solid #198754",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 10,
                  background: giaPresente
                    ? "#fff8db"
                    : selezionata
                      ? "#e7f1ff"
                      : "#effcf4",
                  boxSizing: "border-box",
                  width: "100%"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selezionata}
                    onChange={() => toggleRigaSelezionata(r)}
                    style={{
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      marginRight: 2
                    }}
                  />

                  <input
                    value={r.codice || ""}
                    onChange={(e) =>
                      aggiornaCampoRiga(rigaId, "codice", e.target.value)
                    }
                    placeholder="Codice"
                    style={{
                      minWidth: 150,
                      flex: "0 1 220px",
                      padding: "5px 7px",
                      boxSizing: "border-box",
                      border: "1px solid #b8c8bd",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.75)",
                      fontWeight: "bold",
                      fontSize: 16
                    }}
                  />

                  {giaPresente && (
                    <span
                      style={{
                        display: "inline-block",
                        background: "#198754",
                        color: "white",
                        borderRadius: 999,
                        padding: "4px 9px",
                        fontSize: 12,
                        fontWeight: "bold"
                      }}
                    >
                      ● GIÀ USATO
                    </span>
                  )}

                  {selected?.usata && (
                    <span
                      style={{
                        display: "inline-block",
                        background: "#0d6efd",
                        color: "white",
                        borderRadius: 999,
                        padding: "4px 9px",
                        fontSize: 12,
                        fontWeight: "bold"
                      }}
                    >
                      CARRELLO USATO
                    </span>
                  )}
                </div>

                <textarea
                  value={r.descrizione || ""}
                  onChange={(e) =>
                    aggiornaCampoRiga(rigaId, "descrizione", e.target.value)
                  }
                  placeholder="Descrizione"
                  rows={2}
                  wrap="soft"
                  style={{
                    width: "100%",
                    minHeight: 54,
                    resize: "vertical",
                    marginTop: 7,
                    padding: "6px 8px",
                    boxSizing: "border-box",
                    border: "1px solid transparent",
                    borderRadius: 6,
                    background: "transparent",
                    fontSize: 16,
                    lineHeight: 1.35,
                    color: "#111",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word"
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                    marginTop: 5,
                    fontSize: 13,
                    color: "#555"
                  }}
                >
                  <label style={{ fontWeight: "bold" }}>
                    Qta:
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={r.quantita || ""}
                      onChange={(e) =>
                        aggiornaCampoRiga(rigaId, "quantita", e.target.value)
                      }
                      style={{
                        width: 70,
                        marginLeft: 5,
                        padding: 5,
                        border: "1px solid #bbb",
                        borderRadius: 5
                      }}
                    />
                  </label>

                  {mostraPrezzi && (
                    <label style={{ fontWeight: "bold" }}>
                      Prezzo:
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.prezzo || ""}
                        onChange={(e) =>
                          aggiornaCampoRiga(rigaId, "prezzo", e.target.value)
                        }
                        style={{
                          width: 90,
                          marginLeft: 5,
                          padding: 5,
                          border: "1px solid #bbb",
                          borderRadius: 5
                        }}
                      />
                    </label>
                  )}

                  {mostraPrezzi && (
                    <span>
                      Totale:{" "}
                      <b>
                        {formatPrezzo(
                          Number(r.quantita || 0) * Number(r.prezzo || 0)
                        )}
                      </b>
                    </span>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 9,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap"
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontWeight: "bold",
                      background: "#e7f1ff",
                      border: "1px solid #9ec5fe",
                      borderRadius: 6,
                      padding: "5px 8px"
                    }}
                  >
                    Pos.
                    <input
                      type="number"
                      min="1"
                      max={righe.length}
                      value={r.ordine || (righe.findIndex(x => String(x.id) === String(r.id)) + 1)}
                      onChange={(e) => aggiornaCampoRiga(idRigaCarrello(r), "ordine", e.target.value)}
                      onBlur={(e) => cambiaPosizioneRigaCarrello(r, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          cambiaPosizioneRigaCarrello(r, e.currentTarget.value)
                          e.currentTarget.blur()
                        }
                      }}
                      style={{
                        width: 66,
                        padding: "5px 6px",
                        border: "1px solid #86b7fe",
                        borderRadius: 5,
                        fontWeight: "bold",
                        textAlign: "center"
                      }}
                    />
                    / {righe.length}
                  </label>

                  <button
                    onClick={() => salvaRigaCarrello(r)}
                    disabled={salvandoRigaId === r.id}
                    style={{
                      background: "#198754",
                      color: "white",
                      border: "none",
                      padding: "7px 11px",
                      borderRadius: 6,
                      cursor:
                        salvandoRigaId === r.id
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    {salvandoRigaId === r.id ? "Salvo..." : "💾 Salva"}
                  </button>

                  <button
                    onClick={() => eliminaRigaCarrello(r)}
                    style={{
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      padding: "7px 11px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    🗑 Elimina
                  </button>
                </div>
              </div>
            )
          })}
          </div>

          {!interventoIdDaUrl ? (
            <>
              <h3>Seleziona intervento</h3>

              <select
                value={interventoSelezionato}
                onChange={(e) => setInterventoSelezionato(e.target.value)}
                style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8 } : undefined}
              >
                <option value="">-- seleziona --</option>
                {interventi.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.data} - {i.clienti?.nome} - {i.descrizione}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div style={{
              marginTop: 10,
              marginBottom: 10,
              background: "white",
              border: "1px solid #ddd",
              padding: 10,
              borderRadius: 6
            }}>
              Materiali destinati all’intervento:{" "}
              <b>
                #{interventoIdDaUrl}
                {interventoCorrente?.clienti?.nome ? ` - ${interventoCorrente.clienti.nome}` : ""}
              </b>
            </div>
          )}

          <br /><br />

          <button
            onClick={() => inserisciInIntervento(true)}
            disabled={importando || righeSelezionate.length === 0}
            style={{
              background: righeSelezionate.length === 0 ? "#ccc" : "#0d6efd",
              color: righeSelezionate.length === 0 ? "black" : "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              width: isMobile ? "100%" : "auto",
              marginBottom: isMobile ? 8 : 0,
              cursor: importando || righeSelezionate.length === 0 ? "not-allowed" : "pointer"
            }}
          >
            {importando ? "Inserimento..." : "📥 Inserisci solo selezionati"}
          </button>

          <button
            onClick={() => inserisciInIntervento(false)}
            disabled={importando}
            style={{
              marginLeft: isMobile ? 0 : 10,
              width: isMobile ? "100%" : "auto",
              marginBottom: isMobile ? 8 : 0,
              background: "#198754",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: 5,
              cursor: importando ? "not-allowed" : "pointer"
            }}
          >
            {importando ? "Inserimento..." : "📥 Inserisci materiali filtrati nell’intervento"}
          </button>

          {(interventoIdDaUrl || interventoSelezionato) && (
            <button
              onClick={tornaAllIntervento}
              style={{
                marginLeft: isMobile ? 0 : 10,
                width: isMobile ? "100%" : "auto",
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
          )}
        </div>
      )}
    </div>
  )
}