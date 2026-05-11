import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

const scatoleVuote = {
  "503": 0,
  "504": 0,
  "506": 0,
  "507": 0
}

export default function PuntiLuceStanzeTipoPage() {
  const [stanzeTipo, setStanzeTipo] = useState([])
  const [voci, setVoci] = useState([])
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    nome: "",
    ordine: 0,
    scatole: scatoleVuote,
    punti: []
  })

  const [nuovoPunto, setNuovoPunto] = useState({
    quantita: 1,
    capitolo: "",
    tipo: "",
    posti: 1,
    descrizione: ""
  })

  useEffect(() => {
    caricaTutto()
  }, [])

  async function caricaTutto() {
    await caricaVoci()
    await caricaStanzeTipo()
  }

  async function caricaVoci() {
    const { data, error } = await supabase
      .from("punti_luce_voci")
      .select("*")
      .eq("attivo", true)
      .order("capitolo")
      .order("ordine")

    if (error) {
      console.error(error)
      alert("Errore caricamento voci")
      return
    }

    setVoci(data || [])

    if (data?.length > 0) {
      const primo = data[0]
      setNuovoPunto(prev => ({
        ...prev,
        capitolo: prev.capitolo || primo.capitolo,
        tipo: prev.tipo || primo.voce,
        posti: primo.posti_default || 1
      }))
    }
  }

  async function caricaStanzeTipo() {
    const { data, error } = await supabase
      .from("punti_luce_stanze_tipo")
      .select("*")
      .eq("attivo", true)
      .order("ordine")

    if (error) {
      console.error(error)
      alert("Errore caricamento stanze tipo")
      return
    }

    setStanzeTipo(data || [])
  }

  const capitoli = [...new Set(voci.map(v => v.capitolo))]
  const vociCapitolo = voci.filter(v => v.capitolo === nuovoPunto.capitolo)

  function voceSelezionata() {
    return voci.find(v =>
      v.capitolo === nuovoPunto.capitolo &&
      v.voce === nuovoPunto.tipo
    )
  }

  function cambiaCapitolo(capitolo) {
    const primaVoce = voci.find(v => v.capitolo === capitolo)

    setNuovoPunto({
      ...nuovoPunto,
      capitolo,
      tipo: primaVoce?.voce || "",
      posti: primaVoce?.posti_default || 1,
      descrizione: ""
    })
  }

  function cambiaTipo(tipo) {
    const voce = voci.find(v =>
      v.capitolo === nuovoPunto.capitolo &&
      v.voce === tipo
    )

    setNuovoPunto({
      ...nuovoPunto,
      tipo,
      posti: voce?.posti_default || 1,
      descrizione: ""
    })
  }

  function descrizioneAutomatica() {
    const voce = voceSelezionata()
    if (!voce) return ""

    if (voce.richiede_posti) {
      return `${voce.voce} da ${nuovoPunto.posti} posti`
    }

    return voce.voce
  }

  function aggiornaScatola(tipo, valore) {
    setForm({
      ...form,
      scatole: {
        ...form.scatole,
        [tipo]: Number(valore)
      }
    })
  }

  function aggiungiPunto() {
    if (!nuovoPunto.capitolo || !nuovoPunto.tipo) {
      alert("Seleziona capitolo e voce")
      return
    }

    const punto = {
      id: Date.now(),
      quantita: Number(nuovoPunto.quantita),
      capitolo: nuovoPunto.capitolo,
      tipo: nuovoPunto.tipo,
      posti: Number(nuovoPunto.posti || 1),
      descrizione: nuovoPunto.descrizione.trim() || descrizioneAutomatica()
    }

    setForm({
      ...form,
      punti: [...form.punti, punto]
    })

    setNuovoPunto({
      ...nuovoPunto,
      quantita: 1,
      descrizione: ""
    })
  }

  function eliminaPunto(id) {
    setForm({
      ...form,
      punti: form.punti.filter(p => p.id !== id)
    })
  }

  async function salvaStanzaTipo() {
    if (!form.nome.trim()) {
      alert("Inserisci nome stanza tipo")
      return
    }

    const payload = {
      nome: form.nome.trim(),
      ordine: Number(form.ordine || 0),
      attivo: true,
      dati: {
        scatole: form.scatole,
        punti: form.punti
      }
    }

    let error = null

    if (editingId) {
      const res = await supabase
        .from("punti_luce_stanze_tipo")
        .update(payload)
        .eq("id", editingId)

      error = res.error
    } else {
      const res = await supabase
        .from("punti_luce_stanze_tipo")
        .insert(payload)

      error = res.error
    }

    if (error) {
      console.error(error)
      alert("Errore salvataggio: " + error.message)
      return
    }

    alert(editingId ? "✅ Stanza tipo modificata" : "✅ Stanza tipo salvata")

    annullaModifica()
    caricaStanzeTipo()
  }

  function modificaStanzaTipo(stanza) {
    setEditingId(stanza.id)

    setForm({
      nome: stanza.nome || "",
      ordine: stanza.ordine || 0,
      scatole: stanza.dati?.scatole || scatoleVuote,
      punti: stanza.dati?.punti || []
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function annullaModifica() {
    setEditingId(null)

    setForm({
      nome: "",
      ordine: 0,
      scatole: scatoleVuote,
      punti: []
    })
  }

  async function eliminaStanzaTipo(id) {
    if (!confirm("Eliminare questa stanza tipo?")) return

    const { error } = await supabase
      .from("punti_luce_stanze_tipo")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Errore eliminazione: " + error.message)
      return
    }

    caricaStanzeTipo()
  }

  const input = {
    width: "100%",
    padding: 8,
    border: "1px solid #ccc",
    borderRadius: 6,
    boxSizing: "border-box"
  }

  const box = {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    background: "#fafafa"
  }

  const th = {
    border: "1px solid #ccc",
    padding: 8,
    background: "#eee",
    textAlign: "left"
  }

  const td = {
    border: "1px solid #ccc",
    padding: 8
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "auto" }}>
      <h1>🏠 Stanze Tipo Punti Luce</h1>

      <div style={{
        ...box,
        border: editingId ? "3px solid #0d6efd" : "1px solid #ccc",
        background: editingId ? "#e7f1ff" : "#fafafa"
      }}>
        <h3>{editingId ? "✏️ Modifica stanza tipo" : "➕ Nuova stanza tipo"}</h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 120px",
          gap: 10
        }}>
          <div>
            <label>Nome stanza tipo</label>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Esempio: Cucina standard"
              style={input}
            />
          </div>

          <div>
            <label>Ordine</label>
            <input
              type="number"
              value={form.ordine}
              onChange={(e) => setForm({ ...form, ordine: e.target.value })}
              style={input}
            />
          </div>
        </div>

        <h4>📦 Scatole</h4>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10
        }}>
          {["503", "504", "506", "507"].map(tipo => (
            <div key={tipo}>
              <label>{tipo}</label>
              <input
                type="number"
                min="0"
                value={form.scatole[tipo] || 0}
                onChange={(e) => aggiornaScatola(tipo, e.target.value)}
                style={input}
              />
            </div>
          ))}
        </div>

        <h4>➕ Aggiungi punto alla stanza tipo</h4>

        <div style={{
          display: "grid",
          gridTemplateColumns: "80px 180px 260px 100px 1fr 120px",
          gap: 10,
          alignItems: "end"
        }}>
          <div>
            <label>Q.tà</label>
            <input
              type="number"
              min="1"
              value={nuovoPunto.quantita}
              onChange={(e) => setNuovoPunto({ ...nuovoPunto, quantita: e.target.value })}
              style={input}
            />
          </div>

          <div>
            <label>Capitolo</label>
            <select
              value={nuovoPunto.capitolo}
              onChange={(e) => cambiaCapitolo(e.target.value)}
              style={input}
            >
              {capitoli.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Voce</label>
            <select
              value={nuovoPunto.tipo}
              onChange={(e) => cambiaTipo(e.target.value)}
              style={input}
            >
              {vociCapitolo.map(v => (
                <option key={v.id} value={v.voce}>
                  {v.voce}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Posti</label>
            <input
              type="number"
              min="1"
              disabled={!voceSelezionata()?.richiede_posti}
              value={nuovoPunto.posti}
              onChange={(e) => setNuovoPunto({ ...nuovoPunto, posti: e.target.value })}
              style={{
                ...input,
                background: !voceSelezionata()?.richiede_posti ? "#eee" : "white"
              }}
            />
          </div>

          <div>
            <label>Descrizione / note</label>
            <input
              value={nuovoPunto.descrizione}
              onChange={(e) => setNuovoPunto({ ...nuovoPunto, descrizione: e.target.value })}
              placeholder={descrizioneAutomatica()}
              style={input}
            />
          </div>

          <button
            onClick={aggiungiPunto}
            style={btnVerde}
          >
            Aggiungi
          </button>
        </div>

        <h4>📋 Punti nella stanza tipo</h4>

        {form.punti.length === 0 ? (
          <div style={{ color: "#777" }}>Nessun punto inserito.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Q.tà</th>
                <th style={th}>Capitolo</th>
                <th style={th}>Descrizione</th>
                <th style={th}>Posti</th>
                <th style={th}>Azioni</th>
              </tr>
            </thead>

            <tbody>
              {form.punti.map(p => (
                <tr key={p.id}>
                  <td style={td}>{p.quantita}</td>
                  <td style={td}>{p.capitolo}</td>
                  <td style={td}>{p.descrizione}</td>
                  <td style={td}>{p.posti}</td>
                  <td style={td}>
                    <button
                      onClick={() => eliminaPunto(p.id)}
                      style={btnRosso}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <br />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={salvaStanzaTipo} style={editingId ? btnBlu : btnVerde}>
            {editingId ? "💾 Salva modifica" : "💾 Salva stanza tipo"}
          </button>

          {editingId && (
            <button onClick={annullaModifica} style={btnGrigio}>
              Annulla modifica
            </button>
          )}
        </div>
      </div>

      <div style={box}>
        <h3>📚 Archivio stanze tipo</h3>

        {stanzeTipo.length === 0 ? (
          <div>Nessuna stanza tipo salvata.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Nome</th>
                <th style={th}>Scatole</th>
                <th style={th}>Punti</th>
                <th style={th}>Ordine</th>
                <th style={th}>Azioni</th>
              </tr>
            </thead>

            <tbody>
              {stanzeTipo.map(s => (
                <tr key={s.id}>
                  <td style={td}><b>{s.nome}</b></td>
                  <td style={td}>
                    503: {s.dati?.scatole?.["503"] || 0} —{" "}
                    504: {s.dati?.scatole?.["504"] || 0} —{" "}
                    506: {s.dati?.scatole?.["506"] || 0} —{" "}
                    507: {s.dati?.scatole?.["507"] || 0}
                  </td>
                  <td style={td}>
                    {(s.dati?.punti || []).length}
                  </td>
                  <td style={td}>{s.ordine}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => modificaStanzaTipo(s)}
                        style={btnBlu}
                      >
                        Modifica
                      </button>

                      <button
                        onClick={() => eliminaStanzaTipo(s.id)}
                        style={btnRosso}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const btnVerde = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "#198754",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
}

const btnBlu = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "#0d6efd",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
}

const btnRosso = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "red",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
}

const btnGrigio = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "none",
  background: "#6c757d",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold"
}