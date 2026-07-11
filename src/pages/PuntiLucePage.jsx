import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../supabaseClient"
import * as XLSX from "xlsx"

const serieCivili = ["Living", "Matix", "Linea", "Now", "Altro"]

const scatoleDisponibili = [
  { codice: "503", moduli: 3, descrizioneSupporto: "Supporto 503", descrizionePlacca: "Placca 503" },
  { codice: "504", moduli: 4, descrizioneSupporto: "Supporto 504", descrizionePlacca: "Placca 504" },
  { codice: "506", moduli: 6, descrizioneSupporto: "Supporto 506", descrizionePlacca: "Placca 506" },
  { codice: "507", moduli: 7, descrizioneSupporto: "Supporto 507", descrizionePlacca: "Placca 507" }
]

function creaStanzaVuota(nome = "") {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    nome,
    scatole: { "503": 0, "504": 0, "506": 0, "507": 0 },
    punti: []
  }
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
  const [ultimoId, setUltimoId] = useState(null)
  const ultimoRef = useRef(null)

  const [nuovo, setNuovo] = useState({
    quantita: 1,
    capitolo: "",
    tipo: "",
    posti: 1,
    descrizione: ""
  })

  useEffect(() => {
    caricaClienti()
    caricaVoci()
  }, [])

  useEffect(() => {
    if (vociDB.length > 0 && !nuovo.capitolo) {
      const primoCapitolo = vociDB[0].capitolo
      const primaVoce = vociDB.find(v => v.capitolo === primoCapitolo)
      setNuovo(prev => ({
        ...prev,
        capitolo: primoCapitolo,
        tipo: primaVoce?.voce || "",
        posti: primaVoce?.posti_default || 1
      }))
    }
  }, [vociDB])

  useEffect(() => {
    if (ultimoRef.current) {
      ultimoRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [ultimoId])

  useEffect(() => {
    if (!clienteId || !serie) {
      setStanze([])
      setStanzaIdCorrente("")
      setProgettoCaricato(false)
      return
    }

    const salvato = localStorage.getItem(getStorageKey(clienteId, serie))

    if (salvato) {
      try {
        const progetto = JSON.parse(salvato)
        const stanzeSalvate = Array.isArray(progetto.stanze) ? progetto.stanze : []
        setStanze(stanzeSalvate)
        setStanzaIdCorrente(stanzeSalvate[0]?.id || "")
      } catch (error) {
        console.error("Errore lettura progetto:", error)
        setStanze([])
        setStanzaIdCorrente("")
      }
    } else {
      setStanze([])
      setStanzaIdCorrente("")
    }

    setProgettoCaricato(true)
  }, [clienteId, serie])

  useEffect(() => {
    if (!progettoCaricato || !clienteId || !serie) return

    const timer = setTimeout(() => {
      localStorage.setItem(
        getStorageKey(clienteId, serie),
        JSON.stringify({ clienteId, serie, stanze, aggiornatoIl: new Date().toISOString() })
      )
      setUltimoSalvataggio(new Date().toLocaleTimeString())
    }, 350)

    return () => clearTimeout(timer)
  }, [stanze, clienteId, serie, progettoCaricato])

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
    return `punti_luce_v2_${idCliente}_${nomeSerie}`
  }

  const capitoli = useMemo(
    () => [...new Set(vociDB.map(v => v.capitolo).filter(Boolean))],
    [vociDB]
  )

  const vociCapitolo = vociDB.filter(v => v.capitolo === nuovo.capitolo)
  const stanzaCorrente = stanze.find(s => String(s.id) === String(stanzaIdCorrente)) || null
  const clienteSelezionato = clienti.find(c => String(c.id) === String(clienteId))

  function getVoceConfigDaNuovo() {
    return vociDB.find(v => v.capitolo === nuovo.capitolo && v.voce === nuovo.tipo)
  }

  function getVoceConfigDaPunto(punto) {
    return vociDB.find(v => v.capitolo === punto.capitolo && v.voce === punto.tipo)
  }

  function labelCapitolo(capitolo) {
    return String(capitolo || "").replaceAll("_", " ").toUpperCase()
  }

  function postiEffettivi() {
    const voce = getVoceConfigDaNuovo()
    if (!voce) return 1
    if (voce.richiede_posti) return Number(nuovo.posti || voce.posti_default || 1)
    return Number(voce.posti_fissi || 1)
  }

  function descrizioneAutomatica() {
    const voce = getVoceConfigDaNuovo()
    if (!voce) return ""
    if (voce.richiede_posti) return `${voce.voce} da ${postiEffettivi()} posti`
    return voce.voce
  }

  function calcolaModuliDaScatole(scatole = {}) {
    return scatoleDisponibili.reduce(
      (tot, s) => tot + Number(scatole[s.codice] || 0) * s.moduli,
      0
    )
  }

  function calcolaModuliPunto(punto) {
    const config = getVoceConfigDaPunto(punto)
    if (!config) return 0
    const qta = Number(punto.quantita || 0)
    if (config.richiede_posti) {
      return qta * Number(punto.posti || config.posti_default || 1)
    }
    return qta * Number(config.moduli || 0)
  }

  function calcolaModuliUsati(punti = []) {
    return punti.reduce((tot, p) => tot + calcolaModuliPunto(p), 0)
  }

  const moduliTotaliCorrente = stanzaCorrente ? calcolaModuliDaScatole(stanzaCorrente.scatole) : 0
  const moduliUsatiCorrente = stanzaCorrente ? calcolaModuliUsati(stanzaCorrente.punti) : 0
  const moduliRimastiCorrente = moduliTotaliCorrente - moduliUsatiCorrente

  function aggiornaStanzaCorrente(modifica) {
    if (!stanzaCorrente) return
    setStanze(prev => prev.map(stanza =>
      String(stanza.id) === String(stanzaCorrente.id)
        ? { ...stanza, ...modifica }
        : stanza
    ))
  }

  function cambiaNomeStanza(nome) {
    aggiornaStanzaCorrente({ nome })
  }

  function aggiornaScatola(tipo, valore) {
    if (!stanzaCorrente) return
    aggiornaStanzaCorrente({
      scatole: {
        ...stanzaCorrente.scatole,
        [tipo]: Math.max(0, Number(valore || 0))
      }
    })
  }

  function cambiaCapitolo(capitolo) {
    const primaVoce = vociDB.find(v => v.capitolo === capitolo)
    setNuovo(prev => ({
      ...prev,
      capitolo,
      tipo: primaVoce?.voce || "",
      posti: primaVoce?.posti_default || 1,
      descrizione: ""
    }))
  }

  function cambiaTipo(tipo) {
    const voce = vociDB.find(v => v.capitolo === nuovo.capitolo && v.voce === tipo)
    setNuovo(prev => ({
      ...prev,
      tipo,
      posti: voce?.posti_default || 1,
      descrizione: ""
    }))
  }

  function nuovaStanza() {
    if (!clienteId) return alert("Seleziona prima il cliente")
    if (!serie) return alert("Seleziona prima la serie civile")

    const nome = window.prompt("Nome della nuova stanza:")
    if (!nome?.trim()) return

    const nuova = creaStanzaVuota(nome.trim())
    setStanze(prev => [...prev, nuova])
    setStanzaIdCorrente(nuova.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function duplicaStanza(stanza) {
    if (!stanza) return

    const nome = window.prompt("Nome della stanza duplicata:", `${stanza.nome} copia`)
    if (!nome?.trim()) return

    const copia = {
      ...JSON.parse(JSON.stringify(stanza)),
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      nome: nome.trim(),
      punti: (stanza.punti || []).map(p => ({
        ...p,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`
      }))
    }

    const indice = stanze.findIndex(s => String(s.id) === String(stanza.id))
    const nuove = [...stanze]
    nuove.splice(indice + 1, 0, copia)
    setStanze(nuove)
    setStanzaIdCorrente(copia.id)
  }

  function eliminaStanza(stanza) {
    if (!stanza) return
    if (!window.confirm(`Vuoi eliminare la stanza "${stanza.nome}"?`)) return

    const nuove = stanze.filter(s => String(s.id) !== String(stanza.id))
    setStanze(nuove)

    if (String(stanzaIdCorrente) === String(stanza.id)) {
      setStanzaIdCorrente(nuove[0]?.id || "")
    }
  }

  function spostaStanza(stanzaId, direzione) {
    const indice = stanze.findIndex(s => String(s.id) === String(stanzaId))
    if (indice < 0) return

    const nuovoIndice = direzione === "su" ? indice - 1 : indice + 1
    if (nuovoIndice < 0 || nuovoIndice >= stanze.length) return

    const nuove = [...stanze]
    const [spostata] = nuove.splice(indice, 1)
    nuove.splice(nuovoIndice, 0, spostata)
    setStanze(nuove)
  }

  function aggiungiPunto() {
    if (!clienteId) return alert("Seleziona cliente")
    if (!serie) return alert("Seleziona serie")
    if (!stanzaCorrente) return alert("Crea o seleziona una stanza")
    if (!stanzaCorrente.nome.trim()) return alert("Inserisci il nome della stanza")
    if (!nuovo.capitolo || !nuovo.tipo) return alert("Seleziona capitolo e voce")

    const punto = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      quantita: Math.max(1, Number(nuovo.quantita || 1)),
      capitolo: nuovo.capitolo,
      tipo: nuovo.tipo,
      posti: postiEffettivi(),
      descrizione: nuovo.descrizione.trim() || descrizioneAutomatica()
    }

    const moduliNuovo = calcolaModuliPunto(punto)
    if (moduliNuovo > moduliRimastiCorrente) {
      return alert(`Moduli insufficienti. Disponibili: ${moduliRimastiCorrente}, richiesti: ${moduliNuovo}`)
    }

    aggiornaStanzaCorrente({ punti: [...stanzaCorrente.punti, punto] })
    setUltimoId(punto.id)
    setNuovo(prev => ({ ...prev, quantita: 1, descrizione: "" }))
  }

  function eliminaPunto(id) {
    if (!stanzaCorrente) return
    aggiornaStanzaCorrente({
      punti: stanzaCorrente.punti.filter(p => String(p.id) !== String(id))
    })
  }

  const riepilogoGenerale = useMemo(() => {
    return stanze.reduce((tot, stanza) => {
      tot.moduliTotali += calcolaModuliDaScatole(stanza.scatole)
      tot.moduliUsati += calcolaModuliUsati(stanza.punti)
      tot.numeroPunti += (stanza.punti || []).reduce((s, p) => s + Number(p.quantita || 0), 0)
      tot.numeroScatole += scatoleDisponibili.reduce(
        (s, box) => s + Number(stanza.scatole?.[box.codice] || 0),
        0
      )
      return tot
    }, { moduliTotali: 0, moduliUsati: 0, numeroPunti: 0, numeroScatole: 0 })
  }, [stanze, vociDB])

  const distintaMateriali = useMemo(() => {
    const mappa = new Map()

    function aggiungi(descrizione, quantita, gruppo) {
      const qta = Number(quantita || 0)
      if (!descrizione || qta <= 0) return
      const key = `${gruppo}__${descrizione}`
      if (!mappa.has(key)) mappa.set(key, { gruppo, descrizione, quantita: 0 })
      mappa.get(key).quantita += qta
    }

    stanze.forEach(stanza => {
      scatoleDisponibili.forEach(s => {
        const qta = Number(stanza.scatole?.[s.codice] || 0)
        aggiungi(s.descrizioneSupporto, qta, "MATERIALI BASE")
        aggiungi(s.descrizionePlacca, qta, "MATERIALI BASE")
      })

      ;(stanza.punti || []).forEach(p => {
        aggiungi(p.descrizione || p.tipo, Number(p.quantita || 0), labelCapitolo(p.capitolo))
      })
    })

    return [...mappa.values()].sort((a, b) => {
      if (a.gruppo !== b.gruppo) return a.gruppo.localeCompare(b.gruppo)
      return a.descrizione.localeCompare(b.descrizione)
    })
  }, [stanze, vociDB])

  function esportaExcel() {
    if (!clienteId || !serie) return alert("Seleziona cliente e serie")
    if (stanze.length === 0) return alert("Non ci sono stanze da esportare")

    const rows = []
    rows.push(["PROGETTO PUNTI LUCE"])
    rows.push(["Cliente", clienteSelezionato?.nome || ""])
    rows.push(["Serie civile", serie])
    rows.push(["Data esportazione", new Date().toLocaleDateString()])
    rows.push([])

    stanze.forEach((stanza, indice) => {
      rows.push([`STANZA ${indice + 1}`, stanza.nome])
      rows.push(["SCATOLE"])
      rows.push(["Tipo", "Quantità", "Moduli totali"])

      scatoleDisponibili.forEach(s => {
        const qta = Number(stanza.scatole?.[s.codice] || 0)
        if (qta > 0) rows.push([s.codice, qta, qta * s.moduli])
      })

      rows.push([])
      rows.push(["PUNTI LUCE"])
      rows.push(["Capitolo", "Quantità", "Descrizione", "Posti", "Moduli"])

      ;(stanza.punti || []).forEach(p => {
        rows.push([
          labelCapitolo(p.capitolo),
          Number(p.quantita || 0),
          p.descrizione || "",
          Number(p.posti || 0),
          calcolaModuliPunto(p)
        ])
      })

      rows.push([])
      rows.push(["Riepilogo stanza", "", "", "Moduli totali", calcolaModuliDaScatole(stanza.scatole)])
      rows.push(["", "", "", "Moduli usati", calcolaModuliUsati(stanza.punti)])
      rows.push(["", "", "", "Moduli rimasti", calcolaModuliDaScatole(stanza.scatole) - calcolaModuliUsati(stanza.punti)])
      rows.push([])
      rows.push([])
    })

    rows.push(["DISTINTA MATERIALI"])
    rows.push(["Gruppo", "Descrizione", "Quantità"])
    distintaMateriali.forEach(v => rows.push([v.gruppo, v.descrizione, v.quantita]))

    rows.push([])
    rows.push(["RIEPILOGO GENERALE"])
    rows.push(["Stanze", stanze.length])
    rows.push(["Scatole", riepilogoGenerale.numeroScatole])
    rows.push(["Punti", riepilogoGenerale.numeroPunti])
    rows.push(["Moduli totali", riepilogoGenerale.moduliTotali])
    rows.push(["Moduli usati", riepilogoGenerale.moduliUsati])
    rows.push(["Moduli rimasti", riepilogoGenerale.moduliTotali - riepilogoGenerale.moduliUsati])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws["!cols"] = [{ wch: 24 }, { wch: 42 }, { wch: 15 }, { wch: 18 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Punti luce")

    const nomeCliente = String(clienteSelezionato?.nome || "cliente")
      .replace(/[\\/:*?"<>|]/g, "_")
      .trim()

    XLSX.writeFile(wb, `punti_luce_${nomeCliente}_${serie}.xlsx`)
  }

  function cancellaProgetto() {
    if (!clienteId || !serie) return
    const conferma = window.prompt("Per cancellare tutto il progetto scrivi CANCELLA")
    if (conferma !== "CANCELLA") return

    localStorage.removeItem(getStorageKey(clienteId, serie))
    setStanze([])
    setStanzaIdCorrente("")
    setUltimoSalvataggio("")
    alert("Progetto cancellato")
  }

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

  const th = { border: "1px solid #ccc", padding: 7, background: "#eee", textAlign: "left" }
  const td = { border: "1px solid #ccc", padding: 7 }

  return (
    <div style={{ padding: 15, maxWidth: 1400, margin: "auto" }}>
      <h1>💡 Progetto Punti Luce</h1>

      <div style={box}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(250px,1fr) minmax(220px,1fr)", gap: 10 }}>
          <div>
            <label>Cliente</label>
            <select value={clienteId} onChange={e => setClienteId(e.target.value)} style={input}>
              <option value="">-- seleziona cliente --</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div>
            <label>Serie civile</label>
            <select value={serie} onChange={e => setSerie(e.target.value)} style={input}>
              <option value="">-- seleziona serie --</option>
              {serieCivili.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={nuovaStanza} style={btnVerde}>➕ Nuova stanza</button>
          <button onClick={esportaExcel} style={btnBlu}>📊 Esporta Excel</button>
          <button onClick={cancellaProgetto} style={btnRosso}>🗑 Cancella progetto</button>
          <span style={{ color: "#666" }}>
            {clienteId && serie
              ? ultimoSalvataggio
                ? `✅ Salvato automaticamente alle ${ultimoSalvataggio}`
                : "Salvataggio automatico attivo"
              : "Seleziona cliente e serie"}
          </span>
        </div>

        <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "#fff3cd", border: "1px solid #ffecb5" }}>
          Il salvataggio automatico viene mantenuto nel browser di questo dispositivo.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 12, alignItems: "start" }}>
        <div style={{ ...box, position: "sticky", top: 10, maxHeight: "calc(100vh - 30px)", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>🏠 Stanze</h3>
            <button onClick={nuovaStanza} style={btnVerdePiccolo}>➕</button>
          </div>

          {!clienteId || !serie ? (
            <div style={{ marginTop: 12, color: "#666" }}>Seleziona cliente e serie civile.</div>
          ) : stanze.length === 0 ? (
            <div style={{ marginTop: 12, color: "#666" }}>Nessuna stanza. Premi “Nuova stanza”.</div>
          ) : (
            <div style={{ marginTop: 10 }}>
              {stanze.map((stanza, indice) => {
                const selezionata = String(stanza.id) === String(stanzaIdCorrente)
                return (
                  <div key={stanza.id} style={{
                    border: selezionata ? "2px solid #0d6efd" : "1px solid #ccc",
                    background: selezionata ? "#e7f1ff" : "white",
                    borderRadius: 7,
                    padding: 8,
                    marginBottom: 8
                  }}>
                    <button
                      onClick={() => setStanzaIdCorrente(stanza.id)}
                      style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", cursor: "pointer", padding: 0, fontWeight: selezionata ? "bold" : "normal" }}
                    >
                      {indice + 1}. {stanza.nome || "Stanza senza nome"}
                    </button>

                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      <button onClick={() => spostaStanza(stanza.id, "su")} disabled={indice === 0}>↑</button>
                      <button onClick={() => spostaStanza(stanza.id, "giu")} disabled={indice === stanze.length - 1}>↓</button>
                      <button onClick={() => duplicaStanza(stanza)}>📋</button>
                      <button onClick={() => eliminaStanza(stanza)} style={{ background: "#dc3545", color: "white", border: "none", borderRadius: 4 }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          {!stanzaCorrente ? (
            <div style={{ ...box, padding: 30, textAlign: "center", background: "white" }}>
              <h3>Nessuna stanza selezionata</h3>
              <p>Seleziona una stanza dall’elenco oppure creane una nuova.</p>
              <button onClick={nuovaStanza} style={btnVerde}>➕ Nuova stanza</button>
            </div>
          ) : (
            <>
              <div style={{ position: "sticky", top: 0, zIndex: 20, background: "white", border: "1px solid #ccc", borderRadius: 8, padding: 10, marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1.5fr) repeat(3,100px)", gap: 8, alignItems: "end" }}>
                  <div>
                    <label>Stanza</label>
                    <input value={stanzaCorrente.nome} onChange={e => cambiaNomeStanza(e.target.value)} style={input} />
                  </div>
                  <MiniBox titolo="Totali" valore={moduliTotaliCorrente} />
                  <MiniBox titolo="Usati" valore={moduliUsatiCorrente} />
                  <MiniBox titolo="Rimasti" valore={moduliRimastiCorrente} danger={moduliRimastiCorrente < 0} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(100px,1fr))", gap: 8, marginTop: 10 }}>
                  {scatoleDisponibili.map(s => (
                    <div key={s.codice}>
                      <label>{s.codice}</label>
                      <input type="number" min="0" value={stanzaCorrente.scatole?.[s.codice] || 0} onChange={e => aggiornaScatola(s.codice, e.target.value)} style={input} />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => duplicaStanza(stanzaCorrente)}>📋 Duplica stanza</button>
                  <button onClick={() => eliminaStanza(stanzaCorrente)} style={btnRosso}>🗑 Elimina stanza</button>
                </div>
              </div>

              <div style={{ background: "white", border: "1px solid #ccc", borderRadius: 8, padding: 10, marginTop: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "90px 170px minmax(220px,1fr) 120px minmax(200px,1fr) 120px", gap: 8, alignItems: "end" }}>
                  <div>
                    <label>Q.tà</label>
                    <input type="number" min="1" value={nuovo.quantita} onChange={e => setNuovo({ ...nuovo, quantita: e.target.value })} style={input} />
                  </div>

                  <div>
                    <label>Capitolo</label>
                    <select value={nuovo.capitolo} onChange={e => cambiaCapitolo(e.target.value)} style={input}>
                      {capitoli.map(c => <option key={c} value={c}>{labelCapitolo(c)}</option>)}
                    </select>
                  </div>

                  <div>
                    <label>Cosa inserisco</label>
                    <select value={nuovo.tipo} onChange={e => cambiaTipo(e.target.value)} style={input}>
                      {vociCapitolo.map(v => <option key={v.id} value={v.voce}>{v.voce}</option>)}
                    </select>
                  </div>

                  <div>
                    <label>Posti</label>
                    <input type="number" min="1" disabled={!getVoceConfigDaNuovo()?.richiede_posti} value={postiEffettivi()} onChange={e => setNuovo({ ...nuovo, posti: e.target.value })} style={{ ...input, background: !getVoceConfigDaNuovo()?.richiede_posti ? "#eee" : "white" }} />
                  </div>

                  <div>
                    <label>Descrizione / note</label>
                    <input value={nuovo.descrizione} onChange={e => setNuovo({ ...nuovo, descrizione: e.target.value })} placeholder={descrizioneAutomatica()} style={input} />
                  </div>

                  <button onClick={aggiungiPunto} style={btnVerde}>Aggiungi</button>
                </div>

                <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: "#e7f1ff", border: "1px solid #9ec5fe" }}>
                  <b>Stai inserendo:</b> {nuovo.quantita} × {nuovo.descrizione.trim() || descrizioneAutomatica()} — moduli <b>{calcolaModuliPunto({ quantita: nuovo.quantita, capitolo: nuovo.capitolo, tipo: nuovo.tipo, posti: postiEffettivi() })}</b>
                </div>
              </div>

              <div style={box}>
                <h3>📋 Dettaglio stanza: {stanzaCorrente.nome}</h3>
                <h4>📦 Materiali base</h4>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 15 }}>
                  <thead><tr><th style={th}>Quantità</th><th style={th}>Descrizione</th></tr></thead>
                  <tbody>
                    {scatoleDisponibili.map(s => {
                      const qta = Number(stanzaCorrente.scatole?.[s.codice] || 0)
                      if (!qta) return null
                      return <tr key={s.codice}><td style={td}>{qta}</td><td style={td}>{s.descrizioneSupporto} + {s.descrizionePlacca}</td></tr>
                    })}
                  </tbody>
                </table>

                {capitoli.map(capitolo => {
                  const lista = stanzaCorrente.punti.filter(p => p.capitolo === capitolo)
                  if (lista.length === 0) return null
                  return (
                    <div key={capitolo} style={{ marginTop: 15 }}>
                      <h4>{labelCapitolo(capitolo)}</h4>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr><th style={th}>Q.tà</th><th style={th}>Descrizione</th><th style={th}>Posti</th><th style={th}>Moduli</th><th style={th}>Azioni</th></tr>
                        </thead>
                        <tbody>
                          {lista.map(p => (
                            <tr key={p.id} ref={String(p.id) === String(ultimoId) ? ultimoRef : null} style={{ background: String(p.id) === String(ultimoId) ? "#fff3cd" : "white" }}>
                              <td style={td}>{p.quantita}</td>
                              <td style={td}>{p.descrizione}</td>
                              <td style={td}>{p.posti}</td>
                              <td style={td}>{calcolaModuliPunto(p)}</td>
                              <td style={td}><button onClick={() => eliminaPunto(p.id)} style={btnRosso}>Elimina</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}

                {stanzaCorrente.punti.length === 0 && <div style={{ color: "#666" }}>Nessun punto inserito in questa stanza.</div>}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={box}>
        <h2>📊 Riepilogo generale</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(110px,1fr))", gap: 8 }}>
          <MiniBox titolo="Stanze" valore={stanze.length} />
          <MiniBox titolo="Scatole" valore={riepilogoGenerale.numeroScatole} />
          <MiniBox titolo="Punti" valore={riepilogoGenerale.numeroPunti} />
          <MiniBox titolo="Moduli totali" valore={riepilogoGenerale.moduliTotali} />
          <MiniBox titolo="Moduli usati" valore={riepilogoGenerale.moduliUsati} />
          <MiniBox titolo="Moduli rimasti" valore={riepilogoGenerale.moduliTotali - riepilogoGenerale.moduliUsati} danger={riepilogoGenerale.moduliTotali - riepilogoGenerale.moduliUsati < 0} />
        </div>

        {stanze.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 15 }}>
            <thead>
              <tr><th style={th}>Stanza</th><th style={th}>Scatole</th><th style={th}>Punti</th><th style={th}>Moduli totali</th><th style={th}>Moduli usati</th><th style={th}>Rimasti</th></tr>
            </thead>
            <tbody>
              {stanze.map(stanza => {
                const scatole = scatoleDisponibili.reduce((tot, s) => tot + Number(stanza.scatole?.[s.codice] || 0), 0)
                const punti = (stanza.punti || []).reduce((tot, p) => tot + Number(p.quantita || 0), 0)
                const totali = calcolaModuliDaScatole(stanza.scatole)
                const usati = calcolaModuliUsati(stanza.punti)
                return <tr key={stanza.id}><td style={td}>{stanza.nome}</td><td style={td}>{scatole}</td><td style={td}>{punti}</td><td style={td}>{totali}</td><td style={td}>{usati}</td><td style={td}>{totali - usati}</td></tr>
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>📦 Distinta materiali</h2>
          <button onClick={esportaExcel} style={btnBlu}>📊 Esporta Excel</button>
        </div>

        {distintaMateriali.length === 0 ? (
          <div style={{ marginTop: 12 }}>Nessun materiale presente.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
            <thead><tr><th style={th}>Gruppo</th><th style={th}>Descrizione</th><th style={th}>Quantità</th></tr></thead>
            <tbody>
              {distintaMateriali.map((v, i) => <tr key={`${v.gruppo}_${v.descrizione}_${i}`}><td style={td}>{v.gruppo}</td><td style={td}>{v.descrizione}</td><td style={td}>{v.quantita}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function MiniBox({ titolo, valore, danger = false }) {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 6, padding: 6, background: danger ? "#f8d7da" : "#f8f9fa", textAlign: "center" }}>
      <b>{titolo}</b>
      <div style={{ fontSize: 20, fontWeight: "bold" }}>{valore}</div>
    </div>
  )
}

const btnVerde = { padding: 8, borderRadius: 6, border: "none", background: "#198754", color: "white", cursor: "pointer", fontWeight: "bold" }
const btnVerdePiccolo = { padding: "6px 10px", borderRadius: 6, border: "none", background: "#198754", color: "white", cursor: "pointer", fontWeight: "bold" }
const btnBlu = { padding: 8, borderRadius: 6, border: "none", background: "#0d6efd", color: "white", cursor: "pointer", fontWeight: "bold" }
const btnRosso = { padding: "6px 10px", borderRadius: 6, border: "none", background: "#dc3545", color: "white", cursor: "pointer", fontWeight: "bold" }
