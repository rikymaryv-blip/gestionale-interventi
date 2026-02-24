import dayjs from "dayjs";
import "dayjs/locale/it";
import { deleteMateriale, updateMateriale } from "../services/interventiService";

dayjs.locale("it");

function InterventoList({ interventi, onDelete, onEdit }) {

  async function handleDeleteMateriale(id) {
    if (!window.confirm("Eliminare materiale?")) return
    await deleteMateriale(id)
    window.location.reload()
  }

  async function handleUpdateMateriale(id, nuovaQta) {
    await updateMateriale(id, Number(nuovaQta))
    window.location.reload()
  }

  return (
    <div>
      <h2 style={{ marginBottom: "20px" }}>Elenco Interventi</h2>

      {interventi.map((i) => {
        const dataFormattata = dayjs(i.data).format("DD/MM/YYYY");

        return (
          <div
            key={i.id}
            style={{
              background: "#ffffff",
              padding: "25px",
              marginBottom: "20px",
              borderRadius: "10px",
              border: "1px solid #dcdcdc",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              maxWidth: "1200px"
            }}
          >
            <div>
              <strong>Data:</strong> {dataFormattata}
            </div>

            <div>
              <strong>Cliente:</strong> {i.clienti?.nome || "—"}
            </div>

            <div>
              <strong>Descrizione:</strong> {i.descrizione}
            </div>

            {/* 🔹 OPERATORI */}
            {i.ore_operatori && i.ore_operatori.length > 0 && (
              <div style={{ marginTop: "15px" }}>
                <strong>Operatori:</strong>
                {i.ore_operatori.map((op) => (
                  <div key={op.id}>
                    {op.operatori?.nome || "—"} - {op.ore} ore
                  </div>
                ))}
              </div>
            )}

            {/* 🔹 MATERIALI */}
            {i.materiali_bollettino && i.materiali_bollettino.length > 0 && (
              <div style={{ marginTop: "15px" }}>
                <strong>Materiali:</strong>

                <div
                  style={{
                    marginTop: "10px",
                    borderTop: "1px solid #eee",
                    paddingTop: "10px"
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 1fr 100px 80px",
                      fontWeight: "bold",
                      marginBottom: "8px"
                    }}
                  >
                    <div>Codice</div>
                    <div>Descrizione</div>
                    <div>Qta</div>
                    <div></div>
                  </div>

                  {i.materiali_bollettino.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "200px 1fr 100px 80px",
                        padding: "8px 0",
                        borderBottom: "1px solid #f0f0f0",
                        alignItems: "center"
                      }}
                    >
                      <div>{m.codice}</div>

                      <div>{m.descrizione}</div>

                      <div>
                        <input
                          type="number"
                          value={m.quantita}
                          min="1"
                          style={{ width: "60px" }}
                          onChange={(e) =>
                            handleUpdateMateriale(m.id, e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <button
                          onClick={() => handleDeleteMateriale(m.id)}
                          style={{
                            background: "#ff4d4f",
                            color: "white",
                            border: "none",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: "20px" }}>
              <button
                onClick={() => onEdit(i)}
                style={{ marginRight: "10px" }}
              >
                Modifica
              </button>

              <button onClick={() => onDelete(i.id)}>
                Elimina
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default InterventoList;