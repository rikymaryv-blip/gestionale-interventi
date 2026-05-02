import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"
import MaterialeSelector from "../components/MaterialeSelector"
import { useNavigate } from "react-router-dom"

export default function InterventiPage() {

  const navigate = useNavigate()

  const [clienti, setClienti] = useState([])
  const [cantieri, setCantieri] = useState([])
  const [operatoriDB, setOperatoriDB] = useState([])
  const [showClienti, setShowClienti] = useState(false)
  const [interventi, setInterventi] = useState([])

  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    cliente_id: "",
    cliente_nome: "",
    cantiere_id: "",
    data: dayjs().format("YYYY-MM-DD"),
    descrizione: "",
    operatori: [],
    materiali: []
  })

  useEffect(() => {
    loadAll()
    caricaInterventi()
  }, [])

  async function loadAll() {
    const { data: cli } = await supabase.from("clienti").select("*").eq("attivo", true)
    const { data: op } = await supabase.from("operatori").select("*").order("nome")

    setClienti(cli || [])
    setOperatoriDB(op || [])
  }

  async function caricaInterventi() {
    const { data } = await supabase
      .from("interventi")
      .select(`
        *,
        clienti(nome),
        cantieri(nome),
        materiali_bollettino(id)
      `)
      .order("data", { ascending: false })

    setInterventi(data || [])
  }

  async function selezionaCliente(c) {
    setForm(prev => ({
      ...prev,
      cliente_id: c.id,
      cliente_nome: c.nome,
      cantiere_id: ""
    }))

    setShowClienti(false)

    const { data } = await supabase
      .from("cantieri")
      .select("*")
      .eq("cliente_id", c.id)

    setCantieri(data || [])
  }

  function aggiungiMateriale(item) {
    setForm(prev => {
      const esistente = prev.materiali.find(m => m.codice === item.codice)
      if (esistente) return prev

      return {
        ...prev,
        materiali: [...prev.materiali, { ...item, quantita: 1 }]
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
    const newMats = [...form.materiali]
    newMats[index].quantita = Number(valore)
    setForm(prev => ({ ...prev, materiali: newMats }))
  }

  function aggiungiOperatore() {
    setForm(prev => ({
      ...prev,
      operatori: [...prev.operatori, { operatore_id: "", ore: "" }]
    }))
  }

  function aggiornaOperatore(i, campo, valore) {
    const newOps = [...form.operatori]
    newOps[i][campo] = valore
    setForm(prev => ({ ...prev, operatori: newOps }))
  }

  function eliminaOperatore(i) {
    const newOps = form.operatori.filter((_, idx) => idx !== i)
    setForm(prev => ({ ...prev, operatori: newOps }))
  }

  async function modificaIntervento(i) {

    setEditingId(i.id)

    const { data: ops } = await supabase
      .from("ore_operatori")
      .select("*")
      .eq("intervento_id", i.id)

    const { data: mats } = await supabase
      .from("materiali_bollettino")
      .select("*")
      .eq("intervento_id", i.id)

    setForm({
      cliente_id: i.cliente_id,
      cliente_nome: i.clienti?.nome || "",
      cantiere_id: i.cantiere_id || "",
      data: i.data,
      descrizione: i.descrizione,

      operatori: (ops || []).map(o => ({
        operatore_id: o.operatore_id,
        ore: o.ore
      })),

      materiali: (mats || []).map(m => ({
        codice: m.codice,
        descrizione: m.descrizione,
        quantita: m.quantita
      }))
    })

    if (i.cliente_id) {
      const { data } = await supabase
        .from("cantieri")
        .select("*")
        .eq("cliente_id", i.cliente_id)

      setCantieri(data || [])
    }

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function salva() {

    if (!form.cliente_id) return alert("Cliente mancante")
    if (!form.descrizione) return alert("Descrizione mancante")

    let int = null

    if (editingId) {
      await supabase
        .from("interventi")
        .update({
          cliente_id: form.cliente_id,
          cantiere_id: form.cantiere_id || null,
          data: form.data,
          descrizione: form.descrizione
        })
        .eq("id", editingId)

      int = { id: editingId }

      await supabase.from("ore_operatori").delete().eq("intervento_id", editingId)
      await supabase.from("materiali_bollettino").delete().eq("intervento_id", editingId)

    } else {
      const { data } = await supabase
        .from("interventi")
        .insert([{
          cliente_id: form.cliente_id,
          cantiere_id: form.cantiere_id || null,
          data: form.data,
          descrizione: form.descrizione
        }])
        .select()
        .single()

      int = data
    }

    const ops = form.operatori.map(o => ({
      intervento_id: int.id,
      operatore_id: o.operatore_id,
      ore: Number(o.ore || 0)
    }))

    if (ops.length) {
      await supabase.from("ore_operatori").insert(ops)
    }

    const mats = form.materiali.map(m => ({
      intervento_id: int.id,
      codice: m.codice,
      descrizione: m.descrizione,
      quantita: m.quantita
    }))

    if (mats.length) {
      await supabase.from("materiali_bollettino").insert(mats)
    }

    alert("✅ Intervento salvato")

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
    caricaInterventi()
  }

  return (
    <div style={{ padding: 20 }}>

      <h2>Interventi</h2>

      {editingId && (
        <div style={{ color: "orange", marginBottom: 10 }}>
          ✏️ MODIFICA INTERVENTO IN CORSO
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input
          placeholder="Cerca cliente..."
          value={form.cliente_nome}
          onChange={(e) => {
            setForm({
              ...form,
              cliente_nome: e.target.value,
              cliente_id: ""
            })
            setShowClienti(true)
          }}
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
                <div key={c.id} onClick={() => selezionaCliente(c)} style={{ padding: 5, cursor: "pointer" }}>
                  {c.nome}
                </div>
              ))}
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
            placeholder="Ore"
            value={op.ore}
            onChange={e => aggiornaOperatore(i, "ore", e.target.value)}
          />

          <button onClick={() => eliminaOperatore(i)}>❌</button>
        </div>
      ))}

      <button onClick={aggiungiOperatore}>➕ Operatore</button>

      <h4>📦 Bolle</h4>
      <button onClick={() => navigate("/bolle")}>
        Apri gestione bolle
      </button>

      <h4>Materiali</h4>
      <MaterialeSelector onAdd={aggiungiMateriale} />

      {/* 🔥 SEPARATORE */}
      <div style={{ marginTop: 10, fontWeight: "bold", color: "#1976d2" }}>
        📦 Materiali inseriti nell’intervento
      </div>

      {form.materiali.map((m, i) => (
        <div key={i} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "2px solid #4CAF50",
          background: "#f6fff6",
          padding: 6,
          marginTop: 4,
          borderRadius: 4
        }}>
          <div style={{ flex: 1 }}>
            {m.codice} — {m.descrizione}
          </div>

          <input
            type="number"
            value={m.quantita}
            onChange={(e) => aggiornaQuantitaMateriale(i, e.target.value)}
            style={{ width: 60 }}
          />

          <button
            onClick={() => eliminaMateriale(i)}
            style={{ background: "red", color: "white" }}
          >
            ❌
          </button>
        </div>
      ))}

      <br /><br />

      <button onClick={salva} style={{
        background: "#2196F3",
        color: "white",
        padding: "10px 20px",
        borderRadius: 6
      }}>
        💾 Salva Intervento
      </button>

      <h3 style={{ marginTop: 30 }}>📋 Interventi salvati</h3>

      {interventi.map(i => (
        <div key={i.id} style={{
          border: "1px solid #ccc",
          padding: 12,
          marginTop: 8,
          borderRadius: 6
        }}>

          <div><b>{i.data}</b></div>
          <div><b>Cliente:</b> {i.clienti?.nome || "-"}</div>
          <div><b>Descrizione:</b> {i.descrizione}</div>
          <div><b>Materiali:</b> {i.materiali_bollettino?.length || 0}</div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>

            <button onClick={() => navigate(`/bollettino/${i.id}`)}>
              👁 Apri
            </button>

            <button onClick={() => modificaIntervento(i)}>
              ✏️ Modifica
            </button>

            <button
              onClick={async () => {
                if (!confirm("Eliminare intervento?")) return

                await supabase.from("interventi").delete().eq("id", i.id)
                await supabase.from("ore_operatori").delete().eq("intervento_id", i.id)
                await supabase.from("materiali_bollettino").delete().eq("intervento_id", i.id)

                caricaInterventi()
              }}
              style={{ background: "red", color: "white" }}
            >
              🗑 Elimina
            </button>

            <button
              onClick={async () => {
                const res = await fetch(
                  "https://olmekymxlopdilkhucvf.supabase.co/functions/v1/genera-bollettino",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ intervento_id: i.id })
                  }
                )

                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)

                const a = document.createElement("a")
                a.href = url
                a.download = "bollettino.pdf"
                a.click()
              }}
            >
              📄 PDF
            </button>

          </div>

        </div>
      ))}

    </div>
  )
}