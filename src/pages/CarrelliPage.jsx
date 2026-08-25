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
      .order("id", { ascending: true })

    if (error) {
      console.error(error)
      alert("Errore caricamento righe carrello: " + error.message)
      return
    }

    setRighe(data || [])

    setTimeout(() => {
      dettaglioCarrelloRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      })
    }, 150)
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
        .insert(materiali.map(m => ({
          bolla_id: carrello.id,
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

      setSelected(null)
      setRighe([])
      setRigheSelezionate([])
      setDescrizioneRicerca("")
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
          materiali.map(m => ({
            bolla_id: carrello.id,
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

      <h3 style={{ marginTop: 20 }}>Filtri carrelli</h3>

      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }}>
        <input
          placeholder="Nome carrello"
          value={searchNome}
          onChange={(e) => setSearchNome(e.target.value)}
          style={isMobile ? { width: "100%", boxSizing: "border-box", padding: 8 } : undefined}
        />

        <span>Da:</span>

        <input
          type="date"
          value={dataDa}
          onChange={(e) => setDataDa(e.target.value)}
          style={isMobile ? { flex: 1, minWidth: 0, padding: 8 } : undefined}
        />

        <span>A:</span>

        <input
          type="date"
          value={dataA}
          onChange={(e) => setDataA(e.target.value)}
          style={isMobile ? { flex: 1, minWidth: 0, padding: 8 } : undefined}
        />

        <button
          onClick={() => {
            setSearchNome("")
            setDataDa("")
            setDataA("")
          }}
        >
          Reset
        </button>

        <button onClick={caricaCarrelli}>
          🔄 Aggiorna
        </button>

        <span>
          Risultati: <b>{carrelliFiltrati.length}</b>
        </span>
      </div>

      <h3 style={{ marginTop: 20 }}>Lista carrelli</h3>

      <div style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 10
      }}>
        <button
          onClick={modificaNomeCarrelloSelezionato}
          disabled={!selected}
          style={{
            background: selected ? "#0d6efd" : "#ccc",
            color: selected ? "white" : "black",
            border: "none",
            padding: "8px 12px",
            borderRadius: 5,
            cursor: selected ? "pointer" : "not-allowed"
          }}
        >
          ✏️ Modifica nome carrello selezionato
        </button>

        <button
          onClick={eliminaCarrelloSelezionato}
          disabled={!selected}
          style={{
            background: selected ? "#dc3545" : "#ccc",
            color: selected ? "white" : "black",
            border: "none",
            padding: "8px 12px",
            borderRadius: 5,
            cursor: selected ? "pointer" : "not-allowed"
          }}
        >
          🗑 Elimina carrello selezionato
        </button>
      </div>

      {selected && (
        <div style={{
          marginBottom: 10,
          padding: 10,
          background: "#e7f1ff",
          border: "1px solid #9ec5fe",
          borderRadius: 6
        }}>
          Carrello selezionato:{" "}
          <b>{selected.nome_carrello || selected.nome || "Carrello"}</b>
        </div>
      )}

      {carrelliFiltrati.length === 0 && (
        <div style={{
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff"
        }}>
          Nessun carrello trovato.
        </div>
      )}

      {carrelliFiltrati.map(c => {
        const nomeCarrello = c.nome || c.nome_carrello || "Carrello"

        return (
          <div
            key={c.id}
            onClick={() => selezionaCarrello(c)}
            style={{
              border: selected?.id === c.id ? "2px solid #0d6efd" : "1px solid #ccc",
              padding: 10,
              marginTop: 5,
              cursor: "pointer",
              borderRadius: 6,
              background: selected?.id === c.id ? "#e3f2fd" : "white"
            }}
          >
            🛒 <b>{nomeCarrello}</b> — {c.data ? new Date(c.data).toLocaleDateString() : ""}

            {c.descrizione_ricerca && (
              <div style={{
                marginTop: 6,
                padding: 6,
                background: "#fff3cd",
                border: "1px solid #ffe69c",
                borderRadius: 5,
                fontSize: 13
              }}>
                📝 Ricerca veloce: <b>{c.descrizione_ricerca}</b>
              </div>
            )}
          </div>
        )
      })}

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

          <div style={{ overflowX: isMobile ? "auto" : "visible" }}>
          {righeFiltrate.map((r) => {
            const giaPresente = materialeGiaPresente(r)
            const rigaId = idRigaCarrello(r)

            return (
              <div
                key={rigaId}
                style={{
                  display: "grid",
                  gridTemplateColumns: mostraPrezzi
                    ? "45px 130px 1fr 90px 110px 180px"
                    : "45px 130px 1fr 90px 180px",
                  minWidth: isMobile ? (mostraPrezzi ? 760 : 640) : "auto",
                  gap: 10,
                  borderBottom: "1px solid #ddd",
                  padding: 6,
                  alignItems: "center",
                  background: giaPresente ? "#fff3cd" : rigaSelezionata(r) ? "#e7f1ff" : "transparent",
                  borderLeft: giaPresente ? "5px solid #ff9800" : "none"
                }}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={rigaSelezionata(r)}
                    onChange={() => toggleRigaSelezionata(r)}
                    style={{
                      width: 22,
                      height: 22,
                      cursor: "pointer"
                    }}
                  />
                </div>

                <div>
                  <input
                    value={r.codice || ""}
                    onChange={(e) => aggiornaCampoRiga(rigaId, "codice", e.target.value)}
                    placeholder="Codice"
                    style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
                  />

                  {giaPresente && (
                    <div style={{
                      fontSize: 12,
                      color: "#856404",
                      fontWeight: "bold",
                      marginTop: 3
                    }}>
                      ⚠️ già presente
                    </div>
                  )}
                </div>

                <div>
                  <input
                    value={r.descrizione || ""}
                    onChange={(e) => aggiornaCampoRiga(rigaId, "descrizione", e.target.value)}
                    placeholder="Descrizione"
                    style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <input
                    type="number"
                    value={r.quantita || ""}
                    onChange={(e) => aggiornaCampoRiga(rigaId, "quantita", e.target.value)}
                    placeholder="Qta"
                    style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
                  />
                </div>

                {mostraPrezzi && (
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      value={r.prezzo || ""}
                      onChange={(e) => aggiornaCampoRiga(rigaId, "prezzo", e.target.value)}
                      placeholder="Prezzo"
                      style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
                    />
                    <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                      {formatPrezzo(r.prezzo)}
                    </div>
                  </div>
                )}

                <div style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap"
                }}>
                  <button
                    onClick={() => salvaRigaCarrello(r)}
                    disabled={salvandoRigaId === r.id}
                    style={{
                      background: "#198754",
                      color: "white",
                      border: "none",
                      padding: "6px 8px",
                      borderRadius: 5,
                      cursor: salvandoRigaId === r.id ? "not-allowed" : "pointer"
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
                      padding: "6px 8px",
                      borderRadius: 5,
                      cursor: "pointer"
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