import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import dayjs from "dayjs"

export default function FatturaDettaglioPage() {

  const { id } = useParams()
  const navigate = useNavigate()

  const [fattura, setFattura] = useState(null)
  const [righe, setRighe] = useState([])

  useEffect(() => {
    load()
  }, [])

  async function load() {

    const { data: f } = await supabase
      .from("fatture")
      .select("*")
      .eq("id", id)
      .single()

    const { data: r } = await supabase
      .from("fatture_righe")
      .select("*")
      .eq("fattura_id", id)

    setFattura(f)
    setRighe(r || [])
  }

  function stampaPDF() {
    window.print()
  }

  const operatori = righe.filter(r => r.ore)
  const materiali = righe.filter(r => r.quantita)

  return (
    <div style={{ padding: 20 }}>

      {/* BOTTONI */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={stampaPDF}>📄 PDF</button>
        <button onClick={() => navigate(-1)}>← Indietro</button>
      </div>

      {/* DOCUMENTO */}
      <div id="pdf" style={{
        maxWidth: 800,
        margin: "auto",
        background: "white",
        padding: 30
      }}>

        {/* HEADER */}
        <div style={{ marginBottom: 20 }}>
          <b>F.LLI BATTISTUZZI SNC</b><br />
          Via S. Giuseppe, 44<br />
          31015 Conegliano TV<br /><br />
          info@fillibattistuzzi-impianti.com<br />
          Tel: 0438 411691
        </div>

        <h2 style={{ textAlign: "center" }}>FATTURA</h2>

        <br />

        <div><b>Data documento:</b> {dayjs(fattura?.data).format("DD/MM/YYYY")}</div>
        <div><b>Cliente:</b> {fattura?.cliente_nome}</div>

        <br />

        {/* 🔥 DATA INTERVENTO */}
        <div>
          <b>Data intervento:</b> {operatori[0]?.data ? dayjs(operatori[0].data).format("DD/MM/YYYY") : "-"}
        </div>

        <br />

        <div>
          <b>Descrizione lavori</b><br />
          {operatori[0]?.descrizione || "-"}
        </div>

        <br />

        {/* 🔥 ORE MIGLIORATE */}
        <div>
          <b>Ore lavorate</b>

          {operatori.map((o, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: "flex-start",
              gap: 20,
              marginTop: 5
            }}>
              <span style={{ width: 200 }}>
                {o.operatore || "Operatore"}
              </span>
              <span>
                {o.ore} h
              </span>
            </div>
          ))}
        </div>

        <br />

        {/* 🔥 MATERIALI MIGLIORATI */}
        <div>
          <b>Materiali</b>

          <table style={{
            width: "100%",
            marginTop: 10,
            borderCollapse: "collapse"
          }}>
            <thead>
              <tr style={{
                textAlign: "left",
                borderBottom: "2px solid #000"
              }}>
                <th style={{ width: 60 }}>Qta</th>
                <th style={{ width: 180 }}>Codice</th>
                <th>Descrizione</th>
              </tr>
            </thead>

            <tbody>
              {materiali.map((m, i) => (
                <tr key={i} style={{
                  borderBottom: "1px solid #ddd"
                }}>
                  <td>{m.quantita}</td>

                  <td style={{
                    fontFamily: "monospace"
                  }}>
                    {m.codice || "-"}
                  </td>

                  <td>
                    {m.materiale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* STAMPA */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }

            #pdf, #pdf * {
              visibility: visible;
            }

            #pdf {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}
      </style>

    </div>
  )
}