import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import { useNavigate, useSearchParams } from "react-router-dom"

export default function InterventiPage() {

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editIdDaUrl = searchParams.get("edit_id")

  const [clienti, setClienti] = useState([])
  const [cantieri, setCantieri] = useState([])
  const [operatoriDB, setOperatoriDB] = useState([])
  const [showClienti, setShowClienti] = useState(false)
  const [interventi, setInterventi] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [aperturaAutomaticaFatta, setAperturaAutomaticaFatta] = useState(false)

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
    data: dayjs().format("YYYY-MM-DD"),
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

  async function selezionaCliente(c) {
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

  function aggiungiOperatore() {
    setForm(prev => ({
      ...prev,
      operatori: [...prev.operatori, { operatore_id: "", ore: "" }]
    }))
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
      data: dayjs().format("YYYY-MM-DD"),
      descrizione: "",
      operatori: [],
      materiali: []
    })
    setCantieri([])
    setSearchMat("")
    setAltroMat({
      codice: "",
      descrizione: "",
      quantita: 1
    })
    setShowAltroMat(false)
    navigate("/interventi")
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

    if (matsError) {
      console.error(matsError)
      alert("Errore caricamento materiali: " + matsError.message)
      return
    }

    setForm({
      cliente_id: i.cliente_id || "",
      cliente_nome: i.clienti?.nome || "",
      cantiere_id: i.cantiere_id || "",
      data: i.data || dayjs().format("YYYY-MM-DD"),
      descrizione: i.descrizione || "",
      operatori: (ops || []).map(o => ({
        operatore_id: o.operatore_id,
        ore: o.ore
      })),
      materiali: (mats || []).map(m => ({
        codice: m.codice || "",
        descrizione: m.descrizione || "",
        quantita: m.quantita || 1
      }))
    })

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
        data: dayjs().format("YYYY-MM-DD"),
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
        data: dayjs().format("YYYY-MM-DD"),
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
          quantita: Number(m.quantita || 1) > 0 ? Number(m.quantita || 1) : 1
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
          placeholder="Cerca cliente..."
          value={form.cliente_nome}
          onChange={(e) => {
            setForm({ ...form, cliente_nome: e.target.value, cliente_id: "", cantiere_id: "" })
            setCantieri([])
            setShowClienti(true)
          }}
          onFocus={() => setShowClienti(true)}
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
            {clienti
              .filter(c => c.nome.toLowerCase().includes(form.cliente_nome.toLowerCase()))
              .slice(0, 5)
              .map(c => (
                <div
                  key={c.id}
                  onClick={() => selezionaCliente(c)}
                  style={{ padding: 5, cursor: "pointer" }}
                >
                  {c.nome}
                </div>
              ))}

            {clienti.filter(c => c.nome.toLowerCase().includes(form.cliente_nome.toLowerCase())).length === 0 && (
              <div style={{ padding: 5, color: "#777" }}>
                Nessun cliente trovato
              </div>
            )}
          </div>
        )}
      </div>

      <select
        value={form.cantiere_id}
        onChange={e => setForm({ ...form, cantiere_id: e.target.value })}
      >
        <option value="">Seleziona cantiere</option>
        {cantieri.map(c => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
      </select>

      <input
        type="date"
        value={form.data}
        onChange={e => setForm({ ...form, data: e.target.value })}
      />

      <input
        placeholder="Descrizione"
        value={form.descrizione}
        onChange={e => setForm({ ...form, descrizione: e.target.value })}
      />

      <h4>Operatori</h4>

      {form.operatori.map((op, i) => (
        <div key={i} style={{ display: "flex", gap: 10 }}>
          <select
            value={op.operatore_id}
            onChange={e => aggiornaOperatore(i, "operatore_id", e.target.value)}
          >
            <option value="">Seleziona</option>
            {operatoriDB.map(o => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            step="0.5"
            placeholder="Ore"
            value={op.ore}
            onChange={e => aggiornaOperatore(i, "ore", e.target.value)}
          />

          <button onClick={() => eliminaOperatore(i)}>❌</button>
        </div>
      ))}

      <button onClick={aggiungiOperatore}>➕ Operatore</button>

      <br /><br />

      <div style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        <button
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

      {form.materiali.map((m, i) => (
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
      ))}

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