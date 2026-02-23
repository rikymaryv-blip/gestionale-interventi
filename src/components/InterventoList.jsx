import dayjs from "dayjs";
import "dayjs/locale/it";

dayjs.locale("it");

function InterventoList({ interventi, onDelete, onEdit }) {
  return (
    <div>
      <h2>Elenco Interventi</h2>

      {interventi.length === 0 && (
        <p>Nessun intervento presente.</p>
      )}

      {interventi.map((i) => {
        const dataFormattata = dayjs(i.data).format("DD/MM/YYYY");

        return (
          <div
            key={i.id}
            style={{
              background: "#f8f9fa",
              padding: "15px",
              marginBottom: "10px",
              borderRadius: "6px",
              border: "1px solid #ddd"
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
              <div style={{ marginTop: "10px" }}>
                <strong>Operatori:</strong>
                {i.ore_operatori.map((op, index) => (
                  <div key={index}>
                    {op.operatori?.nome} - {op.ore} ore
                  </div>
                ))}
              </div>
            )}

            {/* 🔹 MATERIALI (NUOVO BLOCCO) */}
            {i.materiali_bollettino && i.materiali_bollettino.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <strong>Materiali:</strong>
                {i.materiali_bollettino.map((m, index) => (
                  <div key={index}>
                    {m.codice} - {m.descrizione} | Qta: {m.quantita} | € {m.prezzo}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "10px" }}>
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


