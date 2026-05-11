import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"

export default function PuntiLuceVociPage() {
  const [voci, setVoci] = useState([])
  const [editingId, setEditingId] = useState(null)

  const formVuoto = {
    capitolo: "punti_luce",
    voce: "",
    moduli: 1,
    richiede_posti: false,
    posti_default: 1,
    posti_fissi: "",
    ordine: 0
  }

  const [form, setForm] = useState(formVuoto)

  useEffect(() => {
    caricaVoci()
  }, [])

  async function caricaVoci() {
    const { data, error } = await supabase
      .from("punti_luce_voci")
      .select("*")
      .order("capitolo")
      .order("ordine")

    if (error) {
      console.error(error)
      alert("Errore caricamento")
      return
    }

    setVoci(data || [])
  }

  async function salvaVoce() {
    if (!form.capitolo.trim()) {
      alert("Inserisci capitolo")
      return
    }

    if (!form.voce.trim()) {
      alert("Inserisci nome voce")
      return
    }

    const payload = {
      capitolo: form.capitolo.trim(),
      voce: form.voce.trim(),
      moduli: form.moduli === "" ? null : Number(form.moduli),
      richiede_posti: form.richiede_posti,
      posti_default: form.posti_default === "" ? null : Number(form.posti_default),
      posti_fissi: form.posti_fissi === "" ? null : Number(form.posti_fissi),
      ordine: Number(form.ordine || 0),
      attivo: true
    }

    let error = null

    if (editingId) {
      const res = await supabase
        .from("punti_luce_voci")
        .update(payload)
        .eq("id", editingId)

      error = res.error
    } else {
      const res = await supabase
        .from("punti_luce_voci")
        .insert(payload)

      error = res.error
    }

    if (error) {
      console.error(error)
      alert("Errore salvataggio: " + error.message)
      return
    }

    alert(editingId ? "✅ Voce modificata" : "✅ Voce salvata")

    setForm({
      ...formVuoto,
      capitolo: form.capitolo.trim()
    })
    setEditingId(null)
    caricaVoci()
  }

  function modificaVoce(voce) {
    setEditingId(voce.id)

    setForm({
      capitolo: voce.capitolo || "",
      voce: voce.voce || "",
      moduli: voce.moduli ?? "",
      richiede_posti: voce.richiede_posti || false,
      posti_default: voce.posti_default ?? "",
      posti_fissi: voce.posti_fissi ?? "",
      ordine: voce.ordine ?? 0
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function annullaModifica() {
    setEditingId(null)
    setForm(formVuoto)
  }

  async function eliminaVoce(id) {
    const ok = window.confirm("Eliminare voce?")
    if (!ok) return

    const { error } = await supabase
      .from("punti_luce_voci")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Errore eliminazione: " + error.message)
      return
    }

    caricaVoci()
  }

  const capitoliEsistenti = [...new Set(voci.map(v => v.capitolo).filter(Boolean))]

  const input = {
    width: "100%",
    padding: 8,
    border: "1px solid #ccc",
    borderRadius: 6,
    boxSizing: "border-box"
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

  const gruppi = capitoliEsistenti.map(capitolo => ({
    capitolo,
    voci: voci.filter(v => v.capitolo === capitolo)
  }))

  return (
    <div style={{
      padding: 20,
      maxWidth: 1200,
      margin: "auto"
    }}>
      <h1>⚙️ Archivio Voci Punti Luce</h1>

      <div style={{
        border: editingId ? "3px solid #0d6efd" : "1px solid #ccc",
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        background: editingId ? "#e7f1ff" : "#fafafa"
      }}>
        <h3>
          {editingId ? "✏️ Modifica voce" : "➕ Nuova voce"}
        </h3>

        <div style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr 100px 120px 120px 120px 100px",
          gap: 10
        }}>
          <div>
            <label>Capitolo</label>
            <input
              value={form.capitolo}
              onChange={(e) =>
                setForm({
                  ...form,
                  capitolo: e.target.value
                })
              }
              list="capitoli-punti-luce"
              placeholder="es. punti_luce, prese, domotica"
              style={input}
            />

            <datalist id="capitoli-punti-luce">
              {capitoliEsistenti.map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <label>Voce</label>
            <input
              value={form.voce}
              onChange={(e) =>
                setForm({
                  ...form,
                  voce: e.target.value
                })
              }
              style={input}
            />
          </div>

          <div>
            <label>Moduli</label>
            <input
              type="number"
              value={form.moduli}
              onChange={(e) =>
                setForm({
                  ...form,
                  moduli: e.target.value
                })
              }
              style={input}
            />
          </div>

          <div>
            <label>Richiede posti</label>
            <select
              value={form.richiede_posti ? "si" : "no"}
              onChange={(e) =>
                setForm({
                  ...form,
                  richiede_posti: e.target.value === "si"
                })
              }
              style={input}
            >
              <option value="no">No</option>
              <option value="si">Si</option>
            </select>
          </div>

          <div>
            <label>Posti default</label>
            <input
              type="number"
              value={form.posti_default}
              onChange={(e) =>
                setForm({
                  ...form,
                  posti_default: e.target.value
                })
              }
              style={input}
            />
          </div>

          <div>
            <label>Posti fissi</label>
            <input
              type="number"
              value={form.posti_fissi}
              onChange={(e) =>
                setForm({
                  ...form,
                  posti_fissi: e.target.value
                })
              }
              style={input}
            />
          </div>

          <div>
            <label>Ordine</label>
            <input
              type="number"
              value={form.ordine}
              onChange={(e) =>
                setForm({
                  ...form,
                  ordine: e.target.value
                })
              }
              style={input}
            />
          </div>
        </div>

        <br />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={salvaVoce}
            style={{
              padding: "10px 15px",
              border: "none",
              borderRadius: 6,
              background: editingId ? "#0d6efd" : "#198754",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {editingId ? "💾 Salva modifica" : "💾 Salva voce"}
          </button>

          {editingId && (
            <button
              onClick={annullaModifica}
              style={{
                padding: "10px 15px",
                border: "none",
                borderRadius: 6,
                background: "#6c757d",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Annulla modifica
            </button>
          )}
        </div>
      </div>

      {gruppi.map(gruppo => (
        <div
          key={gruppo.capitolo}
          style={{
            marginTop: 30,
            paddingTop: 15,
            borderTop: "4px solid #ddd"
          }}
        >
          <h2 style={{
            background: "#f1f3f5",
            padding: 10,
            borderRadius: 8
          }}>
            {gruppo.capitolo}
          </h2>

          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 10
          }}>
            <thead>
              <tr>
                <th style={th}>Capitolo</th>
                <th style={th}>Voce</th>
                <th style={th}>Moduli</th>
                <th style={th}>Richiede posti</th>
                <th style={th}>Posti default</th>
                <th style={th}>Posti fissi</th>
                <th style={th}>Ordine</th>
                <th style={th}>Azioni</th>
              </tr>
            </thead>

            <tbody>
              {gruppo.voci.map(v => (
                <tr
                  key={v.id}
                  style={{
                    background: editingId === v.id ? "#fff3cd" : "white"
                  }}
                >
                  <td style={td}>{v.capitolo}</td>
                  <td style={td}><b>{v.voce}</b></td>
                  <td style={td}>{v.moduli}</td>
                  <td style={td}>{v.richiede_posti ? "SI" : "NO"}</td>
                  <td style={td}>{v.posti_default}</td>
                  <td style={td}>{v.posti_fissi}</td>
                  <td style={td}>{v.ordine}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => modificaVoce(v)}
                        style={{
                          padding: "6px 10px",
                          border: "none",
                          borderRadius: 6,
                          background: "#0d6efd",
                          color: "white",
                          cursor: "pointer"
                        }}
                      >
                        Modifica
                      </button>

                      <button
                        onClick={() => eliminaVoce(v.id)}
                        style={{
                          padding: "6px 10px",
                          border: "none",
                          borderRadius: 6,
                          background: "red",
                          color: "white",
                          cursor: "pointer"
                        }}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}