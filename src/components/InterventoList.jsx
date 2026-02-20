function InterventoList({ interventi, onDelete, onEdit }) {
  return (
    <div>
      <h2>Lista Interventi</h2>

      {interventi.map((i) => (
        <div
          key={i.id}
          style={{
            background: "#f1f1f1",
            padding: "15px",
            marginBottom: "10px",
            borderRadius: "6px"
          }}
        >
          <strong>Data:</strong> {i.data}
          <br />
          <strong>Cliente:</strong> {i.clienti?.nome}
          <br />
          <strong>Descrizione:</strong> {i.descrizione}
          <br />

          {/* 🔥 ORE OPERATORI */}
          {i.ore_operatori?.length > 0 && (
            <>
              <br />
              <strong>Operatori:</strong>
              <ul>
                {i.ore_operatori.map((op) => (
                  <li key={op.id}>
                    {op.operatori?.nome} — {op.ore} ore
                  </li>
                ))}
              </ul>
            </>
          )}

          <br />

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
      ))}
    </div>
  )
}

export default InterventoList