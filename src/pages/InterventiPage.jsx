import { useEffect, useRef, useState } from "react"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function InterventiPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 700 : false
  )
  const editIdDaUrl = searchParams.get("edit_id")
  const dataDaUrl = searchParams.get("data")

  const [clienti, setClienti] = useState([])
  const [cantieri, setCantieri] = useState([])
  const [operatoriDB, setOperatoriDB] = useState([])
  const [showClienti, setShowClienti] = useState(false)
  const [interventi, setInterventi] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [aperturaAutomaticaFatta, setAperturaAutomaticaFatta] = useState(false)
  const [clienteEvidenziato, setClienteEvidenziato] = useState(0)
  const [operatoriRicerca, setOperatoriRicerca] = useState([])
  const [showOperatori, setShowOperatori] = useState([])
  const [operatoreEvidenziato, setOperatoreEvidenziato] = useState([])

  const clienteInputRef = useRef(null)
  const cantiereSelectRef = useRef(null)
  const dataInputRef = useRef(null)
  const descrizioneInputRef = useRef(null)
  const operatoreInputRefs = useRef([])
  const oreInputRefs = useRef([])
  const salvaButtonRef = useRef(null)

  const [preferiti, setPreferiti] = useState([])
  const [searchMat, setSearchMat] = useState("")

  const [showAltroMat, setShowAltroMat] = useState(false)

  const [altroMat, setAltroMat] = useState({
    codice: "",
    descrizione: "",
    quantita: 1,
  })

  const formVuoto = {
    cliente_id: "",
    cliente_nome: "",
    cantiere_id: "",
    data: dataDaUrl || dayjs().format("YYYY-MM-DD"),
    descrizione: "",
    operatori: [],
    materiali: [],
  }

  const [form, setForm] = useState(formVuoto)

  // --- MODALITÀ VOCALE: Cliente -> Cantiere -> Descrizione -> Operatori -> Ore ---
  const [voceSupportata, setVoceSupportata] = useState(true)
  const [voceAttiva, setVoceAttiva] = useState(false)
  const [voceInAscolto, setVoceInAscolto] = useState(false)
  const [vocePasso, setVocePasso] = useState("cliente")
  const [voceMessaggio, setVoceMessaggio] = useState(
    'Premi “Avvia voce” e pronuncia il cliente.'
  )
  const [voceCandidato, setVoceCandidato] = useState(null)
  const [voceDescrizionePezzi, setVoceDescrizionePezzi] = useState([])
  const [voceOperatoreIndex, setVoceOperatoreIndex] = useState(0)

  const recognitionRef = useRef(null)
  const voceAttivaRef = useRef(false)
  const vocePassoRef = useRef("cliente")
  const voceCandidatoRef = useRef(null)
  const clientiRef = useRef([])
  const cantieriRef = useRef([])
  const formRef = useRef(form)
  const voceDescrizionePezziRef = useRef([])
  const voceDescrizioneBaseRef = useRef("")
  const voceOperatoreIndexRef = useRef(0)

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    clientiRef.current = clienti
  }, [clienti])

  useEffect(() => {
    cantieriRef.current = cantieri
  }, [cantieri])

  useEffect(() => {
    vocePassoRef.current = vocePasso
  }, [vocePasso])

  useEffect(() => {
    voceCandidatoRef.current = voceCandidato
  }, [voceCandidato])

  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    setVoceSupportata(Boolean(SpeechRecognition))
  }, [])

  function normalizzaVoce(valore) {
    return String(valore || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
  }

  function trovaMiglioreCorrispondenza(lista, testi, campo = "nome") {
    const candidati = (testi || [])
      .map((x) => normalizzaVoce(x))
      .filter(Boolean)

    if (!candidati.length) return null

    const righe = (lista || []).map((riga) => ({
      riga,
      normalizzato: normalizzaVoce(riga?.[campo]),
    }))

    // Prima scelta: deve coincidere con un nome realmente presente, ignorando spazi e segni.
    // Esempio: "borgoluce" trova "BORGO LUCE".
    for (const parlato of candidati) {
      const esatto = righe.find((x) => x.normalizzato === parlato)
      if (esatto) return esatto.riga
    }

    // Seconda scelta: accettiamo un prefisso solo se individua UN SOLO nome.
    // Così evitiamo di proporre clienti sbagliati quando la voce viene capita male.
    for (const parlato of candidati) {
      if (parlato.length < 4) continue
      const compatibili = righe.filter((x) =>
        x.normalizzato.startsWith(parlato) || parlato.startsWith(x.normalizzato)
      )
      if (compatibili.length === 1) return compatibili[0].riga
    }

    return null
  }

  function numeroDaVoce(frase) {
    const testo = String(frase || "").toLowerCase().trim().replace(",", ".")
    const diretto = Number(testo.replace(/[^0-9.]/g, ""))
    if (Number.isFinite(diretto) && diretto > 0) return diretto

    const parole = {
      mezzo: 0.5, mezza: 0.5, uno: 1, una: 1, due: 2, tre: 3, quattro: 4,
      cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
      undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15,
      sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20,
    }
    const tokens = testo.split(/\s+/).filter(Boolean)
    let totale = 0
    let trovato = false
    for (const token of tokens) {
      if (Object.prototype.hasOwnProperty.call(parole, token)) {
        totale += parole[token]
        trovato = true
      }
    }
    return trovato && totale > 0 ? totale : null
  }

  function preparaOperatoreVoce(index = null) {
    let target = index
    if (target == null) {
      const esistenteVuoto = formRef.current.operatori.findIndex((op) => !op.operatore_id)
      target = esistenteVuoto >= 0 ? esistenteVuoto : formRef.current.operatori.length
    }

    if (target >= formRef.current.operatori.length) {
      setForm((prev) => {
        const operatori = [...prev.operatori, { operatore_id: "", ore: "" }]
        formRef.current = { ...prev, operatori }
        return formRef.current
      })
      setOperatoriRicerca((prev) => {
        const nuovo = [...prev]
        nuovo[target] = ""
        return nuovo
      })
      setShowOperatori((prev) => {
        const nuovo = [...prev]
        nuovo[target] = false
        return nuovo
      })
      setOperatoreEvidenziato((prev) => {
        const nuovo = [...prev]
        nuovo[target] = 0
        return nuovo
      })
    }

    voceOperatoreIndexRef.current = target
    setVoceOperatoreIndex(target)
    impostaPassoVoce("operatore")
    setVoceMessaggio('Pronuncia il nome dell’operatore. Quando compare quello giusto, dì “OK”.')
  }

  function impostaPassoVoce(passo) {
    vocePassoRef.current = passo
    setVocePasso(passo)
    voceCandidatoRef.current = null
    setVoceCandidato(null)
  }

  function fermaVoce(messaggio = 'Modalità vocale in pausa.') {
    voceAttivaRef.current = false
    setVoceAttiva(false)
    setVoceInAscolto(false)
    setVoceMessaggio(messaggio)

    try {
      recognitionRef.current?.abort()
    } catch (_) {
      // niente
    }
    recognitionRef.current = null
  }

  function passaAScrittura() {
    if (voceAttivaRef.current) {
      fermaVoce('Voce in pausa. Ora puoi scrivere normalmente. Premi “Riprendi voce” per continuare.')
    }
  }

  async function gestisciRisultatoVoce(testi) {
    if (!voceAttivaRef.current) return

    const frase = String(testi?.[0] || "").trim()
    const comando = normalizzaVoce(frase)
    const passo = vocePassoRef.current
    const candidato = voceCandidatoRef.current
    const comandoOk = ["ok", "okay", "okey", "okei"].includes(comando)

    if (!frase) return

    if (["annulla", "stop", "ferma", "basta"].includes(comando)) {
      fermaVoce('Modalità vocale fermata.')
      return
    }

    if (comando === "ripeti") {
      voceCandidatoRef.current = null
      setVoceCandidato(null)
      setVoceMessaggio(
        passo === "cliente"
          ? 'Ripeti il nome del cliente.'
          : passo === "cantiere"
            ? 'Ripeti il cantiere.'
            : passo === "descrizione"
              ? 'Continua a dettare la descrizione.'
              : passo === "operatore"
                ? 'Ripeti il nome dell’operatore.'
                : passo === "ore"
                  ? 'Ripeti il numero di ore.'
                  : 'Dì “ALTRO OPERATORE” oppure “FINE OPERATORI”.'
      )
      return
    }

    if (comando === "cancella") {
      voceCandidatoRef.current = null
      setVoceCandidato(null)

      if (passo === "cliente") {
        setForm((prev) => ({
          ...prev,
          cliente_id: "",
          cliente_nome: "",
          cantiere_id: "",
        }))
        setCantieri([])
        cantieriRef.current = []
        setShowClienti(false)
        setVoceMessaggio('Cliente cancellato. Pronuncia di nuovo il nome del cliente.')
        return
      }

      if (passo === "cantiere") {
        setForm((prev) => ({ ...prev, cantiere_id: "" }))
        const elenco = cantieriRef.current.map((x) => x.nome).join(" · ")
        setVoceMessaggio(
          elenco
            ? `Cantiere cancellato. Possibilità: ${elenco}. Pronuncia il cantiere.`
            : 'Cantiere cancellato. Non risultano cantieri: dì “SALTA”.'
        )
        return
      }

      if (passo === "operatore") {
        const idx = voceOperatoreIndexRef.current
        setOperatoriRicerca((prev) => {
          const nuovo = [...prev]
          nuovo[idx] = ""
          return nuovo
        })
        setForm((prev) => ({
          ...prev,
          operatori: prev.operatori.map((op, i) =>
            i === idx ? { ...op, operatore_id: "", ore: "" } : op
          ),
        }))
        setVoceMessaggio('Operatore cancellato. Pronuncia di nuovo il nome dell’operatore.')
        return
      }

      if (passo === "ore") {
        const idx = voceOperatoreIndexRef.current
        setForm((prev) => ({
          ...prev,
          operatori: prev.operatori.map((op, i) =>
            i === idx ? { ...op, ore: "" } : op
          ),
        }))
        setVoceMessaggio('Ore cancellate. Pronuncia di nuovo il numero di ore.')
        return
      }

      if (passo === "dopoOperatore") {
        preparaOperatoreVoce(voceOperatoreIndexRef.current)
        return
      }

      const pezzi = [...voceDescrizionePezziRef.current]
      if (pezzi.length > 0) pezzi.pop()
      voceDescrizionePezziRef.current = pezzi
      setVoceDescrizionePezzi(pezzi)
      const testo = [voceDescrizioneBaseRef.current, ...pezzi]
        .filter(Boolean)
        .join(" ")
        .trim()
      setForm((prev) => ({ ...prev, descrizione: testo }))
      setVoceMessaggio(
        pezzi.length
          ? 'Ho cancellato solo l’ultima frase. Continua a dettare oppure dì “OK” quando hai finito.'
          : 'Ultima frase cancellata. Continua a dettare oppure dì “OK” quando hai finito.'
      )
      return
    }

    if (passo === "cliente") {
      if (comandoOk) {
        if (!candidato?.id) {
          setVoceMessaggio('Prima pronuncia il cliente, poi dì “OK”.')
          return
        }

        await selezionaCliente(candidato, false)
        impostaPassoVoce("cantiere")

        const disponibili = cantieriRef.current
        const elenco = disponibili.map((x) => x.nome).join(" · ")
        setVoceMessaggio(
          disponibili.length
            ? `Cliente confermato. Cantieri disponibili: ${elenco}. Pronuncia il cantiere.`
            : 'Cliente confermato. Non risultano cantieri: dì “SALTA” per passare alla descrizione.'
        )
        return
      }

      const trovato = trovaMiglioreCorrispondenza(clientiRef.current, testi)
      if (!trovato) {
        setForm((prev) => ({ ...prev, cliente_nome: "", cliente_id: "", cantiere_id: "" }))
        setShowClienti(false)
        setVoceMessaggio(
          `Ho sentito “${frase}”, ma non esiste un cliente corrispondente. Dì “CANCELLA” e ripeti il nome.`
        )
        return
      }

      setForm((prev) => ({
        ...prev,
        cliente_nome: trovato.nome,
        cliente_id: "",
        cantiere_id: "",
      }))
      setShowClienti(true)
      setClienteEvidenziato(0)
      voceCandidatoRef.current = trovato
      setVoceCandidato(trovato)
      setVoceMessaggio(`Cliente proposto: ${trovato.nome}. Dì “OK” per confermare.`)
      return
    }

    if (passo === "cantiere") {
      if (["salta", "nessuno", "avanti"].includes(comando)) {
        setForm((prev) => ({ ...prev, cantiere_id: "" }))
        voceDescrizioneBaseRef.current = formRef.current.descrizione || ""
        voceDescrizionePezziRef.current = []
        setVoceDescrizionePezzi([])
        impostaPassoVoce("descrizione")
        setVoceMessaggio('Cantiere saltato. Detta la descrizione dell’intervento a frasi. Dì “OK” solo quando hai finito.')
        return
      }

      if (comandoOk) {
        if (!candidato?.id) {
          if (!cantieriRef.current.length) {
            voceDescrizioneBaseRef.current = formRef.current.descrizione || ""
            voceDescrizionePezziRef.current = []
            setVoceDescrizionePezzi([])
            impostaPassoVoce("descrizione")
            setVoceMessaggio('Passiamo alla descrizione. Dettala a frasi e dì “OK” solo quando hai finito.')
            return
          }
          setVoceMessaggio('Prima pronuncia il cantiere, poi dì “OK”.')
          return
        }

        setForm((prev) => ({ ...prev, cantiere_id: candidato.id }))
        voceDescrizioneBaseRef.current = formRef.current.descrizione || ""
        voceDescrizionePezziRef.current = []
        setVoceDescrizionePezzi([])
        impostaPassoVoce("descrizione")
        setVoceMessaggio(`Cantiere ${candidato.nome} confermato. Detta la descrizione a frasi. Dì “OK” solo quando hai finito.`)
        return
      }

      const trovato = trovaMiglioreCorrispondenza(cantieriRef.current, testi)
      if (!trovato) {
        setVoceMessaggio(`Ho sentito “${frase}”, ma non trovo quel cantiere. Ripeti oppure dì “SALTA”.`)
        return
      }

      voceCandidatoRef.current = trovato
      setVoceCandidato(trovato)
      setVoceMessaggio(`Cantiere proposto: ${trovato.nome}. Dì “OK” per confermare.`)
      return
    }

    if (passo === "descrizione") {
      if (comandoOk) {
        const testoFinale = String(formRef.current.descrizione || "").trim()
        if (!testoFinale) {
          setVoceMessaggio('La descrizione è vuota. Detta almeno una frase, poi dì “OK”.')
          return
        }

        preparaOperatoreVoce()
        return
      }

      const pezzi = [...voceDescrizionePezziRef.current, frase]
      voceDescrizionePezziRef.current = pezzi
      setVoceDescrizionePezzi(pezzi)
      const testo = [voceDescrizioneBaseRef.current, ...pezzi]
        .filter(Boolean)
        .join(" ")
        .trim()
      setForm((prev) => ({ ...prev, descrizione: testo }))
      setVoceMessaggio(
        `Aggiunto: “${frase}”. Continua a dettare. Dì “CANCELLA” per togliere solo l’ultima frase oppure “OK” quando hai finito.`
      )
      return
    }

    if (passo === "operatore") {
      const idx = voceOperatoreIndexRef.current

      if (comandoOk) {
        if (!candidato?.id) {
          setVoceMessaggio('Prima pronuncia l’operatore, poi dì “OK”.')
          return
        }

        setForm((prev) => ({
          ...prev,
          operatori: prev.operatori.map((op, i) =>
            i === idx ? { ...op, operatore_id: candidato.id } : op
          ),
        }))
        setOperatoriRicerca((prev) => {
          const nuovo = [...prev]
          nuovo[idx] = candidato.nome
          return nuovo
        })
        impostaPassoVoce("ore")
        setVoceMessaggio(`Operatore ${candidato.nome} confermato. Pronuncia le ore, per esempio “otto” o “sette e mezzo”.`)
        return
      }

      const trovato = trovaMiglioreCorrispondenza(operatoriDB, testi)
      if (!trovato) {
        setVoceMessaggio(`Ho sentito “${frase}”, ma non trovo quell’operatore. Dì “CANCELLA” e ripeti il nome.`)
        return
      }

      voceCandidatoRef.current = trovato
      setVoceCandidato(trovato)
      setOperatoriRicerca((prev) => {
        const nuovo = [...prev]
        nuovo[idx] = trovato.nome
        return nuovo
      })
      setShowOperatori((prev) => {
        const nuovo = [...prev]
        nuovo[idx] = true
        return nuovo
      })
      setVoceMessaggio(`Operatore proposto: ${trovato.nome}. Dì “OK” per confermare.`)
      return
    }

    if (passo === "ore") {
      const idx = voceOperatoreIndexRef.current
      const ore = numeroDaVoce(frase)
      if (!ore) {
        setVoceMessaggio(`Non ho capito le ore da “${frase}”. Ripeti, per esempio “otto” oppure “sette e mezzo”.`)
        return
      }

      setForm((prev) => ({
        ...prev,
        operatori: prev.operatori.map((op, i) =>
          i === idx ? { ...op, ore } : op
        ),
      }))
      impostaPassoVoce("dopoOperatore")
      setVoceMessaggio(`Inserite ${ore} ore. Dì “ALTRO OPERATORE”, “FINE OPERATORI” oppure “ADESSO SALVA”.`)
      return
    }

    if (passo === "dopoOperatore") {
      if (["altrooperatore", "aggiungioperatore", "altro"].includes(comando)) {
        preparaOperatoreVoce(formRef.current.operatori.length)
        return
      }

      if (["fineoperatori", "fine", "finito", "bastaoperatori"].includes(comando)) {
        fermaVoce('Operatori completati. Puoi salvare l’intervento.')
        setTimeout(() => salvaButtonRef.current?.focus(), 100)
        return
      }

      if (["adessosalva", "salvaintervento", "salva"].includes(comando)) {
        fermaVoce('Salvo l’intervento.')
        setTimeout(() => { void salva() }, 150)
        return
      }

      setVoceMessaggio('Dì “ALTRO OPERATORE”, “FINE OPERATORI” oppure “ADESSO SALVA”.')
    }
  }

  function ascoltaVoce() {
    if (!voceAttivaRef.current || typeof window === "undefined") return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setVoceSupportata(false)
      fermaVoce('Questo browser non supporta il riconoscimento vocale.')
      return
    }

    try {
      recognitionRef.current?.abort()
    } catch (_) {
      // niente
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = "it-IT"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 5

    recognition.onstart = () => setVoceInAscolto(true)

    recognition.onresult = (event) => {
      const risultato = event.results?.[event.results.length - 1]
      const alternative = []
      if (risultato) {
        for (let i = 0; i < risultato.length; i += 1) {
          const testo = risultato[i]?.transcript?.trim()
          if (testo) alternative.push(testo)
        }
      }
      void gestisciRisultatoVoce(alternative)
    }

    recognition.onerror = (event) => {
      setVoceInAscolto(false)
      if (event.error === "aborted" || event.error === "no-speech") return

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        fermaVoce('Permesso microfono negato. Consenti il microfono al sito e riprova.')
        return
      }

      setVoceMessaggio(`Errore microfono: ${event.error}. Riprovo automaticamente.`)
    }

    recognition.onend = () => {
      setVoceInAscolto(false)
      recognitionRef.current = null
      if (voceAttivaRef.current) {
        setTimeout(() => ascoltaVoce(), 350)
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.error(err)
      setTimeout(() => {
        if (voceAttivaRef.current) ascoltaVoce()
      }, 500)
    }
  }

  function avviaVoce() {
    if (!voceSupportata) {
      alert('Il riconoscimento vocale non è disponibile in questo browser.')
      return
    }

    voceAttivaRef.current = true
    setVoceAttiva(true)

    if (!formRef.current.cliente_id) {
      impostaPassoVoce("cliente")
      setVoceMessaggio('Pronuncia il cliente. Quando compare quello giusto, dì “OK”.')
    } else if (!formRef.current.cantiere_id && cantieriRef.current.length) {
      impostaPassoVoce("cantiere")
      setVoceMessaggio('Pronuncia il cantiere. Quando è corretto, dì “OK”.')
    } else if (!String(formRef.current.descrizione || "").trim()) {
      voceDescrizioneBaseRef.current = formRef.current.descrizione || ""
      voceDescrizionePezziRef.current = []
      setVoceDescrizionePezzi([])
      impostaPassoVoce("descrizione")
      setVoceMessaggio('Detta la descrizione a frasi. Dì “OK” solo quando hai finito.')
    } else {
      preparaOperatoreVoce()
    }

    ascoltaVoce()
  }

  useEffect(() => {
    const aggiornaMobile = () => setIsMobile(window.innerWidth <= 700)
    aggiornaMobile()
    window.addEventListener("resize", aggiornaMobile)
    return () => window.removeEventListener("resize", aggiornaMobile)
  }, [])

  useEffect(() => {
    loadAll()
    caricaInterventi()
    caricaPreferiti()
  }, [])

  useEffect(() => {
    setTimeout(() => {
      clienteInputRef.current?.focus()
    }, 150)
  }, [])

  useEffect(() => {
    if (editIdDaUrl && !aperturaAutomaticaFatta) {
      setAperturaAutomaticaFatta(true)
      apriInterventoDaUrl(editIdDaUrl)
    }
  }, [editIdDaUrl, aperturaAutomaticaFatta])

  async function loadAll() {
    const { data: cli, error: cliError } = await supabase
      .from("clienti")
      .select("*")
      .eq("attivo", true)
      .order("nome")

    if (cliError) {
      console.error(cliError)
      alert("Errore caricamento clienti: " + cliError.message)
    }

    const { data: op, error: opError } = await supabase
      .from("operatori")
      .select("*")
      .order("nome")

    if (opError) {
      console.error(opError)
      alert("Errore caricamento operatori: " + opError.message)
    }

    setClienti(cli || [])
    setOperatoriDB(op || [])
  }

  async function caricaPreferiti() {
    const { data, error } = await supabase
      .from("articoli_preferiti")
      .select("*")
      .limit(500)

    if (error) {
      console.error(error)
      return
    }

    setPreferiti(data || [])
  }

  async function caricaInterventi() {
    const { data, error } = await supabase
      .from("interventi")
      .select(`
        *,
        clienti(nome),
        cantieri(nome),
        materiali_bollettino(id)
      `)
      .or("archiviato.is.null,archiviato.eq.false")
      .order("data", { ascending: false })

    if (error) {
      console.error(error)
      alert("Errore caricamento interventi: " + error.message)
      return
    }

    setInterventi(data || [])
  }

  async function apriInterventoDaUrl(id) {
    const { data, error } = await supabase
      .from("interventi")
      .select(`
        *,
        clienti(nome),
        cantieri(nome)
      `)
      .eq("id", id)
      .single()

    if (error) {
      console.error(error)
      alert("Errore apertura intervento: " + error.message)
      return
    }

    if (data) {
      modificaIntervento(data)
    }
  }

  function clientiFiltrati() {
    const testo = form.cliente_nome.trim()
    const testoNorm = normalizzaVoce(testo)
    if (!testoNorm) return []

    return clienti
      .filter((c) => normalizzaVoce(c.nome).includes(testoNorm))
      .slice(0, 8)
  }

  function gestisciTastieraCliente(e) {
    const lista = clientiFiltrati()

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!lista.length) return
      setShowClienti(true)
      setClienteEvidenziato((prev) =>
        prev >= lista.length - 1 ? 0 : prev + 1
      )
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!lista.length) return
      setShowClienti(true)
      setClienteEvidenziato((prev) =>
        prev <= 0 ? lista.length - 1 : prev - 1
      )
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      if (lista.length > 0) {
        selezionaCliente(lista[clienteEvidenziato] || lista[0], true)
      } else {
        cantiereSelectRef.current?.focus()
      }
    }
  }

  function gestisciTastieraCantiere(e) {
    if (e.key === "Enter") {
      e.preventDefault()
      dataInputRef.current?.focus()
    }
  }

  function gestisciTastieraData(e) {
    const dataBase = form.data ? dayjs(form.data) : dayjs()
    let nuovaData = null

    if (e.key === "ArrowLeft") {
      e.preventDefault()
      nuovaData = dataBase.subtract(1, "day")
    }

    if (e.key === "ArrowRight") {
      e.preventDefault()
      nuovaData = dataBase.add(1, "day")
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      nuovaData = dataBase.subtract(1, "month")
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      nuovaData = dataBase.add(1, "month")
    }

    if (e.key === "Enter") {
      e.preventDefault()
      descrizioneInputRef.current?.focus()
      return
    }

    if (nuovaData) {
      setForm((prev) => ({
        ...prev,
        data: nuovaData.format("YYYY-MM-DD"),
      }))
    }
  }

  function gestisciTastieraDescrizione(e) {
    if (e.key !== "Enter" && e.code !== "NumpadEnter") return

    e.preventDefault()
    e.stopPropagation()
    vaiAgliOperatori()
  }

  function vaiAgliOperatori() {
    const primoVuoto = form.operatori.findIndex((op) => !op.operatore_id)

    if (primoVuoto >= 0) {
      setTimeout(() => {
        operatoreInputRefs.current[primoVuoto]?.focus()
      }, 100)
      return
    }

    const nuovoIndex = form.operatori.length

    setForm((prev) => ({
      ...prev,
      operatori: [...prev.operatori, { operatore_id: "", ore: "" }],
    }))

    setOperatoriRicerca((prev) => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = ""
      return nuovo
    })

    setShowOperatori((prev) => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = false
      return nuovo
    })

    setOperatoreEvidenziato((prev) => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = 0
      return nuovo
    })

    setTimeout(() => {
      operatoreInputRefs.current[nuovoIndex]?.focus()
      operatoreInputRefs.current[nuovoIndex]?.select()
    }, 200)
  }

  function nomeOperatoreDaId(id) {
    return operatoriDB.find((op) => String(op.id) === String(id))?.nome || ""
  }

  function operatoriFiltrati(index) {
    const testo = (operatoriRicerca[index] || "").trim().toLowerCase()
    if (!testo) return []

    const inizioUguale = operatoriDB.filter((op) =>
      op.nome.toLowerCase().startsWith(testo)
    )

    const contieneTesto = operatoriDB.filter(
      (op) =>
        !op.nome.toLowerCase().startsWith(testo) &&
        op.nome.toLowerCase().includes(testo)
    )

    return [...inizioUguale, ...contieneTesto].slice(0, 8)
  }

  function aggiornaRicercaOperatore(index, valore) {
    setOperatoriRicerca((prev) => {
      const nuovo = [...prev]
      nuovo[index] = valore
      return nuovo
    })

    setShowOperatori((prev) => {
      const nuovo = [...prev]
      nuovo[index] = true
      return nuovo
    })

    setOperatoreEvidenziato((prev) => {
      const nuovo = [...prev]
      nuovo[index] = 0
      return nuovo
    })

    setForm((prev) => ({
      ...prev,
      operatori: prev.operatori.map((op, i) =>
        i === index ? { ...op, operatore_id: "" } : op
      ),
    }))
  }

  function selezionaOperatore(op, index, passaAlleOre = false) {
    setForm((prev) => ({
      ...prev,
      operatori: prev.operatori.map((riga, i) =>
        i === index ? { ...riga, operatore_id: op.id } : riga
      ),
    }))

    setOperatoriRicerca((prev) => {
      const nuovo = [...prev]
      nuovo[index] = op.nome
      return nuovo
    })

    setShowOperatori((prev) => {
      const nuovo = [...prev]
      nuovo[index] = false
      return nuovo
    })

    if (passaAlleOre) {
      setTimeout(() => {
        oreInputRefs.current[index]?.focus()
        oreInputRefs.current[index]?.select()
      }, 100)
    }
  }

  function gestisciTastieraOperatore(e, index) {
    const lista = operatoriFiltrati(index)
    const testo = (operatoriRicerca[index] || "").trim()

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!lista.length) return

      setShowOperatori((prev) => {
        const nuovo = [...prev]
        nuovo[index] = true
        return nuovo
      })

      setOperatoreEvidenziato((prev) => {
        const nuovo = [...prev]
        const attuale = nuovo[index] || 0
        nuovo[index] = attuale >= lista.length - 1 ? 0 : attuale + 1
        return nuovo
      })

      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!lista.length) return

      setShowOperatori((prev) => {
        const nuovo = [...prev]
        nuovo[index] = true
        return nuovo
      })

      setOperatoreEvidenziato((prev) => {
        const nuovo = [...prev]
        const attuale = nuovo[index] || 0
        nuovo[index] = attuale <= 0 ? lista.length - 1 : attuale - 1
        return nuovo
      })

      return
    }

    if (e.key === "Enter") {
      e.preventDefault()

      if (!testo && !form.operatori[index]?.operatore_id) {
        salvaButtonRef.current?.focus()
        return
      }

      if (lista.length > 0 && !form.operatori[index]?.operatore_id) {
        selezionaOperatore(
          lista[operatoreEvidenziato[index] || 0] || lista[0],
          index,
          true
        )
        return
      }

      if (form.operatori[index]?.operatore_id) {
        oreInputRefs.current[index]?.focus()
        oreInputRefs.current[index]?.select()
      }
    }
  }

  function gestisciTastieraOre(e, index) {
    if (e.key !== "Enter") return

    e.preventDefault()

    const ore = Number(form.operatori[index]?.ore || 0)

    if (ore > 0) {
      aggiungiOperatore(true)
    } else {
      salvaButtonRef.current?.focus()
    }
  }

  async function selezionaCliente(c, passaAlCampoDopo = false) {
    setForm((prev) => ({
      ...prev,
      cliente_id: c.id,
      cliente_nome: c.nome,
      cantiere_id: "",
    }))

    setShowClienti(false)

    const { data, error } = await supabase
      .from("cantieri")
      .select("*")
      .eq("cliente_id", c.id)
      .order("nome")

    if (error) {
      console.error(error)
      alert("Errore caricamento cantieri: " + error.message)
      return
    }

    cantieriRef.current = data || []
    setCantieri(data || [])

    if (passaAlCampoDopo) {
      setTimeout(() => {
        if ((data || []).length > 0) {
          cantiereSelectRef.current?.focus()
        } else {
          dataInputRef.current?.focus()
        }
      }, 100)
    }
  }

  function eliminaMateriale(index) {
    setForm((prev) => ({
      ...prev,
      materiali: prev.materiali.filter((_, i) => i !== index),
    }))
  }

  function aggiornaQuantitaMateriale(index, valore) {
    const quantita = Number(valore)

    setForm((prev) => ({
      ...prev,
      materiali: prev.materiali.map((m, i) =>
        i === index ? { ...m, quantita: quantita > 0 ? quantita : 1 } : m
      ),
    }))
  }

  async function ripristinaBolla(mat) {
    const conferma = confirm(
      "Vuoi ripristinare questa bolla?\n\nLa bolla tornerà disponibile nell’archivio bolle."
    )

    if (!conferma) return

    const descrizione = mat.descrizione || ""

    const ordineMatch = descrizione.match(/ORDINE\s+(.+?)\s+\|/)
    const ddtMatch = descrizione.match(/DDT\s+(.+?)\s+\|/)

    const numeroOrdine = ordineMatch?.[1]?.trim()
    const numeroDdt = ddtMatch?.[1]?.trim()

    if (!numeroOrdine || !numeroDdt) {
      alert("Non riesco a riconoscere ordine e DDT dalla riga bolla.")
      return
    }

    const { error } = await supabase
      .from("bolle_acquisto")
      .update({ usata: false })
      .eq("numero_ordine", numeroOrdine)
      .eq("numero_ddt", numeroDdt)

    if (error) {
      console.error(error)
      alert("Errore ripristino bolla: " + error.message)
      return
    }

    const { error: errorRiga } = await supabase
      .from("materiali_bollettino")
      .delete()
      .eq("id", mat.id)

    if (errorRiga) {
      console.error(errorRiga)
      alert("Bolla ripristinata, ma errore eliminazione riferimento: " + errorRiga.message)
      return
    }

    setForm((prev) => ({
      ...prev,
      materiali: prev.materiali.filter((m) => m.id !== mat.id),
    }))

    alert("✅ Bolla ripristinata e riferimento eliminato")
  }

  function aggiungiMaterialeManuale() {
    const codice = altroMat.codice.trim()
    const descrizione = altroMat.descrizione.trim()
    const quantita = Number(altroMat.quantita || 1)

    if (!codice && !descrizione) {
      alert("Inserisci almeno codice o descrizione")
      return
    }

    const esisteGia = form.materiali.some(
      (m) =>
        (codice && m.codice === codice) ||
        (!codice && descrizione && m.descrizione === descrizione)
    )

    if (esisteGia) {
      alert("Materiale già inserito")
      return
    }

    setForm((prev) => ({
      ...prev,
      materiali: [
        ...prev.materiali,
        {
          codice,
          descrizione,
          quantita: quantita > 0 ? quantita : 1,
        },
      ],
    }))

    setAltroMat({
      codice: "",
      descrizione: "",
      quantita: 1,
    })

    setShowAltroMat(false)
  }

  function aggiungiOperatore(focusNuovo = false) {
    const nuovoIndex = form.operatori.length

    setForm((prev) => ({
      ...prev,
      operatori: [...prev.operatori, { operatore_id: "", ore: "" }],
    }))

    setOperatoriRicerca((prev) => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = ""
      return nuovo
    })

    setShowOperatori((prev) => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = false
      return nuovo
    })

    setOperatoreEvidenziato((prev) => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = 0
      return nuovo
    })

    if (focusNuovo) {
      setTimeout(() => {
        operatoreInputRefs.current[nuovoIndex]?.focus()
      }, 120)
    }
  }

  function aggiornaOperatore(i, campo, valore) {
    setForm((prev) => ({
      ...prev,
      operatori: prev.operatori.map((op, index) =>
        index === i ? { ...op, [campo]: valore } : op
      ),
    }))
  }

  function eliminaOperatore(i) {
    setForm((prev) => ({
      ...prev,
      operatori: prev.operatori.filter((_, idx) => idx !== i),
    }))

    setOperatoriRicerca((prev) => prev.filter((_, idx) => idx !== i))
    setShowOperatori((prev) => prev.filter((_, idx) => idx !== i))
    setOperatoreEvidenziato((prev) => prev.filter((_, idx) => idx !== i))
  }

  function nuovoIntervento() {
    if (editingId) {
      const conferma = confirm(
        "Vuoi uscire da questo intervento e crearne uno nuovo?"
      )
      if (!conferma) return
    }

    setEditingId(null)
    setAperturaAutomaticaFatta(false)
    setForm({
      cliente_id: "",
      cliente_nome: "",
      cantiere_id: "",
      data: dataDaUrl || dayjs().format("YYYY-MM-DD"),
      descrizione: "",
      operatori: [],
      materiali: [],
    })
    setCantieri([])
    setOperatoriRicerca([])
    setShowOperatori([])
    setOperatoreEvidenziato([])
    setSearchMat("")
    setAltroMat({
      codice: "",
      descrizione: "",
      quantita: 1,
    })
    setShowAltroMat(false)

    if (dataDaUrl) {
      navigate(`/interventi?data=${dataDaUrl}`)
    } else {
      navigate("/interventi")
    }

    setTimeout(() => {
      clienteInputRef.current?.focus()
    }, 150)

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function modificaIntervento(i) {
    if (!i?.id) return

    setEditingId(i.id)

    const { data: ops, error: opsError } = await supabase
      .from("ore_operatori")
      .select(`
        *,
        operatori(nome)
      `)
      .eq("intervento_id", i.id)

    if (opsError) {
      console.error(opsError)
      alert("Errore caricamento operatori: " + opsError.message)
      return
    }

    const { data: mats, error: matsError } = await supabase
      .from("materiali_bollettino")
      .select("*")
      .eq("intervento_id", i.id)
      .order("id", { ascending: true })

    if (matsError) {
      console.error(matsError)
      alert("Errore caricamento materiali: " + matsError.message)
      return
    }

    const operatoriCaricati = (ops || []).map((o) => ({
      operatore_id: o.operatore_id,
      ore: o.ore,
    }))

    setForm({
      cliente_id: i.cliente_id || "",
      cliente_nome: i.clienti?.nome || "",
      cantiere_id: i.cantiere_id || "",
      data: i.data || dayjs().format("YYYY-MM-DD"),
      descrizione: i.descrizione || "",
      operatori: operatoriCaricati,
      materiali: (mats || []).map((m) => ({
        id: m.id,
        codice: m.codice || "",
        descrizione: m.descrizione || "",
        quantita: m.codice === "BOLLA" ? 0 : m.quantita || 1,
      })),
    })

    setOperatoriRicerca(
      (ops || []).map((o) => o.operatori?.nome || nomeOperatoreDaId(o.operatore_id))
    )
    setShowOperatori(operatoriCaricati.map(() => false))
    setOperatoreEvidenziato(operatoriCaricati.map(() => 0))

    setAltroMat({
      codice: "",
      descrizione: "",
      quantita: 1,
    })

    setShowAltroMat(false)

    if (i.cliente_id) {
      const { data, error } = await supabase
        .from("cantieri")
        .select("*")
        .eq("cliente_id", i.cliente_id)
        .order("nome")

      if (error) {
        console.error(error)
        alert("Errore caricamento cantieri: " + error.message)
        return
      }

      setCantieri(data || [])
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function archiviaIntervento(i) {
    if (!i?.id) return
    if (!confirm("Archiviare questo intervento?")) return

    const { error } = await supabase
      .from("interventi")
      .update({ archiviato: true })
      .eq("id", i.id)

    if (error) {
      console.error(error)
      alert("Errore archiviazione: " + error.message)
      return
    }

    if (editingId === i.id) {
      nuovoIntervento()
    }

    caricaInterventi()
  }

  async function eliminaIntervento(i) {
    if (!i?.id) return
    if (!confirm("Eliminare intervento?")) return

    const conferma2 = confirm(
      "Sei sicuro? Verranno eliminate anche ore operatori e materiali."
    )
    if (!conferma2) return

    await supabase.from("ore_operatori").delete().eq("intervento_id", i.id)
    await supabase.from("materiali_bollettino").delete().eq("intervento_id", i.id)

    const { error } = await supabase.from("interventi").delete().eq("id", i.id)

    if (error) {
      console.error(error)
      alert("Errore eliminazione intervento: " + error.message)
      return
    }

    alert("✅ Intervento eliminato")
    caricaInterventi()
  }

  function vaiABolle() {
    if (!editingId) {
      alert(
        "Prima salva l'intervento. Dopo il salvataggio potrai importare la bolla direttamente qui."
      )
      return
    }

    navigate(`/bolle?intervento_id=${editingId}`)
  }

  function vaiACarrelli() {
    if (!editingId) {
      alert(
        "Prima salva l'intervento. Dopo il salvataggio potrai importare il carrello direttamente qui."
      )
      return
    }

    navigate(`/carrelli?intervento_id=${editingId}`)
  }

  function vaiAPreferiti() {
    if (!editingId) {
      alert(
        "Prima salva l'intervento. Dopo il salvataggio potrai importare i preferiti direttamente qui."
      )
      return
    }

    navigate(`/preferiti?intervento_id=${editingId}`)
  }

  async function salva() {
    if (saving) return

    if (!form.cliente_id) {
      alert("Cliente mancante")
      return
    }

    if (!form.descrizione.trim()) {
      alert("Descrizione mancante")
      return
    }

    setSaving(true)

    let int = null

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from("interventi")
          .update({
            cliente_id: form.cliente_id,
            cantiere_id: form.cantiere_id || null,
            data: form.data,
            descrizione: form.descrizione.trim(),
            archiviato: false,
          })
          .eq("id", editingId)

        if (updateError) {
          console.error(updateError)
          alert("Errore aggiornamento intervento: " + updateError.message)
          return
        }

        int = { id: editingId }

        await supabase.from("ore_operatori").delete().eq("intervento_id", editingId)
        await supabase
          .from("materiali_bollettino")
          .delete()
          .eq("intervento_id", editingId)
      } else {
        const { data, error: insertError } = await supabase
          .from("interventi")
          .insert([
            {
              cliente_id: form.cliente_id,
              cantiere_id: form.cantiere_id || null,
              data: form.data,
              descrizione: form.descrizione.trim(),
              archiviato: false,
            },
          ])
          .select()
          .single()

        if (insertError) {
          console.error(insertError)
          alert("Errore salvataggio intervento: " + insertError.message)
          return
        }

        int = data
      }

      const ops = form.operatori
        .filter((o) => o.operatore_id && Number(o.ore || 0) > 0)
        .map((o) => ({
          intervento_id: int.id,
          operatore_id: o.operatore_id,
          ore: Number(o.ore || 0),
        }))

      if (ops.length) {
        const { error } = await supabase.from("ore_operatori").insert(ops)
        if (error) {
          alert("Errore salvataggio operatori: " + error.message)
          return
        }
      }

      const mats = form.materiali
        .filter((m) => m.codice || m.descrizione)
        .map((m) => ({
          intervento_id: int.id,
          codice: m.codice || "",
          descrizione: m.descrizione || "",
          quantita:
            m.codice === "BOLLA"
              ? 0
              : Number(m.quantita || 1) > 0
                ? Number(m.quantita || 1)
                : 1,
        }))

      if (mats.length) {
        const { error } = await supabase.from("materiali_bollettino").insert(mats)
        if (error) {
          alert("Errore salvataggio materiali: " + error.message)
          return
        }
      }

      setEditingId(int.id)

      alert(
        editingId
          ? "✅ Intervento aggiornato"
          : "✅ Intervento salvato. Ora puoi importare bolle, carrelli o preferiti dentro questo intervento."
      )

      caricaInterventi()
      navigate(`/interventi?edit_id=${int.id}`)
    } catch (err) {
      console.error(err)
      alert("Errore imprevisto durante il salvataggio")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={isMobile ? pageMobile : page}>
      <h2 style={isMobile ? { marginTop: 0, fontSize: 22 } : { marginTop: 0 }}>Interventi</h2>

      <div style={isMobile ? layoutMobile : layout}>
        <div style={mainColumn}>
          {editingId && (
            <div style={editingBox}>
              ✏️ INTERVENTO IN MODIFICA / APERTO: #{editingId}
              <div style={{ fontWeight: "normal", marginTop: 4 }}>
                Puoi aggiornare i dati oppure importare bolle, carrelli e
                preferiti direttamente in questo intervento.
              </div>
            </div>
          )}

          <div style={isMobile ? sectionMobile : section}>
            <h3 style={sectionTitle}>Dati intervento</h3>

            <div style={voiceBox}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={voiceTitle}>🎤 PROVA MODALITÀ VOCALE</div>
                <div style={voiceStatus}>
                  {voceMessaggio}
                </div>
                {voceAttiva && (
                  <div style={voiceStep}>
                    Passo: {vocePasso === "cliente"
                      ? "CLIENTE"
                      : vocePasso === "cantiere"
                        ? "CANTIERE"
                        : vocePasso === "descrizione"
                          ? "DESCRIZIONE"
                          : vocePasso === "operatore"
                            ? `OPERATORE ${voceOperatoreIndex + 1}`
                            : vocePasso === "ore"
                              ? `ORE OPERATORE ${voceOperatoreIndex + 1}`
                              : "OPERATORI"}
                    {voceInAscolto ? " · 🎙️ ASCOLTO" : " · attendo microfono"}
                  </div>
                )}
                {voceAttiva && vocePasso === "cantiere" && cantieri.length > 0 && (
                  <div style={voiceOptions}>
                    <b>Cantieri disponibili:</b> {cantieri.map((c) => c.nome).join(" · ")}
                  </div>
                )}
                {!voceSupportata && (
                  <div style={voiceError}>
                    Riconoscimento vocale non disponibile in questo browser.
                  </div>
                )}
              </div>

              {!voceAttiva ? (
                <button
                  type="button"
                  onClick={avviaVoce}
                  disabled={!voceSupportata}
                  style={voceSupportata ? voiceButton : voiceButtonDisabled}
                >
                  🎤 {voceMessaggio.includes("pausa") ? "Riprendi voce" : "Avvia voce"}
                </button>
              ) : (
                <button type="button" onClick={() => fermaVoce()} style={voiceStopButton}>
                  ⏸ Pausa voce
                </button>
              )}
            </div>

            <div style={{ position: "relative" }}>
              <input
                ref={clienteInputRef}
                placeholder="Cerca cliente..."
                value={form.cliente_nome}
                onChange={(e) => {
                  setForm({
                    ...form,
                    cliente_nome: e.target.value,
                    cliente_id: "",
                    cantiere_id: "",
                  })
                  setCantieri([])
                  setShowClienti(true)
                  setClienteEvidenziato(0)
                }}
                onFocus={() => setShowClienti(true)}
                onPointerDown={passaAScrittura}
                onKeyDown={gestisciTastieraCliente}
                onBlur={() => setTimeout(() => setShowClienti(false), 200)}
                style={inputFull}
              />

              {showClienti && form.cliente_nome && (
                <div style={suggestBox}>
                  {clientiFiltrati().map((c, index) => (
                    <div
                      key={c.id}
                      onMouseEnter={() => setClienteEvidenziato(index)}
                      onClick={() => selezionaCliente(c, true)}
                      style={{
                        padding: 8,
                        cursor: "pointer",
                        background:
                          clienteEvidenziato === index ? "#dbeafe" : "white",
                        fontWeight:
                          clienteEvidenziato === index ? "bold" : "normal",
                      }}
                    >
                      {c.nome}
                    </div>
                  ))}

                  {clientiFiltrati().length === 0 && (
                    <div style={{ padding: 5, color: "#777" }}>
                      Nessun cliente trovato
                    </div>
                  )}
                </div>
              )}
            </div>

            <select
              ref={cantiereSelectRef}
              value={form.cantiere_id}
              onChange={(e) => setForm({ ...form, cantiere_id: e.target.value })}
              onPointerDown={passaAScrittura}
              onKeyDown={gestisciTastieraCantiere}
              style={inputFull}
            >
              <option value="">Seleziona cantiere</option>
              {cantieri.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <input
              ref={dataInputRef}
              type="date"
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              onPointerDown={passaAScrittura}
              onKeyDown={gestisciTastieraData}
              style={inputFull}
            />

            <textarea
              ref={descrizioneInputRef}
              placeholder="Descrizione"
              value={form.descrizione}
              onChange={(e) =>
                setForm({ ...form, descrizione: e.target.value })
              }
              onPointerDown={passaAScrittura}
              style={descriptionInput}
              rows={5}
            />
          </div>

          <div style={isMobile ? sectionMobile : section}>
            <h3 style={sectionTitle}>Operatori</h3>

            {form.operatori.map((op, i) => (
              <div key={i} style={isMobile ? operatorRowMobile : operatorRow}>
                <div style={isMobile ? { position: "relative", minWidth: 0, flex: 1 } : { position: "relative", minWidth: 240, flex: 1 }}>
                  <input
                    ref={(el) => (operatoreInputRefs.current[i] = el)}
                    placeholder="Cerca operatore..."
                    value={operatoriRicerca[i] ?? nomeOperatoreDaId(op.operatore_id)}
                    onChange={(e) => aggiornaRicercaOperatore(i, e.target.value)}
                    onFocus={() => {
                      setShowOperatori((prev) => {
                        const nuovo = [...prev]
                        nuovo[i] = true
                        return nuovo
                      })
                    }}
                    onPointerDown={passaAScrittura}
                    onKeyDown={(e) => gestisciTastieraOperatore(e, i)}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowOperatori((prev) => {
                          const nuovo = [...prev]
                          nuovo[i] = false
                          return nuovo
                        })
                      }, 200)
                    }}
                    style={inputFull}
                  />

                  {showOperatori[i] && operatoriRicerca[i] && (
                    <div style={suggestBox}>
                      {operatoriFiltrati(i).map((operatore, index) => (
                        <div
                          key={operatore.id}
                          onMouseEnter={() => {
                            setOperatoreEvidenziato((prev) => {
                              const nuovo = [...prev]
                              nuovo[i] = index
                              return nuovo
                            })
                          }}
                          onClick={() => selezionaOperatore(operatore, i, true)}
                          style={{
                            padding: 8,
                            cursor: "pointer",
                            background:
                              (operatoreEvidenziato[i] || 0) === index
                                ? "#dbeafe"
                                : "white",
                            fontWeight:
                              (operatoreEvidenziato[i] || 0) === index
                                ? "bold"
                                : "normal",
                          }}
                        >
                          {operatore.nome}
                        </div>
                      ))}

                      {operatoriFiltrati(i).length === 0 && (
                        <div style={{ padding: 5, color: "#777" }}>
                          Nessun operatore trovato
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <input
                  ref={(el) => (oreInputRefs.current[i] = el)}
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Ore"
                  value={op.ore}
                  onChange={(e) => aggiornaOperatore(i, "ore", e.target.value)}
                  onPointerDown={passaAScrittura}
                  onKeyDown={(e) => gestisciTastieraOre(e, i)}
                  style={isMobile ? { ...inputFull, width: 74, flex: "0 0 74px", marginBottom: 0, textAlign: "center" } : { ...inputFull, width: 90 }}
                />

                <button onClick={() => eliminaOperatore(i)} style={dangerSmall}>
                  ❌
                </button>
              </div>
            ))}

            <button onClick={() => aggiungiOperatore(true)} style={secondaryButton}>
              ➕ Operatore
            </button>
          </div>

          <div style={isMobile ? sectionMobile : section}>
            <div style={isMobile ? materialHeaderMobile : materialHeader}>
              <h3 style={sectionTitle}>📦 Materiali inseriti</h3>

              {!showAltroMat && (
                <button onClick={() => setShowAltroMat(true)} style={secondaryButton}>
                  ➕ Materiale libero
                </button>
              )}

              {showAltroMat && (
                <button
                  onClick={() => {
                    setShowAltroMat(false)
                    setAltroMat({
                      codice: "",
                      descrizione: "",
                      quantita: 1,
                    })
                  }}
                  style={secondaryButton}
                >
                  ❌ Chiudi
                </button>
              )}
            </div>

            {showAltroMat && (
              <div style={isMobile ? manualMaterialBoxMobile : manualMaterialBox}>
                <input
                  placeholder="Codice"
                  value={altroMat.codice}
                  onChange={(e) =>
                    setAltroMat((prev) => ({ ...prev, codice: e.target.value }))
                  }
                  style={isMobile ? inputFull : { ...inputFull, minWidth: 120 }}
                />

                <input
                  placeholder="Descrizione"
                  value={altroMat.descrizione}
                  onChange={(e) =>
                    setAltroMat((prev) => ({
                      ...prev,
                      descrizione: e.target.value,
                    }))
                  }
                  style={isMobile ? inputFull : { ...inputFull, minWidth: 260, flex: 1 }}
                />

                <input
                  type="number"
                  min="1"
                  placeholder="Qta"
                  value={altroMat.quantita}
                  onChange={(e) =>
                    setAltroMat((prev) => ({
                      ...prev,
                      quantita: e.target.value,
                    }))
                  }
                  style={isMobile ? inputFull : { ...inputFull, width: 80 }}
                />

                <button onClick={aggiungiMaterialeManuale} style={secondaryButton}>
                  ➕ Altro
                </button>
              </div>
            )}

            {form.materiali.length === 0 && (
              <div style={emptyBox}>Nessun materiale inserito.</div>
            )}

            {form.materiali.map((m, i) => {
              if (m.codice === "BOLLA") {
                return (
                  <div key={i} style={isMobile ? bollaBoxMobile : bollaBox}>
                    <div>{m.descrizione}</div>

                    <button
                      type="button"
                      onClick={() => ripristinaBolla(m)}
                      style={warningButton}
                    >
                      ↩ Ripristina bolla
                    </button>
                  </div>
                )
              }

              return (
                <div key={i} style={isMobile ? materialRowMobile : materialRow}>
                  <div style={{ flex: 1 }}>
                    {m.codice || "-"} — {m.descrizione || "-"}
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={m.quantita}
                    onChange={(e) => aggiornaQuantitaMateriale(i, e.target.value)}
                    style={isMobile ? { ...inputFull, width: 90, marginBottom: 0 } : { ...inputFull, width: 70 }}
                  />

                  <button onClick={() => eliminaMateriale(i)} style={dangerSmall}>
                    ❌
                  </button>
                </div>
              )
            })}
          </div>

          <div style={isMobile ? sectionMobile : section}>
            <h3 style={sectionTitle}>📋 Interventi salvati</h3>

            {interventi.length === 0 && (
              <div style={emptyBox}>Nessun intervento salvato.</div>
            )}

            {interventi.map((i) => (
              <div
                key={i.id}
                style={{
                  ...(isMobile ? savedCardMobile : savedCard),
                  border:
                    editingId === i.id ? "2px solid orange" : "1px solid #ccc",
                  background: editingId === i.id ? "#fffaf0" : "white",
                }}
              >
                <div>
                  <b>{i.data ? dayjs(i.data).format("DD/MM/YYYY") : "-"}</b>
                </div>
                <div>
                  <b>Cliente:</b> {i.clienti?.nome || "-"}
                </div>
                <div>
                  <b>Cantiere:</b> {i.cantieri?.nome || "-"}
                </div>
                <div>
                  <b>Descrizione:</b> {i.descrizione || "-"}
                </div>
                <div>
                  <b>Materiali:</b> {i.materiali_bollettino?.length || 0}
                </div>

                <div style={isMobile ? savedButtonsMobile : savedButtons}>
                  <button onClick={() => navigate(`/bollettino/${i.id}`)}>
                    👁 Apri
                  </button>

                  <button onClick={() => modificaIntervento(i)}>✏️ Modifica</button>

                  <button onClick={() => navigate(`/bolle?intervento_id=${i.id}`)}>
                    📦 Bolla
                  </button>

                  <button
                    onClick={() => navigate(`/carrelli?intervento_id=${i.id}`)}
                  >
                    📥 Carrello
                  </button>

                  <button
                    onClick={() => navigate(`/preferiti?intervento_id=${i.id}`)}
                  >
                    ⭐ Preferiti
                  </button>

                  <button
                    onClick={() => archiviaIntervento(i)}
                    style={{ background: "#ff9800", color: "white" }}
                  >
                    📦 Archivia
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
        </div>

        <div style={isMobile ? sideColumnMobile : sideColumn}>
          <h3 style={{ marginTop: 0 }}>Comandi</h3>

          <button
            ref={salvaButtonRef}
            onClick={salva}
            disabled={saving}
            style={{
              ...sideButton,
              background: editingId ? "#0d6efd" : "#198754",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving
              ? "Salvataggio..."
              : editingId
                ? "💾 Aggiorna"
                : "💾 Salva"}
          </button>

          <button onClick={nuovoIntervento} style={sideButtonLight}>
            🧹 Nuovo
          </button>

          <button onClick={() => navigate("/")} style={sideButtonLight}>
            📅 Calendario
          </button>

          <button onClick={() => navigate("/clienti")} style={sideButtonLight}>
            ➕ Aggiungi cliente
          </button>

          <button onClick={vaiABolle} style={sideButton}>
            📦 Bolla
          </button>

          <button onClick={vaiACarrelli} style={sideButton}>
            📥 Carrello
          </button>

          <button onClick={vaiAPreferiti} style={sideButton}>
            ⭐ Preferiti
          </button>

          {editingId && (
            <button
              onClick={() => navigate(`/bollettino/${editingId}`)}
              style={sideButtonLight}
            >
              👁 Bollettino
            </button>
          )}

          {!editingId && (
            <div style={infoBox}>
              Prima salva l’intervento. Dopo il salvataggio potrai importare
              bolla, carrello o preferiti.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const voiceBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 12,
  padding: 10,
  border: "1px solid #b9d5ff",
  borderRadius: 9,
  background: "#f3f8ff",
}

const voiceTitle = {
  fontWeight: "bold",
  color: "#0d6efd",
  marginBottom: 3,
}

const voiceStatus = {
  fontSize: 14,
  lineHeight: 1.35,
  overflowWrap: "anywhere",
}

const voiceStep = {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "bold",
  color: "#198754",
}

const voiceOptions = {
  marginTop: 7,
  padding: "7px 9px",
  borderRadius: 7,
  background: "#fff",
  border: "1px solid #cfe0ff",
  fontSize: 13,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
}

const voiceError = {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "bold",
  color: "#b42318",
}

const voiceButton = {
  minHeight: 44,
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  background: "#0d6efd",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  whiteSpace: "nowrap",
}

const voiceButtonDisabled = {
  ...voiceButton,
  background: "#adb5bd",
  cursor: "not-allowed",
}

const voiceStopButton = {
  ...voiceButton,
  background: "#6c757d",
}

const page = {
  padding: 12,
  maxWidth: 1600,
  margin: "0 auto",
  boxSizing: "border-box",
}

const pageMobile = {
  padding: 8,
  width: "100%",
  maxWidth: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
  overflowX: "hidden",
}

const layoutMobile = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  width: "100%",
}

const sectionMobile = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 9,
  marginBottom: 10,
  width: "100%",
  boxSizing: "border-box",
}

const operatorRowMobile = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginBottom: 10,
  flexWrap: "nowrap",
  width: "100%",
}

const materialHeaderMobile = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 8,
}

const manualMaterialBoxMobile = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "stretch",
  border: "1px solid #ddd",
  padding: 8,
  borderRadius: 6,
  background: "#f8f9fa",
  width: "100%",
  boxSizing: "border-box",
}

const bollaBoxMobile = {
  marginTop: 10,
  padding: 10,
  background: "#eef4ff",
  border: "2px solid #0d6efd",
  borderRadius: 8,
  fontWeight: "bold",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 10,
  overflowWrap: "anywhere",
}

const materialRowMobile = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  borderBottom: "1px solid #eee",
  padding: "8px 0",
  overflowWrap: "anywhere",
}

const savedCardMobile = {
  padding: 10,
  marginTop: 8,
  borderRadius: 6,
  overflowWrap: "anywhere",
}

const savedButtonsMobile = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
}

const sideColumnMobile = {
  position: "static",
  order: -1,
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  border: "2px solid #1976d2",
  borderRadius: 12,
  padding: 10,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
}

const layout = {
  display: "grid",
  gridTemplateColumns: "1fr 210px",
  gap: 16,
  alignItems: "start",
}

const mainColumn = {
  minWidth: 0,
}

const sideColumn = {
  position: "sticky",
  top: 10,
  background: "#fff",
  border: "2px solid #1976d2",
  borderRadius: 12,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 10,
}

const section = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: 12,
  marginBottom: 12,
}

const sectionTitle = {
  marginTop: 0,
  marginBottom: 10,
}

const editingBox = {
  background: "#fff3cd",
  color: "#856404",
  border: "1px solid #ffeeba",
  padding: 10,
  marginBottom: 10,
  borderRadius: 6,
  fontWeight: "bold",
}

const descriptionInput = {
  width: "100%",
  minHeight: 120,
  padding: 9,
  boxSizing: "border-box",
  borderRadius: 6,
  border: "1px solid #ccc",
  marginBottom: 8,
  resize: "vertical",
  fontFamily: "inherit",
  fontSize: 15,
  lineHeight: 1.4,
}

const inputFull = {
  width: "100%",
  padding: 9,
  boxSizing: "border-box",
  borderRadius: 6,
  border: "1px solid #ccc",
  marginBottom: 8,
}

const suggestBox = {
  border: "1px solid #ccc",
  position: "absolute",
  background: "white",
  width: "100%",
  zIndex: 50,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
}

const operatorRow = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginBottom: 8,
  flexWrap: "wrap",
}

const materialHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
}

const manualMaterialBox = {
  marginTop: 8,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  border: "1px solid #ddd",
  padding: 8,
  borderRadius: 6,
  background: "#f8f9fa",
}

const emptyBox = {
  marginTop: 10,
  padding: 10,
  border: "1px solid #eee",
  background: "#fafafa",
  borderRadius: 6,
}

const bollaBox = {
  marginTop: 10,
  padding: 12,
  background: "#eef4ff",
  border: "2px solid #0d6efd",
  borderRadius: 8,
  fontWeight: "bold",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
}

const materialRow = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  borderBottom: "1px solid #eee",
  padding: "6px 0",
}

const savedCard = {
  padding: 12,
  marginTop: 8,
  borderRadius: 6,
}

const savedButtons = {
  marginTop: 10,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
}

const sideButton = {
  background: "#1976d2",
  color: "white",
  border: "none",
  padding: "12px 14px",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
}

const sideButtonLight = {
  background: "#f5f5f5",
  color: "#111",
  border: "1px solid #ccc",
  padding: "12px 14px",
  borderRadius: 8,
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
}

const secondaryButton = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ccc",
  cursor: "pointer",
  fontWeight: "bold",
}

const warningButton = {
  background: "#ffc107",
  border: "none",
  padding: "7px 12px",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: "bold",
}

const dangerSmall = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
  cursor: "pointer",
}

const infoBox = {
  background: "#f8f9fa",
  border: "1px solid #ddd",
  padding: 10,
  borderRadius: 8,
  fontSize: 13,
}