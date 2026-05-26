import { useEffect, useRef, useState } from "react"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function InterventiPage() {

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
    quantita: 1
  })

  const formVuoto = {
    cliente_id: "",
    cliente_nome: "",
    cantiere_id: "",
    data: dataDaUrl || dayjs().format("YYYY-MM-DD"),
    descrizione: "",
    operatori: [],
    materiali: []
  }

  const [form, setForm] = useState(formVuoto)

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
    const testo = form.cliente_nome.trim().toLowerCase()

    if (!testo) return []

    return clienti
      .filter(c => c.nome.toLowerCase().includes(testo))
      .slice(0, 8)
  }

  function vaiAllaData() {
    setTimeout(() => {
      dataInputRef.current?.focus()
    }, 100)
  }

  function vaiAlCantiere() {
    setTimeout(() => {
      if (cantiereSelectRef.current && cantieri.length > 0) {
        cantiereSelectRef.current.focus()
      } else {
        dataInputRef.current?.focus()
      }
    }, 150)
  }

  function gestisciTastieraCliente(e) {
    const lista = clientiFiltrati()

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!lista.length) return
      setShowClienti(true)
      setClienteEvidenziato(prev =>
        prev >= lista.length - 1 ? 0 : prev + 1
      )
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (!lista.length) return
      setShowClienti(true)
      setClienteEvidenziato(prev =>
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
      setForm(prev => ({
        ...prev,
        data: nuovaData.format("YYYY-MM-DD")
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
    const primoVuoto = form.operatori.findIndex(op => !op.operatore_id)

    if (primoVuoto >= 0) {
      setTimeout(() => {
        operatoreInputRefs.current[primoVuoto]?.focus()
      }, 100)
      return
    }

    const nuovoIndex = form.operatori.length

    setForm(prev => ({
      ...prev,
      operatori: [...prev.operatori, { operatore_id: "", ore: "" }]
    }))

    setOperatoriRicerca(prev => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = ""
      return nuovo
    })

    setShowOperatori(prev => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = false
      return nuovo
    })

    setOperatoreEvidenziato(prev => {
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
    return operatoriDB.find(op => String(op.id) === String(id))?.nome || ""
  }

  function operatoriFiltrati(index) {
    const testo = (operatoriRicerca[index] || "").trim().toLowerCase()

    if (!testo) return []

    const inizioUguale = operatoriDB.filter(op =>
      op.nome.toLowerCase().startsWith(testo)
    )

    const contieneTesto = operatoriDB.filter(op =>
      !op.nome.toLowerCase().startsWith(testo) &&
      op.nome.toLowerCase().includes(testo)
    )

    return [
      ...inizioUguale,
      ...contieneTesto
    ].slice(0, 8)
  }

  function aggiornaRicercaOperatore(index, valore) {
    setOperatoriRicerca(prev => {
      const nuovo = [...prev]
      nuovo[index] = valore
      return nuovo
    })

    setShowOperatori(prev => {
      const nuovo = [...prev]
      nuovo[index] = true
      return nuovo
    })

    setOperatoreEvidenziato(prev => {
      const nuovo = [...prev]
      nuovo[index] = 0
      return nuovo
    })

    setForm(prev => ({
      ...prev,
      operatori: prev.operatori.map((op, i) =>
        i === index ? { ...op, operatore_id: "" } : op
      )
    }))
  }

  function selezionaOperatore(op, index, passaAlleOre = false) {
    setForm(prev => ({
      ...prev,
      operatori: prev.operatori.map((riga, i) =>
        i === index ? { ...riga, operatore_id: op.id } : riga
      )
    }))

    setOperatoriRicerca(prev => {
      const nuovo = [...prev]
      nuovo[index] = op.nome
      return nuovo
    })

    setShowOperatori(prev => {
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
      setShowOperatori(prev => {
        const nuovo = [...prev]
        nuovo[index] = true
        return nuovo
      })
      setOperatoreEvidenziato(prev => {
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
      setShowOperatori(prev => {
        const nuovo = [...prev]
        nuovo[index] = true
        return nuovo
      })
      setOperatoreEvidenziato(prev => {
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
        selezionaOperatore(lista[operatoreEvidenziato[index] || 0] || lista[0], index, true)
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
    setForm(prev => ({
      ...prev,
      cliente_id: c.id,
      cliente_nome: c.nome,
      cantiere_id: ""
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

  function aggiungiMateriale(item) {
    setForm(prev => {
      const codice = item.codice || ""
      const descrizione = item.descrizione || ""

      const esistente = prev.materiali.find(m =>
        (codice && m.codice === codice) ||
        (!codice && descrizione && m.descrizione === descrizione)
      )

      if (esistente) {
        alert("Materiale già inserito")
        return prev
      }

      return {
        ...prev,
        materiali: [
          ...prev.materiali,
          {
            codice,
            descrizione,
            quantita: 1
          }
        ]
      }
    })
  }

  function eliminaMateriale(index) {
    setForm(prev => ({
      ...prev,
      materiali: prev.materiali.filter((_, i) => i !== index)
    }))
  }

  function aggiornaQuantitaMateriale(index, valore) {
    const quantita = Number(valore)

    setForm(prev => ({
      ...prev,
      materiali: prev.materiali.map((m, i) =>
        i === index
          ? { ...m, quantita: quantita > 0 ? quantita : 1 }
          : m
      )
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

    alert("✅ Bolla ripristinata")
  }

  function aggiungiMaterialeManuale() {
    const codice = altroMat.codice.trim()
    const descrizione = altroMat.descrizione.trim()
    const quantita = Number(altroMat.quantita || 1)

    if (!codice && !descrizione) {
      alert("Inserisci almeno codice o descrizione")
      return
    }

    const esisteGia = form.materiali.some(m =>
      (codice && m.codice === codice) ||
      (!codice && descrizione && m.descrizione === descrizione)
    )

    if (esisteGia) {
      alert("Materiale già inserito")
      return
    }

    setForm(prev => ({
      ...prev,
      materiali: [
        ...prev.materiali,
        {
          codice,
          descrizione,
          quantita: quantita > 0 ? quantita : 1
        }
      ]
    }))

    setAltroMat({
      codice: "",
      descrizione: "",
      quantita: 1
    })

    setShowAltroMat(false)
  }

  function aggiungiOperatore(focusNuovo = false) {
    const nuovoIndex = form.operatori.length

    setForm(prev => ({
      ...prev,
      operatori: [...prev.operatori, { operatore_id: "", ore: "" }]
    }))

    setOperatoriRicerca(prev => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = ""
      return nuovo
    })

    setShowOperatori(prev => {
      const nuovo = [...prev]
      nuovo[nuovoIndex] = false
      return nuovo
    })

    setOperatoreEvidenziato(prev => {
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
    setForm(prev => ({
      ...prev,
      operatori: prev.operatori.map((op, index) =>
        index === i ? { ...op, [campo]: valore } : op
      )
    }))
  }

  function eliminaOperatore(i) {
    setForm(prev => ({
      ...prev,
      operatori: prev.operatori.filter((_, idx) => idx !== i)
    }))

    setOperatoriRicerca(prev => prev.filter((_, idx) => idx !== i))
    setShowOperatori(prev => prev.filter((_, idx) => idx !== i))
    setOperatoreEvidenziato(prev => prev.filter((_, idx) => idx !== i))
  }

  function nuovoIntervento() {
    if (editingId) {
      const conferma = confirm("Vuoi uscire da questo intervento e crearne uno nuovo?")
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
      materiali: []
    })
    setCantieri([])
    setOperatoriRicerca([])
    setShowOperatori([])
    setOperatoreEvidenziato([])
    setSearchMat("")
    setAltroMat({
      codice: "",
      descrizione: "",
      quantita: 1
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
      .select("*")
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

    const operatoriCaricati = (ops || []).map(o => ({
      operatore_id: o.operatore_id,
      ore: o.ore
    }))

    setForm({
      cliente_id: i.cliente_id || "",
      cliente_nome: i.clienti?.nome || "",
      cantiere_id: i.cantiere_id || "",
      data: i.data || dayjs().format("YYYY-MM-DD"),
      descrizione: i.descrizione || "",
      operatori: operatoriCaricati,
      materiali: (mats || []).map(m => ({
        id: m.id,
        codice: m.codice || "",
        descrizione: m.descrizione || "",
        quantita: m.codice === "BOLLA" ? 0 : (m.quantita || 1)
      }))
    })

    setOperatoriRicerca(operatoriCaricati.map(o => nomeOperatoreDaId(o.operatore_id)))
    setShowOperatori(operatoriCaricati.map(() => false))
    setOperatoreEvidenziato(operatoriCaricati.map(() => 0))

    setAltroMat({
      codice: "",
      descrizione: "",
      quantita: 1
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
      setEditingId(null)
      setForm({
        cliente_id: "",
        cliente_nome: "",
        cantiere_id: "",
        data: dataDaUrl || dayjs().format("YYYY-MM-DD"),
        descrizione: "",
        operatori: [],
        materiali: []
      })
      setCantieri([])
    }

    caricaInterventi()
  }

  async function eliminaIntervento(i) {
    if (!i?.id) return

    if (!confirm("Eliminare intervento?")) return

    const conferma2 = confirm("Sei sicuro? Verranno eliminate anche ore operatori e materiali.")
    if (!conferma2) return

    const { error: errorOre } = await supabase
      .from("ore_operatori")
      .delete()
      .eq("intervento_id", i.id)

    if (errorOre) {
      console.error(errorOre)
      alert("Errore eliminazione ore operatori: " + errorOre.message)
      return
    }

    const { error: errorMateriali } = await supabase
      .from("materiali_bollettino")
      .delete()
      .eq("intervento_id", i.id)

    if (errorMateriali) {
      console.error(errorMateriali)
      alert("Errore eliminazione materiali: " + errorMateriali.message)
      return
    }

    const { error: errorIntervento } = await supabase
      .from("interventi")
      .delete()
      .eq("id", i.id)

    if (errorIntervento) {
      console.error(errorIntervento)
      alert("Errore eliminazione intervento: " + errorIntervento.message)
      return
    }

    if (editingId === i.id) {
      setEditingId(null)
      setForm({
        cliente_id: "",
        cliente_nome: "",
        cantiere_id: "",
        data: dataDaUrl || dayjs().format("YYYY-MM-DD"),
        descrizione: "",
        operatori: [],
        materiali: []
      })
      setCantieri([])
    }

    alert("✅ Intervento eliminato")
    caricaInterventi()
  }

  function vaiABolle() {
    if (!editingId) {
      alert("Prima salva l'intervento. Dopo il salvataggio potrai importare la bolla direttamente qui.")
      return
    }

    navigate(`/bolle?intervento_id=${editingId}`)
  }

  function vaiACarrelli() {
    if (!editingId) {
      alert("Prima salva l'intervento. Dopo il salvataggio potrai importare il carrello direttamente qui.")
      return
    }

    navigate(`/carrelli?intervento_id=${editingId}`)
  }

  function vaiAPreferiti() {
    if (!editingId) {
      alert("Prima salva l'intervento. Dopo il salvataggio potrai importare i preferiti direttamente qui.")
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
            archiviato: false
          })
          .eq("id", editingId)

        if (updateError) {
          console.error(updateError)
          alert("Errore aggiornamento intervento: " + updateError.message)
          return
        }

        int = { id: editingId }

        const { error: delOpsError } = await supabase
          .from("ore_operatori")
          .delete()
          .eq("intervento_id", editingId)

        if (delOpsError) {
          console.error(delOpsError)
          alert("Errore aggiornamento operatori: " + delOpsError.message)
          return
        }

        const { error: delMatsError } = await supabase
          .from("materiali_bollettino")
          .delete()
          .eq("intervento_id", editingId)

        if (delMatsError) {
          console.error(delMatsError)
          alert("Errore aggiornamento materiali: " + delMatsError.message)
          return
        }

      } else {
        const { data, error: insertError } = await supabase
          .from("interventi")
          .insert([{
            cliente_id: form.cliente_id,
            cantiere_id: form.cantiere_id || null,
            data: form.data,
            descrizione: form.descrizione.trim(),
            archiviato: false
          }])
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
        .filter(o => o.operatore_id && Number(o.ore || 0) > 0)
        .map(o => ({
          intervento_id: int.id,
          operatore_id: o.operatore_id,
          ore: Number(o.ore || 0)
        }))

      if (ops.length) {
        const { error: opsInsertError } = await supabase
          .from("ore_operatori")
          .insert(ops)

        if (opsInsertError) {
          console.error(opsInsertError)
          alert("Errore salvataggio operatori: " + opsInsertError.message)
          return
        }
      }

      const mats = form.materiali
        .filter(m => m.codice || m.descrizione)
        .map(m => ({
          intervento_id: int.id,
          codice: m.codice || "",
          descrizione: m.descrizione || "",
          quantita:
            m.codice === "BOLLA"
              ? 0
              : Number(m.quantita || 1) > 0
                ? Number(m.quantita || 1)
                : 1
        }))

      if (mats.length) {
        const { error: matsInsertError } = await supabase
          .from("materiali_bollettino")
          .insert(mats)

        if (matsInsertError) {
          console.error(matsInsertError)
          alert("Errore salvataggio materiali: " + matsInsertError.message)
          return
        }
      }

      setEditingId(int.id)

      alert(editingId
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
    <div style={{ padding: 20 }}>

      <h2>Interventi</h2>

      {editingId && (
        <div style={{
          background: "#fff3cd",
          color: "#856404",
          border: "1px solid #ffeeba",
          padding: 10,
          marginBottom: 10,
          borderRadius: 6,
          fontWeight: "bold"
        }}>
          ✏️ INTERVENTO IN MODIFICA / APERTO: #{editingId}
          <div style={{ fontWeight: "normal", marginTop: 4 }}>
            Puoi aggiornare i dati oppure importare bolle, carrelli e preferiti direttamente in questo intervento.
          </div>
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input
          ref={clienteInputRef}
          placeholder="Cerca cliente..."
          value={form.cliente_nome}
          onChange={(e) => {
            setForm({ ...form, cliente_nome: e.target.value, cliente_id: "", cantiere_id: "" })
            setCantieri([])
            setShowClienti(true)
            setClienteEvidenziato(0)
          }}
          onFocus={() => setShowClienti(true)}
          onKeyDown={gestisciTastieraCliente}
          onBlur={() => setTimeout(() => setShowClienti(false), 200)}
        />

        {showClienti && form.cliente_nome && (
          <div style={{
            border: "1px solid #ccc",
            position: "absolute",
            background: "white",
            width: "100%",
            zIndex: 10
          }}>
            {clientiFiltrati()
              .map((c, index) => (
                <div
                  key={c.id}
                  onMouseEnter={() => setClienteEvidenziato(index)}
                  onClick={() => selezionaCliente(c, true)}
                  style={{
                    padding: 8,
                    cursor: "pointer",
                    background: clienteEvidenziato === index ? "#dbeafe" : "white",
                    fontWeight: clienteEvidenziato === index ? "bold" : "normal"
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
        onChange={e => setForm({ ...form, cantiere_id: e.target.value })}
        onKeyDown={gestisciTastieraCantiere}
      >
        <option value="">Seleziona cantiere</option>
        {cantieri.map(c => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <input
        ref={dataInputRef}
        type="date"
        value={form.data}
        onChange={e => setForm({ ...form, data: e.target.value })}
        onKeyDown={gestisciTastieraData}
      />

      <input
        ref={descrizioneInputRef}
        placeholder="Descrizione"
        value={form.descrizione}
        onChange={e => setForm({ ...form, descrizione: e.target.value })}
        onKeyDown={gestisciTastieraDescrizione}
        onKeyUp={gestisciTastieraDescrizione}
      />

      <h4>Operatori</h4>

      {form.operatori.map((op, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative", minWidth: 240, flex: 1 }}>
            <input
              ref={el => operatoreInputRefs.current[i] = el}
              placeholder="Cerca operatore..."
              value={operatoriRicerca[i] ?? nomeOperatoreDaId(op.operatore_id)}
              onChange={e => aggiornaRicercaOperatore(i, e.target.value)}
              onFocus={() => {
                setShowOperatori(prev => {
                  const nuovo = [...prev]
                  nuovo[i] = true
                  return nuovo
                })
              }}
              onKeyDown={e => gestisciTastieraOperatore(e, i)}
              onBlur={() => {
                setTimeout(() => {
                  setShowOperatori(prev => {
                    const nuovo = [...prev]
                    nuovo[i] = false
                    return nuovo
                  })
                }, 200)
              }}
              style={{ width: "100%" }}
            />

            {showOperatori[i] && operatoriRicerca[i] && (
              <div style={{
                border: "1px solid #ccc",
                position: "absolute",
                background: "white",
                width: "100%",
                zIndex: 20
              }}>
                {operatoriFiltrati(i).map((operatore, index) => (
                  <div
                    key={operatore.id}
                    onMouseEnter={() => {
                      setOperatoreEvidenziato(prev => {
                        const nuovo = [...prev]
                        nuovo[i] = index
                        return nuovo
                      })
                    }}
                    onClick={() => selezionaOperatore(operatore, i, true)}
                    style={{
                      padding: 8,
                      cursor: "pointer",
                      background: (operatoreEvidenziato[i] || 0) === index ? "#dbeafe" : "white",
                      fontWeight: (operatoreEvidenziato[i] || 0) === index ? "bold" : "normal"
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
            ref={el => oreInputRefs.current[i] = el}
            type="number"
            min="0"
            step="0.5"
            placeholder="Ore"
            value={op.ore}
            onChange={e => aggiornaOperatore(i, "ore", e.target.value)}
            onKeyDown={e => gestisciTastieraOre(e, i)}
            style={{ width: 90 }}
          />

          <button onClick={() => eliminaOperatore(i)}>❌</button>
        </div>
      ))}

      <button onClick={() => aggiungiOperatore(true)}>➕ Operatore</button>

      <br /><br />

      <div style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <button
          ref={salvaButtonRef}
          onClick={salva}
          disabled={saving}
          style={{
            background: editingId ? "#0d6efd" : "#2f64d6",
            color: "white",
            padding: "8px 14px",
            border: "none",
            borderRadius: 5,
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: "bold"
          }}
        >
          {saving ? "Salvataggio..." : editingId ? "💾 Aggiorna Intervento" : "💾 Salva Intervento"}
        </button>

        {!editingId && (
          <span style={{
            background: "#f8f9fa",
            border: "1px solid #ddd",
            padding: "8px 10px",
            borderRadius: 6
          }}>
            Prima salva l’intervento. Dopo il salvataggio potrai importare materiale qui.
          </span>
        )}

        {editingId && (
          <button
            onClick={nuovoIntervento}
            style={{
              padding: "8px 14px",
              borderRadius: 5,
              cursor: "pointer"
            }}
          >
            🧹 Nuovo intervento
          </button>
        )}
      </div>

      <div style={{
        marginTop: 18,
        display: "flex",
        gap: 10,
        flexWrap: "wrap"
      }}>
        <button onClick={vaiABolle}>
          📦 Bolla
        </button>

        <button onClick={vaiACarrelli}>
          📥 Carrello
        </button>

        <button onClick={vaiAPreferiti}>
          ⭐ Preferiti
        </button>
      </div>

      <div style={{
        marginTop: 10,
        fontWeight: "bold",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap"
      }}>
        <span>📦 Materiali inseriti nell’intervento</span>

        {!showAltroMat && (
          <button onClick={() => setShowAltroMat(true)}>
            ➕ Aggiungi materiale libero
          </button>
        )}

        {showAltroMat && (
          <button
            onClick={() => {
              setShowAltroMat(false)
              setAltroMat({
                codice: "",
                descrizione: "",
                quantita: 1
              })
            }}
          >
            ❌ Chiudi
          </button>
        )}
      </div>

      {showAltroMat && (
        <div style={{
          marginTop: 8,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          border: "1px solid #ddd",
          padding: 8,
          borderRadius: 6,
          background: "#f8f9fa"
        }}>
          <input
            placeholder="Codice"
            value={altroMat.codice}
            onChange={(e) => setAltroMat(prev => ({ ...prev, codice: e.target.value }))}
            style={{ padding: 6, minWidth: 120 }}
          />

          <input
            placeholder="Descrizione"
            value={altroMat.descrizione}
            onChange={(e) => setAltroMat(prev => ({ ...prev, descrizione: e.target.value }))}
            style={{ padding: 6, minWidth: 260, flex: 1 }}
          />

          <input
            type="number"
            min="1"
            placeholder="Qta"
            value={altroMat.quantita}
            onChange={(e) => setAltroMat(prev => ({ ...prev, quantita: e.target.value }))}
            style={{ padding: 6, width: 80 }}
          />

          <button onClick={aggiungiMaterialeManuale}>
            ➕ Altro
          </button>
        </div>
      )}

      {form.materiali.length === 0 && (
        <div style={{
          marginTop: 10,
          padding: 8,
          border: "1px solid #eee",
          background: "#fafafa",
          borderRadius: 6
        }}>
          Nessun materiale inserito.
        </div>
      )}

      {form.materiali.map((m, i) => {
        if (m.codice === "BOLLA") {
          return (
            <div
              key={i}
              style={{
                marginTop: 14,
                padding: 12,
                background: "#eef4ff",
                border: "2px solid #0d6efd",
                borderRadius: 8,
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap"
              }}
            >
              <div>{m.descrizione}</div>

              <button
                type="button"
                onClick={() => ripristinaBolla(m)}
                style={{
                  background: "#ffc107",
                  border: "none",
                  padding: "7px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                ↩ Ripristina bolla
              </button>
            </div>
          )
        }

        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              borderBottom: "1px solid #eee",
              padding: "6px 0"
            }}
          >
            <div style={{ flex: 1 }}>
              {m.codice || "-"} — {m.descrizione || "-"}
            </div>

            <input
              type="number"
              min="1"
              value={m.quantita}
              onChange={(e) => aggiornaQuantitaMateriale(i, e.target.value)}
              style={{ width: 70 }}
            />

            <button onClick={() => eliminaMateriale(i)}>❌</button>
          </div>
        )
      })}

      <br /><br />

      <h3 style={{ marginTop: 30 }}>📋 Interventi salvati</h3>

      {interventi.length === 0 && (
        <div style={{
          marginTop: 10,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 6,
          background: "#fff"
        }}>
          Nessun intervento salvato.
        </div>
      )}

      {interventi.map(i => (
        <div key={i.id} style={{
          border: editingId === i.id ? "2px solid orange" : "1px solid #ccc",
          padding: 12,
          marginTop: 8,
          borderRadius: 6,
          background: editingId === i.id ? "#fffaf0" : "white"
        }}>
          <div><b>{i.data ? dayjs(i.data).format("DD/MM/YYYY") : "-"}</b></div>
          <div><b>Cliente:</b> {i.clienti?.nome || "-"}</div>
          <div><b>Cantiere:</b> {i.cantieri?.nome || "-"}</div>
          <div><b>Descrizione:</b> {i.descrizione || "-"}</div>
          <div><b>Materiali:</b> {i.materiali_bollettino?.length || 0}</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>

            <button onClick={() => navigate(`/bollettino/${i.id}`)}>
              👁 Apri
            </button>

            <button onClick={() => modificaIntervento(i)}>
              ✏️ Modifica
            </button>

            <button onClick={() => navigate(`/bolle?intervento_id=${i.id}`)}>
              📦 Bolla
            </button>

            <button onClick={() => navigate(`/carrelli?intervento_id=${i.id}`)}>
              📥 Carrello
            </button>

            <button onClick={() => navigate(`/preferiti?intervento_id=${i.id}`)}>
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
  )
}