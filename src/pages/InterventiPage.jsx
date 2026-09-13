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
  const materialiSectionRef = useRef(null)

  const [preferiti, setPreferiti] = useState([])
  const [preferitiDescrizione, setPreferitiDescrizione] = useState([])
  const [searchMat, setSearchMat] = useState("")
  const [showPreferitiMat, setShowPreferitiMat] = useState(false)
  const [preferitiLoading, setPreferitiLoading] = useState(false)
  const [preferitiTipo, setPreferitiTipo] = useState("bolle")
  const [preferitiDataDa, setPreferitiDataDa] = useState(
    dayjs().subtract(2, "day").format("YYYY-MM-DD")
  )
  const [preferitiDataA, setPreferitiDataA] = useState(dayjs().format("YYYY-MM-DD"))
  const [descFiltro1, setDescFiltro1] = useState("")
  const [descFiltro2, setDescFiltro2] = useState("")
  const [descFiltro3, setDescFiltro3] = useState("")
  const [descFiltro4, setDescFiltro4] = useState("")
  const [suggerimentiFonti, setSuggerimentiFonti] = useState([])
  const [fonteFiltro1, setFonteFiltro1] = useState("")
  const [fonteFiltro2, setFonteFiltro2] = useState("")
  const [fonteFiltro3, setFonteFiltro3] = useState("")
  const [fonteFiltro4, setFonteFiltro4] = useState("")
  const [rigenerandoPreferiti, setRigenerandoPreferiti] = useState(false)
  const [materialiSelezionati, setMaterialiSelezionati] = useState([])
  const [inserendoMateriali, setInserendoMateriali] = useState(false)

  const [showAltroMat, setShowAltroMat] = useState(false)
  const [interventoAppenaSalvato, setInterventoAppenaSalvato] = useState(false)

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
    setVoceMessaggio('Pronuncia il nome dell’operatore, oppure dì “SALVA” se hai finito. Quando compare quello giusto, dì “OK”.')
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

  // Cliente e operatore sono speciali: durante la modalità vocale puoi toccare il campo,
  // scrivere a mano e poi dire OK senza interrompere il flusso vocale.
  function scritturaClienteConVoce() {
    if (!voceAttivaRef.current) return
    voceCandidatoRef.current = null
    setVoceCandidato(null)
    setVoceMessaggio('Scrivi il cliente. Scegli dalla tendina se serve, poi dì “OK”.')
  }

  function scritturaOperatoreConVoce(index) {
    if (!voceAttivaRef.current) return
    voceOperatoreIndexRef.current = index
    setVoceOperatoreIndex(index)
    voceCandidatoRef.current = null
    setVoceCandidato(null)
    setVoceMessaggio('Scrivi l’operatore. Scegli dalla tendina se serve, poi dì “OK”.')
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
        // Se il cliente è già stato scelto dalla tendina, confermiamo quello.
        if (formRef.current.cliente_id) {
          impostaPassoVoce("cantiere")
          const disponibili = cantieriRef.current
          const elenco = disponibili.map((x) => x.nome).join(" · ")
          setVoceMessaggio(
            disponibili.length
              ? `Cliente confermato. Cantieri disponibili: ${elenco}. Pronuncia il cantiere e poi dì “OK”.`
              : 'Cliente confermato. Non risultano cantieri: dì “SALTA” per passare alla descrizione.'
          )
          return
        }

        // Se l'utente ha scritto manualmente il nome, proviamo una corrispondenza esatta.
        const scritto = normalizzaVoce(formRef.current.cliente_nome)
        const esatto = clientiRef.current.find((x) => normalizzaVoce(x.nome) === scritto)
        const daConfermare = esatto || candidato
        if (!daConfermare?.id) {
          setShowClienti(true)
          setVoceMessaggio('Scegli il cliente corretto dalla tendina, oppure completa il nome e poi dì “OK”.')
          return
        }

        await selezionaCliente(daConfermare, false)
        impostaPassoVoce("cantiere")
        const disponibili = cantieriRef.current
        const elenco = disponibili.map((x) => x.nome).join(" · ")
        setVoceMessaggio(
          disponibili.length
            ? `Cliente confermato. Cantieri disponibili: ${elenco}. Pronuncia il cantiere e poi dì “OK”.`
            : 'Cliente confermato. Non risultano cantieri: dì “SALTA” per passare alla descrizione.'
        )
        return
      }

      // La voce diventa una ricerca: mostriamo tutte le possibilità nella tendina.
      setForm((prev) => {
        const prossimo = {
          ...prev,
          cliente_nome: frase,
          cliente_id: "",
          cantiere_id: "",
        }
        formRef.current = prossimo
        return prossimo
      })
      setCantieri([])
      cantieriRef.current = []
      setShowClienti(true)
      setClienteEvidenziato(0)

      const trovato = trovaMiglioreCorrispondenza(clientiRef.current, testi)
      voceCandidatoRef.current = trovato
      setVoceCandidato(trovato)
      setVoceMessaggio(
        trovato
          ? `Ho trovato ${trovato.nome}. Puoi cliccare la scelta giusta nella tendina oppure dire “OK”.`
          : `Cerco “${frase}”. Scegli il cliente corretto nella tendina. Se non va bene, dì “CANCELLA” e ripeti.`
      )
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

      // Quando siamo pronti per un nuovo operatore, "SALVA" termina direttamente l'intervento.
      if (["salva", "adessosalva", "salvaintervento"].includes(comando)) {
        fermaVoce('Salvo l’intervento.')
        setTimeout(() => { void salva() }, 150)
        return
      }

      if (comandoOk) {
        const operatoreGiaScelto = formRef.current.operatori[idx]?.operatore_id
        if (operatoreGiaScelto) {
          impostaPassoVoce("ore")
          setVoceMessaggio('Operatore confermato. Pronuncia le ore e poi dì “OK”.')
          return
        }

        const scritto = normalizzaVoce(operatoriRicerca[idx] || "")
        const esatto = operatoriDB.find((x) => normalizzaVoce(x.nome) === scritto)
        const daConfermare = esatto || candidato
        if (!daConfermare?.id) {
          setShowOperatori((prev) => {
            const nuovo = [...prev]
            nuovo[idx] = true
            return nuovo
          })
          setVoceMessaggio('Scegli l’operatore corretto dalla tendina, oppure completa il nome e poi dì “OK”.')
          return
        }

        selezionaOperatore(daConfermare, idx, false)
        impostaPassoVoce("ore")
        setVoceMessaggio(`Operatore ${daConfermare.nome} confermato. Pronuncia le ore e poi dì “OK”.`)
        return
      }

      // Anche l'operatore funziona come ricerca: mostriamo le possibilità.
      setOperatoriRicerca((prev) => {
        const nuovo = [...prev]
        nuovo[idx] = frase
        return nuovo
      })
      setForm((prev) => {
        const operatori = prev.operatori.map((op, i) =>
          i === idx ? { ...op, operatore_id: "", ore: "" } : op
        )
        const prossimo = { ...prev, operatori }
        formRef.current = prossimo
        return prossimo
      })
      setShowOperatori((prev) => {
        const nuovo = [...prev]
        nuovo[idx] = true
        return nuovo
      })
      setOperatoreEvidenziato((prev) => {
        const nuovo = [...prev]
        nuovo[idx] = 0
        return nuovo
      })

      const trovato = trovaMiglioreCorrispondenza(operatoriDB, testi)
      voceCandidatoRef.current = trovato
      setVoceCandidato(trovato)
      setVoceMessaggio(
        trovato
          ? `Ho trovato ${trovato.nome}. Puoi cliccare la scelta giusta oppure dire “OK”.`
          : `Cerco “${frase}”. Scegli l’operatore corretto nella tendina. Se non va bene, dì “CANCELLA” e ripeti.`
      )
      return
    }

    if (passo === "ore") {
      const idx = voceOperatoreIndexRef.current

      if (comandoOk) {
        const oreAttuali = Number(formRef.current.operatori[idx]?.ore || 0)
        if (!(oreAttuali > 0)) {
          setVoceMessaggio('Prima pronuncia le ore, poi dì “OK”.')
          return
        }

        // OK sulle ore: apriamo subito la riga del prossimo operatore.
        preparaOperatoreVoce(formRef.current.operatori.length)
        setVoceMessaggio(`Ore ${oreAttuali} confermate. Pronuncia il prossimo operatore oppure dì “SALVA”.`)
        return
      }

      const ore = numeroDaVoce(frase)
      if (!ore) {
        setVoceMessaggio(`Non ho capito le ore da “${frase}”. Ripeti, per esempio “otto” oppure “sette e mezzo”.`)
        return
      }

      setForm((prev) => {
        const operatori = prev.operatori.map((op, i) =>
          i === idx ? { ...op, ore } : op
        )
        const prossimo = { ...prev, operatori }
        formRef.current = prossimo
        return prossimo
      })
      setVoceMessaggio(`Ho inserito ${ore} ore. Dì “OK” per confermare oppure “CANCELLA” per ripetere.`)
      return
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

  async function leggiTuttiPreferiti() {
    const tutti = []
    const pagina = 1000
    let da = 0

    while (true) {
      const { data, error } = await supabase
        .from("articoli_preferiti")
        .select("*")
        .order("ultimo_utilizzo", { ascending: false })
        .range(da, da + pagina - 1)

      if (error) throw error

      const blocco = data || []
      tutti.push(...blocco)

      if (blocco.length < pagina) break
      da += pagina
    }

    return tutti
  }

  async function leggiTutteBolleRighe() {
    const tutte = []
    const pagina = 1000
    let da = 0

    while (true) {
      const { data, error } = await supabase
        .from("bolle_righe")
        .select("id, bolla_id, codice, descrizione, quantita, prezzo, totale")
        .order("id", { ascending: true })
        .range(da, da + pagina - 1)

      if (error) throw error

      const blocco = data || []
      tutte.push(...blocco)

      if (blocco.length < pagina) break
      da += pagina
    }

    return tutte
  }

  async function leggiTutteFontiMateriali() {
    const tutte = []
    const pagina = 1000
    let da = 0

    while (true) {
      const { data, error } = await supabase
        .from("bolle_acquisto")
        .select("id, data, tipo, nome, nome_carrello, numero_ddt, numero_ordine, creatore_carrello")
        .order("id", { ascending: true })
        .range(da, da + pagina - 1)

      if (error) throw error

      const blocco = data || []
      tutte.push(...blocco)

      if (blocco.length < pagina) break
      da += pagina
    }

    return tutte
  }

  async function rigeneraPreferitiCompleti() {
    if (rigenerandoPreferiti) return

    const conferma = window.confirm(
      "Rigenerare completamente i Preferiti usando TUTTI i materiali di TUTTE le bolle e di TUTTI i carrelli?\\n\\nL'archivio Preferiti verrà ricreato."
    )
    if (!conferma) return

    setRigenerandoPreferiti(true)

    try {
      const [righe, fonti] = await Promise.all([
        leggiTutteBolleRighe(),
        leggiTutteFontiMateriali(),
      ])

      const fontiPerId = new Map(
        (fonti || []).map((f) => [String(f.id), f])
      )

      const raggruppati = new Map()

      for (const r of righe || []) {
        const codice = String(r.codice || "").trim()
        const descrizione = String(r.descrizione || "").trim()

        if (!codice && !descrizione) continue

        const chiave = codice
          ? `COD:${codice.toLowerCase()}`
          : `DES:${descrizione.toLowerCase()}`

        const fonte = fontiPerId.get(String(r.bolla_id || ""))
        const dataFonte = fonte?.data || null
        const tsFonte = dataFonte ? new Date(dataFonte).getTime() : 0

        const prezzo = Number(r.prezzo || 0)
        const quantita = Number(r.quantita || 0)

        if (!raggruppati.has(chiave)) {
          raggruppati.set(chiave, {
            codice: codice || null,
            descrizione: descrizione || null,
            prezzo,
            volte_usato: 1,
            quantita_totale: quantita,
            ultimo_utilizzo: dataFonte || new Date().toISOString(),
            _ultimoTs: tsFonte,
          })
          continue
        }

        const esistente = raggruppati.get(chiave)

        esistente.volte_usato += 1
        esistente.quantita_totale += quantita

        if (prezzo > Number(esistente.prezzo || 0)) {
          esistente.prezzo = prezzo
        }

        if (!esistente.descrizione && descrizione) {
          esistente.descrizione = descrizione
        }

        if (tsFonte > Number(esistente._ultimoTs || 0)) {
          esistente._ultimoTs = tsFonte
          esistente.ultimo_utilizzo = dataFonte || esistente.ultimo_utilizzo
          if (descrizione) esistente.descrizione = descrizione
        }
      }

      const nuovi = Array.from(raggruppati.values()).map(({ _ultimoTs, ...x }) => x)

      // Cancella i preferiti esistenti in blocchi, senza dipendere dal limite 1000.
      const vecchi = await leggiTuttiPreferiti()

      for (let i = 0; i < vecchi.length; i += 500) {
        const ids = vecchi.slice(i, i + 500).map((p) => p.id).filter(Boolean)
        if (!ids.length) continue

        const { error } = await supabase
          .from("articoli_preferiti")
          .delete()
          .in("id", ids)

        if (error) throw error
      }

      // Inserisci il nuovo archivio a blocchi.
      for (let i = 0; i < nuovi.length; i += 500) {
        const blocco = nuovi.slice(i, i + 500)

        const { error } = await supabase
          .from("articoli_preferiti")
          .insert(blocco)

        if (error) throw error
      }

      setPreferitiDescrizione(nuovi.sort((a, b) => {
        const da = a.ultimo_utilizzo ? new Date(a.ultimo_utilizzo).getTime() : 0
        const db = b.ultimo_utilizzo ? new Date(b.ultimo_utilizzo).getTime() : 0
        return db - da
      }))

      alert(
        `✅ Preferiti rigenerati completamente\\n\\nRighe lette da bolle/carrelli: ${righe.length}\\nArticoli unici creati: ${nuovi.length}`
      )
    } catch (err) {
      console.error(err)
      alert("Errore rigenerazione Preferiti: " + (err?.message || err))
    } finally {
      setRigenerandoPreferiti(false)
    }
  }

  async function cercaFontiGlobali(testo, tipo) {
    const q = String(testo || "").trim()
    if (!q) return []

    let query = supabase
      .from("bolle_acquisto")
      .select("id, data, tipo, nome, nome_carrello, numero_ddt, numero_ordine, creatore_carrello, descrizione_ricerca")
      .limit(50)

    if (tipo === "carrelli") {
      query = query.eq("tipo", "carrello")
    } else if (tipo === "bolle") {
      query = query.or("tipo.is.null,tipo.neq.carrello")
    }

    const pattern = `%${q}%`

    query = query.or(
      [
        `nome.ilike.${pattern}`,
        `nome_carrello.ilike.${pattern}`,
        `numero_ddt.ilike.${pattern}`,
        `numero_ordine.ilike.${pattern}`,
        `creatore_carrello.ilike.${pattern}`,
        `descrizione_ricerca.ilike.${pattern}`,
      ].join(",")
    )

    const { data, error } = await query

    if (error) {
      console.error(error)
      return []
    }

    return data || []
  }

  async function caricaPreferiti(tipo = preferitiTipo, dataDa = preferitiDataDa, dataA = preferitiDataA) {
    setPreferitiLoading(true)

    try {
      if (tipo === "descrizione") {
        const data = await leggiTuttiPreferiti()
        setPreferitiDescrizione(data || [])
        return
      }

      let query = supabase
        .from("bolle_acquisto")
        .select(
          "id, data, tipo, nome, nome_carrello, numero_ddt, numero_ordine, creatore_carrello, descrizione_ricerca"
        )
        .gte("data", `${dataDa}T00:00:00`)
        .lte("data", `${dataA}T23:59:59`)
        .order("data", { ascending: false })
        .order("id", { ascending: false })

      if (tipo === "carrelli") {
        query = query.eq("tipo", "carrello")
      } else {
        query = query.or("tipo.is.null,tipo.neq.carrello")
      }

      const { data: fonti, error: fontiError } = await query

      if (fontiError) {
        console.error(fontiError)
        alert(
          "Errore caricamento " +
            (tipo === "carrelli" ? "carrelli" : "bolle") +
            ": " +
            fontiError.message
        )
        return
      }

      const fontiOrdinate = (fonti || []).sort((a, b) => {
        const dataAVal = a.data || ""
        const dataBVal = b.data || ""

        if (dataAVal !== dataBVal) {
          return dataBVal.localeCompare(dataAVal)
        }

        return Number(b.id || 0) - Number(a.id || 0)
      })

      const ids = fontiOrdinate.map((f) => f.id).filter(Boolean)

      if (ids.length === 0) {
        setPreferiti([])
        return
      }

      const { data: righe, error: righeError } = await supabase
        .from("bolle_righe")
        .select("id, bolla_id, codice, descrizione, quantita, prezzo")
        .in("bolla_id", ids)
        .order("id", { ascending: true })

      if (righeError) {
        console.error(righeError)
        alert("Errore caricamento materiali: " + righeError.message)
        return
      }

      const righePerFonte = new Map()

      for (const r of righe || []) {
        const key = String(r.bolla_id || "")
        if (!key) continue

        if (!righePerFonte.has(key)) {
          righePerFonte.set(key, [])
        }

        righePerFonte.get(key).push({
          id: r.id,
          codice: String(r.codice || "").trim(),
          descrizione: String(r.descrizione || "").trim(),
          quantita: Number(r.quantita || 0),
          prezzo: Number(r.prezzo || 0),
        })
      }

      const gruppi = fontiOrdinate
        .map((fonte) => ({
          id: fonte.id,
          tipo: tipo === "carrelli" ? "carrello" : "bolla",
          data: fonte.data || null,
          numero_ddt: String(fonte.numero_ddt || "").trim(),
          numero_ordine: String(fonte.numero_ordine || "").trim(),
          creatore: String(fonte.creatore_carrello || "").trim(),
          nome_carrello: String(fonte.nome_carrello || fonte.nome || "").trim(),
          descrizione_fonte: String(
            fonte.descrizione_ricerca ||
              fonte.nome_carrello ||
              fonte.nome ||
              ""
          ).trim(),
          materiali: (righePerFonte.get(String(fonte.id)) || []).filter(
            (r) => r.codice || r.descrizione
          ),
        }))
        .filter((g) => g.materiali.length > 0)

      setPreferiti(gruppi)
    } finally {
      setPreferitiLoading(false)
    }
  }

  function gruppiPreferitiFiltrati() {
    const ricercaGenerale = String(searchMat || "").trim().toLowerCase()
    const filtriFonte = [fonteFiltro1, fonteFiltro2, fonteFiltro3, fonteFiltro4]
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean)

    const paroleRicerca = ricercaGenerale
      ? ricercaGenerale.split(/\s+/).filter(Boolean)
      : []

    return preferiti
      .map((gruppo) => {
        const fonteHaystack = [
          gruppo.numero_ddt,
          gruppo.numero_ordine,
          gruppo.creatore,
          gruppo.nome_carrello,
          gruppo.descrizione_fonte,
        ]
          .join(" ")
          .toLowerCase()

        const fonteCombacia =
          paroleRicerca.length === 0 ||
          paroleRicerca.every((parola) => fonteHaystack.includes(parola))

        let materiali = gruppo.materiali

        if (!fonteCombacia && paroleRicerca.length > 0) {
          materiali = materiali.filter((m) => {
            const haystack = `${m.codice || ""} ${m.descrizione || ""}`.toLowerCase()
            return paroleRicerca.every((parola) => haystack.includes(parola))
          })
        }

        if (filtriFonte.length > 0) {
          materiali = materiali.filter((m) => {
            const haystack = `${m.codice || ""} ${m.descrizione || ""}`
              .toLowerCase()
              .replace(/[-_/.,;:]+/g, " ")

            return filtriFonte.every((filtro) => haystack.includes(filtro))
          })
        }

        return { ...gruppo, materiali }
      })
      .filter((gruppo) => gruppo.materiali.length > 0)
  }

  async function apriFonteEsattaDaSuggerimento(fonte) {
    if (!fonte?.id) return

    const tipo = fonte.tipo === "carrello" ? "carrelli" : "bolle"

    setPreferitiTipo(tipo)
    setPreferitiLoading(true)
    setSearchMat("")
    setSuggerimentiFonti([])

    try {
      const { data: righe, error: righeError } = await supabase
        .from("bolle_righe")
        .select("id, bolla_id, codice, descrizione, quantita, prezzo")
        .eq("bolla_id", fonte.id)
        .order("id", { ascending: true })

      if (righeError) throw righeError

      const materiali = (righe || [])
        .map((r) => ({
          id: r.id,
          codice: String(r.codice || "").trim(),
          descrizione: String(r.descrizione || "").trim(),
          quantita: Number(r.quantita || 0),
          prezzo: Number(r.prezzo || 0),
        }))
        .filter((r) => r.codice || r.descrizione)

      const gruppo = {
        id: fonte.id,
        tipo: fonte.tipo === "carrello" ? "carrello" : "bolla",
        data: fonte.data || null,
        numero_ddt: String(fonte.numero_ddt || "").trim(),
        numero_ordine: String(fonte.numero_ordine || "").trim(),
        creatore: String(fonte.creatore_carrello || "").trim(),
        nome_carrello: String(fonte.nome_carrello || fonte.nome || "").trim(),
        descrizione_fonte: String(
          fonte.descrizione_ricerca ||
            fonte.nome_carrello ||
            fonte.nome ||
            ""
        ).trim(),
        materiali,
      }

      setPreferiti(materiali.length ? [gruppo] : [])

      if (!materiali.length) {
        alert(
          tipo === "carrelli"
            ? "Il carrello è stato trovato, ma non risultano materiali collegati."
            : "La bolla è stata trovata, ma non risultano materiali collegati."
        )
      }
    } catch (err) {
      console.error(err)
      alert("Errore caricamento contenuto: " + (err?.message || err))
    } finally {
      setPreferitiLoading(false)
    }
  }


  async function eseguiRicercaGlobaleFonte() {
    const testo = String(searchMat || "").trim()

    if (!testo) {
      void caricaPreferiti(preferitiTipo, preferitiDataDa, preferitiDataA)
      return
    }

    setPreferitiLoading(true)

    try {
      const fonti = await cercaFontiGlobali(testo, preferitiTipo)
      const ids = (fonti || []).map((f) => f.id).filter(Boolean)

      if (!ids.length) {
        setPreferiti([])
        return
      }

      const { data: righe, error: righeError } = await supabase
        .from("bolle_righe")
        .select("id, bolla_id, codice, descrizione, quantita, prezzo")
        .in("bolla_id", ids)
        .order("id", { ascending: true })

      if (righeError) throw righeError

      const righePerFonte = new Map()

      for (const r of righe || []) {
        const key = String(r.bolla_id || "")
        if (!righePerFonte.has(key)) righePerFonte.set(key, [])
        righePerFonte.get(key).push({
          id: r.id,
          codice: String(r.codice || "").trim(),
          descrizione: String(r.descrizione || "").trim(),
          quantita: Number(r.quantita || 0),
          prezzo: Number(r.prezzo || 0),
        })
      }

      const gruppi = (fonti || [])
        .map((fonte) => ({
          id: fonte.id,
          tipo: preferitiTipo === "carrelli" ? "carrello" : "bolla",
          data: fonte.data || null,
          numero_ddt: String(fonte.numero_ddt || "").trim(),
          numero_ordine: String(fonte.numero_ordine || "").trim(),
          creatore: String(fonte.creatore_carrello || "").trim(),
          nome_carrello: String(fonte.nome_carrello || fonte.nome || "").trim(),
          descrizione_fonte: String(
            fonte.descrizione_ricerca ||
              fonte.nome_carrello ||
              fonte.nome ||
              ""
          ).trim(),
          materiali: (righePerFonte.get(String(fonte.id)) || []).filter(
            (r) => r.codice || r.descrizione
          ),
        }))
        .filter((g) => g.materiali.length > 0)
        .sort((a, b) => {
          const da = a.data || ""
          const db = b.data || ""
          if (da !== db) return db.localeCompare(da)
          return Number(b.id || 0) - Number(a.id || 0)
        })

      setPreferiti(gruppi)
    } catch (err) {
      console.error(err)
      alert("Errore ricerca globale: " + (err?.message || err))
    } finally {
      setPreferitiLoading(false)
    }
  }


  function preferitiDescrizioneFiltrati() {
    const filtri = [descFiltro1, descFiltro2, descFiltro3, descFiltro4]
      .map((v) => String(v || "").trim().toLowerCase())
      .filter(Boolean)

    // Senza filtri mostro tutti i preferiti.
    if (filtri.length === 0) {
      return preferitiDescrizione
    }

    return preferitiDescrizione.filter((p) => {
      const haystack = `${p.codice || ""} ${p.descrizione || ""}`
        .toLowerCase()
        .replace(/[-_/.,;:]+/g, " ")

      // Ogni casella è indipendente e può contenere codice,
      // parte del codice, parola o numero della descrizione.
      // L'ordine non conta: devono semplicemente essere presenti tutti.
      return filtri.every((filtro) => haystack.includes(filtro))
    })
  }

  function cambiaTipoPreferiti(tipo) {
    setPreferitiTipo(tipo)
    setSearchMat("")

    if (tipo === "descrizione") {
      setDescFiltro1("")
      setDescFiltro2("")
      setDescFiltro3("")
      setDescFiltro4("")
    }

    void caricaPreferiti(tipo, preferitiDataDa, preferitiDataA)
  }

  function applicaDatePreferiti() {
    if (!preferitiDataDa || !preferitiDataA) return

    if (preferitiDataDa > preferitiDataA) {
      alert("La data iniziale non può essere successiva alla data finale.")
      return
    }

    void caricaPreferiti(preferitiTipo, preferitiDataDa, preferitiDataA)
  }

  function ultimiTreGiorniPreferiti() {
    const da = dayjs().subtract(2, "day").format("YYYY-MM-DD")
    const a = dayjs().format("YYYY-MM-DD")

    setPreferitiDataDa(da)
    setPreferitiDataA(a)

    if (preferitiTipo !== "descrizione") {
      void caricaPreferiti(preferitiTipo, da, a)
    }
  }

  function chiaveMaterialeScelto(materiale, fonteId = "") {
    const codice = String(materiale?.codice || "").trim().toLowerCase()
    const descrizione = String(materiale?.descrizione || "").trim().toLowerCase()
    return `${fonteId || "pref"}_${codice}_${descrizione}`
  }

  function materialeSelezionato(materiale, fonteId = "") {
    const key = chiaveMaterialeScelto(materiale, fonteId)
    return materialiSelezionati.some((x) => x.key === key)
  }

  function toggleMaterialeSelezionato(materiale, fonteId = "") {
    const key = chiaveMaterialeScelto(materiale, fonteId)

    setMaterialiSelezionati((prev) => {
      const esiste = prev.some((x) => x.key === key)

      if (esiste) {
        return prev.filter((x) => x.key !== key)
      }

      return [
        ...prev,
        {
          key,
          codice: String(materiale?.codice || "").trim(),
          descrizione: String(materiale?.descrizione || "").trim(),
          quantita: 1,
        },
      ]
    })
  }

  function cambiaQuantitaSelezionato(key, valore) {
    setMaterialiSelezionati((prev) =>
      prev.map((x) => (x.key === key ? { ...x, quantita: valore } : x))
    )
  }

  async function inserisciMaterialiSelezionati() {
    if (inserendoMateriali) return

    if (!editingId) {
      alert("Prima salva l'intervento.")
      return
    }

    if (!materialiSelezionati.length) {
      alert("Seleziona almeno un materiale.")
      return
    }

    const scelti = materialiSelezionati
      .filter((m) => m.codice || m.descrizione)
      .map((m) => ({
        ...m,
        quantita: Number(m.quantita || 1) > 0 ? Number(m.quantita || 1) : 1,
      }))

    if (!scelti.length) return

    setInserendoMateriali(true)

    try {
      const { data: esistentiDb, error: readError } = await supabase
        .from("materiali_bollettino")
        .select("id, codice, descrizione, quantita")
        .eq("intervento_id", editingId)

      if (readError) throw readError

      const esistenti = esistentiDb || []

      for (const m of scelti) {
        const codiceNorm = String(m.codice || "").trim().toLowerCase()
        const descrNorm = String(m.descrizione || "").trim().toLowerCase()

        const trovato = esistenti.find((x) =>
          codiceNorm
            ? String(x.codice || "").trim().toLowerCase() === codiceNorm
            : String(x.descrizione || "").trim().toLowerCase() === descrNorm
        )

        if (trovato?.id) {
          const nuovaQuantita =
            Number(trovato.quantita || 0) + Number(m.quantita || 1)

          const { error } = await supabase
            .from("materiali_bollettino")
            .update({ quantita: nuovaQuantita })
            .eq("id", trovato.id)

          if (error) throw error

          trovato.quantita = nuovaQuantita
        } else {
          const { data: inserito, error } = await supabase
            .from("materiali_bollettino")
            .insert({
              intervento_id: editingId,
              codice: m.codice || "",
              descrizione: m.descrizione || "",
              quantita: Number(m.quantita || 1),
            })
            .select("id, codice, descrizione, quantita")
            .single()

          if (error) throw error
          if (inserito) esistenti.push(inserito)
        }
      }

      // Aggiorna subito anche la lista visibile nell'intervento.
      const { data: aggiornati, error: reloadError } = await supabase
        .from("materiali_bollettino")
        .select("id, codice, descrizione, quantita")
        .eq("intervento_id", editingId)
        .order("id", { ascending: true })

      if (reloadError) throw reloadError

      setForm((prev) => ({
        ...prev,
        materiali: (aggiornati || []).map((m) => ({
          id: m.id,
          codice: m.codice || "",
          descrizione: m.descrizione || "",
          quantita: m.quantita ?? 1,
        })),
      }))

      setMaterialiSelezionati([])
      alert(`✅ Inseriti ${scelti.length} materiali nell'intervento`)
    } catch (err) {
      console.error(err)
      alert("Errore inserimento materiali: " + (err?.message || err))
    } finally {
      setInserendoMateriali(false)
    }
  }

  function aggiungiDaPreferiti(materiale) {
    const codice = String(materiale?.codice || "").trim()
    const descrizione = String(materiale?.descrizione || "").trim()

    if (!codice && !descrizione) return

    setForm((prev) => {
      const esistente = prev.materiali.findIndex((m) =>
        codice
          ? String(m.codice || "").trim().toLowerCase() === codice.toLowerCase()
          : String(m.descrizione || "").trim().toLowerCase() === descrizione.toLowerCase()
      )

      if (esistente >= 0) {
        return {
          ...prev,
          materiali: prev.materiali.map((m, i) =>
            i === esistente
              ? { ...m, quantita: Number(m.quantita || 0) + 1 }
              : m
          ),
        }
      }

      return {
        ...prev,
        materiali: [
          ...prev.materiali,
          { codice, descrizione, quantita: 1 },
        ],
      }
    })
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
    setForm((prev) => {
      const operatori = prev.operatori.map((riga, i) =>
        i === index ? { ...riga, operatore_id: op.id } : riga
      )
      const prossimo = { ...prev, operatori }
      formRef.current = prossimo
      return prossimo
    })

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
    setForm((prev) => {
      const prossimo = {
        ...prev,
        cliente_id: c.id,
        cliente_nome: c.nome,
        cantiere_id: "",
      }
      formRef.current = prossimo
      return prossimo
    })

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
    // Durante la digitazione permettiamo anche il campo vuoto.
    // Il valore minimo 1 viene applicato solo quando il materiale viene salvato.
    setForm((prev) => ({
      ...prev,
      materiali: prev.materiali.map((m, i) =>
        i === index ? { ...m, quantita: valore } : m
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
    setShowPreferitiMat(false)
    setInterventoAppenaSalvato(false)

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
      alert("Prima salva l'intervento. Dopo il salvataggio potrai scegliere i preferiti direttamente qui.")
      return
    }

    setShowAltroMat(false)
    setShowPreferitiMat(true)
    setSearchMat("")
    setMaterialiSelezionati([])
    setPreferitiTipo("bolle")

    const da = dayjs().subtract(2, "day").format("YYYY-MM-DD")
    const a = dayjs().format("YYYY-MM-DD")
    setPreferitiDataDa(da)
    setPreferitiDataA(a)
    void caricaPreferiti("bolle", da, a)

    setTimeout(() => {
      materialiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 80)
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
      setInterventoAppenaSalvato(true)

      // Aggiorna l'URL senza riaprire l'intervento e senza tornare in cima alla pagina.
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", `/interventi?edit_id=${int.id}`)
      }

      caricaInterventi()

      setTimeout(() => {
        materialiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 150)
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
                onPointerDown={scritturaClienteConVoce}
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
                      onClick={() => {
                        if (voceAttivaRef.current) {
                          void (async () => {
                            await selezionaCliente(c, false)
                            impostaPassoVoce("cantiere")
                            if (cantieriRef.current.length > 0) {
                              setVoceMessaggio(`Cliente scelto: ${c.nome}. Scegli il cantiere dalla tendina qui sotto.`)
                            } else {
                              voceDescrizioneBaseRef.current = formRef.current.descrizione || ""
                              voceDescrizionePezziRef.current = []
                              setVoceDescrizionePezzi([])
                              impostaPassoVoce("descrizione")
                              setVoceMessaggio(`Cliente scelto: ${c.nome}. Nessun cantiere disponibile. Detta la descrizione.`)
                            }
                          })()
                        } else {
                          void selezionaCliente(c, true)
                        }
                      }}
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

            <div style={{ position: "relative" }}>
              <select
                ref={cantiereSelectRef}
                value={form.cantiere_id}
                onChange={(e) => {
                  const id = e.target.value
                  setForm((prev) => {
                    const prossimo = { ...prev, cantiere_id: id }
                    formRef.current = prossimo
                    return prossimo
                  })
                  if (voceAttivaRef.current && id) {
                    voceDescrizioneBaseRef.current = formRef.current.descrizione || ""
                    voceDescrizionePezziRef.current = []
                    setVoceDescrizionePezzi([])
                    impostaPassoVoce("descrizione")
                    setVoceMessaggio('Cantiere scelto. Detta la descrizione a frasi e dì “OK” quando hai finito.')
                  }
                }}
                onPointerDown={() => {
                  if (!voceAttivaRef.current) passaAScrittura()
                }}
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

              {voceAttiva && vocePasso === "cantiere" && cantieri.length > 0 && !form.cantiere_id && (
                <div style={suggestBox}>
                  {cantieri.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setForm((prev) => {
                          const prossimo = { ...prev, cantiere_id: c.id }
                          formRef.current = prossimo
                          return prossimo
                        })
                        voceDescrizioneBaseRef.current = formRef.current.descrizione || ""
                        voceDescrizionePezziRef.current = []
                        setVoceDescrizionePezzi([])
                        impostaPassoVoce("descrizione")
                        setVoceMessaggio(`Cantiere ${c.nome} scelto. Detta la descrizione a frasi e dì “OK” quando hai finito.`)
                        setTimeout(() => descrizioneInputRef.current?.focus(), 80)
                      }}
                      style={{ padding: 10, cursor: "pointer", borderBottom: "1px solid #eee", background: "white" }}
                    >
                      {c.nome}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                    onPointerDown={() => {
                      if (voceAttivaRef.current) scritturaOperatoreConVoce(i)
                      else passaAScrittura()
                    }}
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
                          onClick={() => {
                            if (voceAttivaRef.current) {
                              selezionaOperatore(operatore, i, false)
                              voceOperatoreIndexRef.current = i
                              setVoceOperatoreIndex(i)
                              impostaPassoVoce("ore")
                              setVoceMessaggio(`Operatore ${operatore.nome} scelto. Pronuncia le ore; le scrivo nella casella e poi dì “OK” per confermare.`)
                              setTimeout(() => oreInputRefs.current[i]?.focus(), 80)
                            } else {
                              selezionaOperatore(operatore, i, true)
                            }
                          }}
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

          <div style={salvaInterventoBox}>
            <button
              ref={salvaButtonRef}
              type="button"
              onClick={salva}
              disabled={saving}
              style={salvaInterventoGrande}
            >
              {saving ? "Salvataggio..." : editingId ? "💾 AGGIORNA INTERVENTO" : "💾 SALVA INTERVENTO"}
            </button>
          </div>

          <div ref={materialiSectionRef} style={isMobile ? sectionMobile : section}>
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

            {editingId && (
              <div style={materialiScelteBox}>
                {interventoAppenaSalvato && (
                  <div style={materialiSalvatiMsg}>
                    ✅ Intervento salvato. Ora scegli da dove aggiungere i materiali.
                  </div>
                )}

                <div style={materialiScelteGridDue}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreferitiMat(false)
                      setShowAltroMat(true)
                    }}
                    style={materialeSceltaButton}
                  >
                    ✏️ Materiale libero
                  </button>
                  <button type="button" onClick={vaiAPreferiti} style={materialeSceltaButton}>
                    ⭐ Preferiti
                  </button>
                </div>
              </div>
            )}

            {showPreferitiMat && (
              <div style={preferitiMaterialiBox}>
                <div style={preferitiMaterialiHeader}>
                  <div>
                    <b>⭐ Preferiti</b>
                    <div style={preferitiMaterialiSub}>
                      Scegli Bolle, Carrelli oppure cerca direttamente per descrizione.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreferitiMat(false)}
                    style={secondaryButton}
                  >
                    ✖ Chiudi
                  </button>
                </div>

                <div style={preferitiTipoGrid}>
                  <button
                    type="button"
                    onClick={() => cambiaTipoPreferiti("bolle")}
                    style={
                      preferitiTipo === "bolle"
                        ? preferitiTipoButtonAttivo
                        : preferitiTipoButton
                    }
                  >
                    📄 Bolle
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiaTipoPreferiti("carrelli")}
                    style={
                      preferitiTipo === "carrelli"
                        ? preferitiTipoButtonAttivo
                        : preferitiTipoButton
                    }
                  >
                    🛒 Carrelli
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiaTipoPreferiti("descrizione")}
                    style={
                      preferitiTipo === "descrizione"
                        ? preferitiTipoButtonAttivo
                        : preferitiTipoButton
                    }
                  >
                    🔎 Descrizione
                  </button>
                </div>

                {materialiSelezionati.length > 0 && (
                  <div style={materialiSelezionatiBox}>
                    <div style={materialiSelezionatiTitolo}>
                      ✅ Selezionati: {materialiSelezionati.length}
                    </div>

                    <div style={materialiSelezionatiLista}>
                      {materialiSelezionati.map((m) => (
                        <div key={m.key} style={materialeSelezionatoRiga}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <b>{m.codice || "Senza codice"}</b>
                            <div style={{ fontSize: 12, overflowWrap: "anywhere" }}>
                              {m.descrizione || "Senza descrizione"}
                            </div>
                          </div>

                          <input
                            type="number"
                            min="1"
                            value={m.quantita}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) =>
                              cambiaQuantitaSelezionato(m.key, e.target.value)
                            }
                            style={quantitaSelezionatoInput}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setMaterialiSelezionati((prev) =>
                                prev.filter((x) => x.key !== m.key)
                              )
                            }
                            style={dangerSmall}
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={inserisciMaterialiSelezionati}
                      disabled={inserendoMateriali}
                      style={inserisciSelezionatiButton}
                    >
                      {inserendoMateriali
                        ? "Inserimento..."
                        : "➕ INSERISCI SELEZIONATI NELL'INTERVENTO"}
                    </button>
                  </div>
                )}

                {preferitiTipo !== "descrizione" && (
                  <div style={preferitiDateBox}>
                    <div style={preferitiDateIntro}>
                      Mostro automaticamente gli ultimi 3 giorni.
                    </div>

                    <label style={preferitiDateLabel}>
                      Da
                      <input
                        type="date"
                        value={preferitiDataDa}
                        onChange={(e) => setPreferitiDataDa(e.target.value)}
                        style={preferitiDateInput}
                      />
                    </label>

                    <label style={preferitiDateLabel}>
                      A
                      <input
                        type="date"
                        value={preferitiDataA}
                        onChange={(e) => setPreferitiDataA(e.target.value)}
                        style={preferitiDateInput}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={applicaDatePreferiti}
                      style={preferitiDateButton}
                    >
                      🔍 Cerca date
                    </button>

                    <button
                      type="button"
                      onClick={ultimiTreGiorniPreferiti}
                      style={preferitiDateButtonLight}
                    >
                      📅 Ultimi 3 giorni
                    </button>
                  </div>
                )}

                {preferitiTipo === "descrizione" ? (
                  <div style={descrizioneFiltriBox}>
                    <div style={descrizioneFiltriTitolo}>
                      🔎 Ricerca progressiva
                    </div>
                    <div style={descrizioneFiltriSub}>
                      Inserisci fino a 4 pezzi di codice, parole o numeri. L'ordine non conta.
                    </div>

                    <div style={descrizioneFiltriGrid}>
                      <div style={{ position: "relative" }}>
                        <input
                          placeholder="Scelta 1 — codice, descrizione o nome carrello"
                          value={descFiltro1}
                          onChange={async (e) => {
                            const valore = e.target.value
                            setDescFiltro1(valore)

                            if (String(valore).trim().length < 2) {
                              setSuggerimentiFonti([])
                              return
                            }

                            const dati = await cercaFontiGlobali(valore, "")
                            setSuggerimentiFonti(
                              (dati || []).slice(0, 10).map((f) => ({
                                ...f,
                                label:
                                  f.tipo === "carrello"
                                    ? `🛒 ${f.nome_carrello || f.nome || f.descrizione_ricerca || "Carrello"}`
                                    : `📄 ${f.numero_ddt ? `DDT ${f.numero_ddt}` : f.nome || "Bolla"}${f.creatore_carrello ? ` · ${f.creatore_carrello}` : ""}`,
                                valore:
                                  f.nome_carrello ||
                                  f.descrizione_ricerca ||
                                  f.numero_ddt ||
                                  f.nome ||
                                  "",
                              }))
                            )
                          }}
                          style={inputFull}
                        />

                        {suggerimentiFonti.length > 0 && (
                          <div style={suggerimentiDropdown}>
                            {suggerimentiFonti.map((s) => (
                              <button
                                type="button"
                                key={s.id}
                                onClick={() => {
                                  setDescFiltro1(s.valore)
                                  void apriFonteEsattaDaSuggerimento(s)
                                }}
                                style={suggerimentoRiga}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        placeholder="Scelta 2 — es. 32"
                        value={descFiltro2}
                        onChange={(e) => setDescFiltro2(e.target.value)}
                        style={inputFull}
                      />
                      <input
                        placeholder="Scelta 3 — es. tubo"
                        value={descFiltro3}
                        onChange={(e) => setDescFiltro3(e.target.value)}
                        style={inputFull}
                      />
                      <input
                        placeholder="Scelta 4 — opzionale"
                        value={descFiltro4}
                        onChange={(e) => setDescFiltro4(e.target.value)}
                        style={inputFull}
                      />
                    </div>

                    <div style={descrizioneFiltriAzioni}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setDescFiltro1("")
                            setDescFiltro2("")
                            setDescFiltro3("")
                            setDescFiltro4("")
                          }}
                          style={secondaryButton}
                        >
                          🧹 Pulisci ricerca
                        </button>

                        <button
                          type="button"
                          onClick={rigeneraPreferitiCompleti}
                          disabled={rigenerandoPreferiti}
                          style={{
                            ...secondaryButton,
                            background: rigenerandoPreferiti ? "#adb5bd" : "#198754",
                            color: "white",
                          }}
                        >
                          {rigenerandoPreferiti
                            ? "Rigenerazione..."
                            : "🔄 Rigenera tutti i Preferiti"}
                        </button>
                      </div>

                      <div style={descrizioneRisultatiCount}>
                        Risultati: <b>{preferitiDescrizioneFiltrati().length}</b>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={ricercaGlobaleRiga}>
                    <input
                      placeholder={
                        preferitiTipo === "carrelli"
                          ? "Cerca in TUTTI i carrelli..."
                          : "Cerca in TUTTE le bolle..."
                      }
                      value={searchMat}
                      onChange={(e) => setSearchMat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void eseguiRicercaGlobaleFonte()
                        }
                      }}
                      style={{ ...inputFull, flex: 1 }}
                    />

                    <button
                      type="button"
                      onClick={eseguiRicercaGlobaleFonte}
                      style={preferitiDateButton}
                    >
                      🔎 Cerca ovunque
                    </button>
                  </div>

                  {preferiti.length === 1 && (
                    <div style={descrizioneFiltriBox}>
                      <div style={descrizioneFiltriTitolo}>
                        🔎 Ricerca materiali nel {preferitiTipo === "carrelli" ? "carrello" : "documento"}
                      </div>
                      <div style={descrizioneFiltriSub}>
                        Inserisci fino a 4 parti di codice, parole o numeri. L'ordine non conta.
                      </div>

                      <div style={descrizioneFiltriGrid}>
                        <input
                          placeholder="Scelta 1 — es. WIV"
                          value={fonteFiltro1}
                          onChange={(e) => setFonteFiltro1(e.target.value)}
                          style={inputFull}
                        />
                        <input
                          placeholder="Scelta 2 — es. 32"
                          value={fonteFiltro2}
                          onChange={(e) => setFonteFiltro2(e.target.value)}
                          style={inputFull}
                        />
                        <input
                          placeholder="Scelta 3 — es. tubo"
                          value={fonteFiltro3}
                          onChange={(e) => setFonteFiltro3(e.target.value)}
                          style={inputFull}
                        />
                        <input
                          placeholder="Scelta 4 — opzionale"
                          value={fonteFiltro4}
                          onChange={(e) => setFonteFiltro4(e.target.value)}
                          style={inputFull}
                        />
                      </div>

                      <div style={descrizioneFiltriAzioni}>
                        <button
                          type="button"
                          onClick={() => {
                            setFonteFiltro1("")
                            setFonteFiltro2("")
                            setFonteFiltro3("")
                            setFonteFiltro4("")
                          }}
                          style={secondaryButton}
                        >
                          🧹 Pulisci ricerca
                        </button>

                        <div style={descrizioneRisultatiCount}>
                          Risultati: <b>{gruppiPreferitiFiltrati().reduce((tot, g) => tot + g.materiali.length, 0)}</b>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                )}

                {preferitiLoading && (
                  <div style={emptyBox}>
                    Caricamento {preferitiTipo === "carrelli" ? "carrelli" : preferitiTipo === "descrizione" ? "preferiti" : "bolle"}...
                  </div>
                )}

                {preferitiTipo === "descrizione" && !preferitiLoading && (
                  <>
                    {preferitiDescrizioneFiltrati().length === 0 && (
                      <div style={emptyBox}>Nessun materiale trovato.</div>
                    )}

                    <div style={preferitiFonteLista}>
                      {preferitiDescrizioneFiltrati().map((p) => (
                        <button
                          type="button"
                          key={`descr_${p.id || p.codice || p.descrizione}`}
                          onClick={() => toggleMaterialeSelezionato(p, "descrizione")}
                          style={{
                            ...preferitoMaterialeCardNuovo,
                            ...(materialeSelezionato(p, "descrizione")
                              ? preferitoMaterialeSelezionato
                              : {}),
                          }}
                        >
                          <div style={preferitoCheckbox}>
                            {materialeSelezionato(p, "descrizione") ? "☑" : "☐"}
                          </div>
                          <div style={preferitoMaterialeTesto}>
                            <div style={preferitoCodice}>
                              {p.codice || "Senza codice"}
                            </div>
                            <div style={preferitoDescrizione}>
                              {p.descrizione || "Senza descrizione"}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {preferitiTipo !== "descrizione" && !preferitiLoading && gruppiPreferitiFiltrati().length === 0 && (
                  <div style={emptyBox}>
                    Nessun {preferitiTipo === "carrelli" ? "carrello" : "bolla"} trovato nel periodo selezionato.
                  </div>
                )}

                {preferitiTipo !== "descrizione" && !preferitiLoading && gruppiPreferitiFiltrati().map((gruppo) => (
                  <div key={`${gruppo.tipo}_${gruppo.id}`} style={preferitiFonteGruppo}>
                    <div
                      style={
                        isMobile
                          ? preferitiFonteHeaderMobile
                          : preferitiFonteHeaderNuovo
                      }
                    >
                      <div style={preferitiBollaMini}>
                        <div style={preferitiFonteTitolo}>
                          {gruppo.tipo === "carrello" ? "🛒 Carrello" : "📄 Bolla / DDT"}
                        </div>

                        {gruppo.tipo === "carrello" ? (
                          <>
                            <div style={preferitiDdtPiccolo}>
                              {gruppo.nome_carrello || "Carrello senza nome"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={preferitiDdtPiccolo}>
                              {gruppo.numero_ddt
                                ? `DDT ${gruppo.numero_ddt}`
                                : "DDT non indicato"}
                            </div>
                            {gruppo.numero_ordine && (
                              <div style={preferitiOrdinePiccolo}>
                                Ordine {gruppo.numero_ordine}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div style={preferitiCreatoreBox}>
                        <div style={preferitiEtichetta}>👤 Creatore</div>
                        <div style={preferitiValoreEvidenza}>
                          {gruppo.creatore || "Non indicato"}
                        </div>
                      </div>

                      <div style={preferitiRiferimentoBox}>
                        <div style={preferitiEtichetta}>
                          🏷️ {gruppo.tipo === "carrello" ? "Descrizione / Ricerca" : "Riferimento / Descrizione"}
                        </div>
                        <div style={preferitiValoreEvidenza}>
                          {gruppo.descrizione_fonte || gruppo.nome_carrello || "Non indicato"}
                        </div>
                      </div>

                      <div style={preferitiMetaBox}>
                        <div style={preferitiEtichetta}>
                          📅 {gruppo.tipo === "carrello" ? "Data carrello" : "Data bolla"}
                        </div>
                        <div style={preferitiDataValore}>
                          {gruppo.data
                            ? dayjs(gruppo.data).format("DD/MM/YYYY")
                            : "-"}
                        </div>
                        <div style={preferitiMaterialiBadge}>
                          📦 {gruppo.materiali.length} materiali
                        </div>
                      </div>
                    </div>

                    <div style={preferitiFonteLista}>
                      {gruppo.materiali.map((p) => (
                        <button
                          type="button"
                          key={`${gruppo.id}_${p.id}`}
                          onClick={() => toggleMaterialeSelezionato(p, gruppo.id)}
                          style={{
                            ...preferitoMaterialeCardNuovo,
                            ...(materialeSelezionato(p, gruppo.id)
                              ? preferitoMaterialeSelezionato
                              : {}),
                          }}
                        >
                          <div style={preferitoCheckbox}>
                            {materialeSelezionato(p, gruppo.id) ? "☑" : "☐"}
                          </div>

                          <div style={preferitoMaterialeTesto}>
                            <div style={preferitoCodice}>
                              {p.codice || "Senza codice"}
                            </div>
                            <div style={preferitoDescrizione}>
                              {p.descrizione || "Senza descrizione"}
                            </div>
                          </div>

                          <div style={preferitoQuantitaDestra}>
                            {p.quantita ? `Fonte: ${p.quantita}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                <div key={i} style={isMobile ? materialCardMobile : materialRow}>
                  <div style={isMobile ? materialCardTestoMobile : { flex: 1 }}>
                    {isMobile ? (
                      <>
                        <div style={materialCodiceMobile}>{m.codice || "Senza codice"}</div>
                        <div style={materialDescrizioneMobile}>{m.descrizione || "Senza descrizione"}</div>
                      </>
                    ) : (
                      <>{m.codice || "-"} — {m.descrizione || "-"}</>
                    )}
                  </div>

                  <div style={isMobile ? materialAzioniMobile : { display: "flex", alignItems: "center", gap: 8 }}>
                    {isMobile && <span style={materialQtaLabelMobile}>Q.tà</span>}
                    <input
                      type="number"
                      min="1"
                      value={m.quantita}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => aggiornaQuantitaMateriale(i, e.target.value)}
                      onBlur={(e) => {
                        if (!(Number(e.target.value) > 0)) aggiornaQuantitaMateriale(i, "1")
                      }}
                      style={isMobile ? materialQtaInputMobile : { ...inputFull, width: 70, marginBottom: 0 }}
                    />

                    <button onClick={() => eliminaMateriale(i)} style={dangerSmall}>
                      ❌
                    </button>
                  </div>
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

const materialCardMobile = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  marginTop: 8,
  padding: 12,
  border: "1px solid #dfe3e8",
  borderRadius: 10,
  background: "white",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
}

const materialCardTestoMobile = {
  minWidth: 0,
  width: "100%",
}

const materialCodiceMobile = {
  fontSize: 12,
  fontWeight: "bold",
  color: "#52606d",
  marginBottom: 4,
  overflowWrap: "anywhere",
}

const materialDescrizioneMobile = {
  fontSize: 15,
  lineHeight: 1.35,
  color: "#111827",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
}

const materialAzioniMobile = {
  display: "grid",
  gridTemplateColumns: "auto 84px 44px",
  alignItems: "center",
  gap: 8,
}

const materialQtaLabelMobile = {
  fontSize: 13,
  fontWeight: "bold",
  color: "#52606d",
}

const materialQtaInputMobile = {
  width: "84px",
  minHeight: 42,
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #b8c2cc",
  borderRadius: 8,
  fontSize: 16,
  textAlign: "center",
}

const preferitiMaterialiBox = {
  marginTop: 12,
  padding: 10,
  border: "1px solid #d5dbe3",
  borderRadius: 10,
  background: "#fff",
}

const preferitiMaterialiHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 10,
}

const preferitiMaterialiSub = {
  marginTop: 3,
  fontSize: 12,
  color: "#667085",
}

const preferitoMaterialeCard = {
  width: "100%",
  display: "block",
  textAlign: "left",
  marginTop: 7,
  padding: 10,
  border: "1px solid #e0e5eb",
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
}

const preferitoCodice = {
  fontSize: 12,
  fontWeight: "bold",
  color: "#475467",
  overflowWrap: "anywhere",
}

const preferitoDescrizione = {
  marginTop: 3,
  fontSize: 14,
  lineHeight: 1.3,
  color: "#101828",
  overflowWrap: "anywhere",
}

const preferitoMeta = {
  marginTop: 5,
  fontSize: 11,
  color: "#667085",
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

const salvaInterventoBox = {
  marginBottom: 12,
  display: "flex",
  justifyContent: "center",
}

const salvaInterventoGrande = {
  width: "100%",
  minHeight: 52,
  border: "none",
  borderRadius: 10,
  background: "#198754",
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  cursor: "pointer",
}

const preferitiFonteGruppo = {
  marginBottom: 14,
  border: "1px solid #d8dee6",
  borderRadius: 10,
  overflow: "hidden",
  background: "#fff",
}

const preferitiFonteHeaderNuovo = {
  display: "grid",
  gridTemplateColumns: "minmax(170px, 0.9fr) minmax(210px, 1.15fr) minmax(260px, 1.35fr) minmax(150px, 0.75fr)",
  gap: 10,
  alignItems: "stretch",
  padding: "10px 12px",
  background: "#eef6ff",
  borderBottom: "1px solid #d7e4f2",
}

const preferitiFonteHeaderMobile = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
  padding: 10,
  background: "#eef6ff",
  borderBottom: "1px solid #d7e4f2",
}

const preferitiBollaMini = {
  padding: "8px 10px",
  minWidth: 0,
}

const preferitiFonteTitolo = {
  fontWeight: 800,
  fontSize: 13,
  letterSpacing: 0.2,
  marginBottom: 4,
}

const preferitiDdtPiccolo = {
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.25,
  overflowWrap: "anywhere",
}

const preferitiOrdinePiccolo = {
  marginTop: 2,
  fontSize: 12,
  color: "#667085",
  overflowWrap: "anywhere",
}

const preferitiCreatoreBox = {
  padding: "9px 12px",
  borderRadius: 8,
  background: "#dfefff",
  minWidth: 0,
}

const preferitiRiferimentoBox = {
  padding: "9px 12px",
  borderRadius: 8,
  background: "#fff3cd",
  minWidth: 0,
}

const preferitiMetaBox = {
  padding: "9px 10px",
  minWidth: 0,
}

const preferitiEtichetta = {
  fontSize: 12,
  color: "#667085",
  marginBottom: 3,
}

const preferitiValoreEvidenza = {
  fontWeight: 800,
  fontSize: 16,
  lineHeight: 1.25,
  color: "#102a43",
  overflowWrap: "anywhere",
}

const preferitiDataValore = {
  fontWeight: 800,
  fontSize: 15,
  color: "#102a43",
}

const preferitiMaterialiBadge = {
  display: "inline-block",
  marginTop: 6,
  padding: "4px 8px",
  borderRadius: 7,
  background: "#e8eef5",
  color: "#475467",
  fontSize: 12,
  fontWeight: 700,
}

const preferitiFonteLista = {
  display: "grid",
  gap: 7,
  padding: 8,
}

const preferitoMaterialeCardNuovo = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  textAlign: "left",
  padding: "9px 12px",
  border: "1px solid #d9e2ec",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
}

const preferitoMaterialeTesto = {
  flex: 1,
  minWidth: 0,
}

const preferitoQuantitaDestra = {
  flex: "0 0 auto",
  minWidth: 62,
  textAlign: "right",
  fontWeight: 700,
  fontSize: 13,
  color: "#475467",
}

const materialiScelteBox = {
  marginTop: 8,
  marginBottom: 12,
  padding: 10,
  border: "1px solid #cfe2ff",
  borderRadius: 10,
  background: "#f8fbff",
}

const materialiSalvatiMsg = {
  marginBottom: 10,
  padding: 9,
  borderRadius: 8,
  background: "#eaf7ee",
  color: "#146c43",
  fontWeight: "bold",
}


const materialiScelteGridDue = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
}



const materialiSelezionatiBox = {
  padding: 10,
  marginBottom: 10,
  border: "2px solid #198754",
  borderRadius: 9,
  background: "#f0fff4",
}

const materialiSelezionatiTitolo = {
  fontWeight: 800,
  marginBottom: 8,
  color: "#146c43",
}

const materialiSelezionatiLista = {
  display: "grid",
  gap: 6,
  marginBottom: 9,
}

const materialeSelezionatoRiga = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: 7,
  background: "white",
  border: "1px solid #dfe7df",
  borderRadius: 7,
}

const quantitaSelezionatoInput = {
  width: 70,
  padding: 7,
  border: "1px solid #cfd8e3",
  borderRadius: 7,
  textAlign: "center",
  fontWeight: 700,
}

const inserisciSelezionatiButton = {
  width: "100%",
  padding: "11px 12px",
  border: "none",
  borderRadius: 8,
  background: "#198754",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
}

const preferitoMaterialeSelezionato = {
  border: "2px solid #198754",
  background: "#ecfdf3",
}

const preferitoCheckbox = {
  flex: "0 0 auto",
  fontSize: 20,
  lineHeight: 1,
  color: "#198754",
}


const ricercaGlobaleRiga = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  marginBottom: 10,
  flexWrap: "wrap",
}

const suggerimentiDropdown = {
  position: "absolute",
  zIndex: 30,
  left: 0,
  right: 0,
  top: "100%",
  marginTop: 4,
  background: "white",
  border: "1px solid #cfd8e3",
  borderRadius: 8,
  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
  maxHeight: 260,
  overflowY: "auto",
}

const suggerimentoRiga = {
  width: "100%",
  textAlign: "left",
  padding: "9px 10px",
  border: "none",
  borderBottom: "1px solid #edf1f5",
  background: "white",
  cursor: "pointer",
  fontSize: 13,
}

const descrizioneFiltriBox = {
  padding: 10,
  marginBottom: 10,
  border: "1px solid #d9e2ec",
  borderRadius: 8,
  background: "#f8fbff",
}

const descrizioneFiltriTitolo = {
  fontWeight: 800,
  fontSize: 14,
  marginBottom: 3,
  color: "#17365d",
}

const descrizioneFiltriSub = {
  fontSize: 12,
  color: "#667085",
  marginBottom: 8,
}

const descrizioneFiltriGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
}

const descrizioneFiltriAzioni = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
}

const descrizioneRisultatiCount = {
  fontSize: 13,
  color: "#475467",
}

const preferitiTipoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 10,
}

const preferitiTipoButton = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cfd8e3",
  background: "white",
  color: "#17365d",
  fontWeight: 800,
  cursor: "pointer",
}

const preferitiTipoButtonAttivo = {
  ...preferitiTipoButton,
  background: "#0d6efd",
  color: "white",
  border: "1px solid #0d6efd",
}

const preferitiDateBox = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "end",
  padding: 10,
  marginBottom: 10,
  border: "1px solid #d9e2ec",
  borderRadius: 8,
  background: "#f8fbff",
}

const preferitiDateIntro = {
  width: "100%",
  fontSize: 12,
  color: "#667085",
  marginBottom: 2,
}

const preferitiDateLabel = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 12,
  fontWeight: 700,
  color: "#475467",
}

const preferitiDateInput = {
  padding: "8px 9px",
  borderRadius: 7,
  border: "1px solid #cfd8e3",
  background: "white",
}

const preferitiDateButton = {
  padding: "9px 12px",
  borderRadius: 7,
  border: "none",
  background: "#0d6efd",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
}

const preferitiDateButtonLight = {
  ...preferitiDateButton,
  background: "white",
  color: "#17365d",
  border: "1px solid #cfd8e3",
}

const materialiScelteGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
}

const materialeSceltaButton = {
  minHeight: 48,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #b6c8e6",
  background: "white",
  color: "#17365d",
  fontWeight: "bold",
  cursor: "pointer",
}

const infoBox = {
  background: "#f8f9fa",
  border: "1px solid #ddd",
  padding: 10,
  borderRadius: 8,
  fontSize: 13,
}