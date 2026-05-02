import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom"
import { useState } from "react"

// PAGINE
import InterventiPage from "./pages/InterventiPage"
import ListinoPage from "./pages/ListinoPage"
import BollettinoPage from "./pages/BollettinoPage"
import CalendarMonth from "./components/calendar/CalendarMonth"
import ClientiPage from "./pages/ClientiPage"
import FatturePage from "./pages/FatturePage"
import StoricoFatturePage from "./pages/StoricoFatturePage"
import ArchivioInterventiPage from "./pages/ArchivioInterventiPage"
import ArchivioClientePage from "./pages/ArchivioClientePage"
import FatturaDettaglioPage from "./pages/FatturaDettaglioPage"
import OperatoriPage from "./pages/OperatoriPage"
import InterventiStorico from "./pages/InterventiStorico"


// 🆕 NUOVA PAGINA BOLLE
import BolleUploadPage from "./pages/BolleUploadPage"

// TEST
import TestCantieri from "./TestCantieri"

// MENU
function Menu() {
  const [openFatt, setOpenFatt] = useState(false)
  const [openListino, setOpenListino] = useState(false)
  const navigate = useNavigate()

  return (
    <div style={menuBar}>

      <button onClick={() => navigate("/")}>📅 Calendario</button>
      <button onClick={() => navigate("/interventi")}>🧾 Interventi</button>
      <button onClick={() => navigate("/clienti")}>👤 Clienti</button>

      {/* 🆕 BOLLE */}
      <button
        onClick={() => {
          const codice = prompt("Inserisci codice accesso")
          if (codice !== "1234") {
            alert("Accesso negato")
            return
          }
          navigate("/bolle")
        }}
      >
        📥 Bolle
      </button>

      {/* 🔴 FATTURAZIONE */}
      <button
        onClick={() => {
          const codice = prompt("Inserisci codice accesso")
          if (codice !== "1234") {
            alert("Accesso negato")
            return
          }
          setOpenFatt(!openFatt)
        }}
      >
        💰 Fatturazione
      </button>

      {openFatt && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/fatture")}>Fatture</button>
          <button onClick={() => navigate("/storico-fatture")}>Storico</button>
          <button onClick={() => navigate("/archivio-cliente")}>Archivio Cliente</button>
          <button onClick={() => navigate("/archivio")}>Archivio</button>
          <button onClick={() => navigate("/operatori")}>👷 Operatori</button>
        </div>
      )}

      {/* 🔴 LISTINO PROTETTO */}
      <button
        onClick={() => {
          const codice = prompt("Inserisci codice accesso")
          if (codice !== "1234") {
            alert("Accesso negato")
            return
          }
          setOpenListino(!openListino)
        }}
      >
        📦 Listino
      </button>

      {openListino && (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => navigate("/listino")}>Gestione Listino</button>
        </div>
      )}

    </div>
  )
}

// APP
export default function App() {
  return (
    <Router>

      <Menu />

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "10px"
        }}
      >
        <Routes>
          <Route path="/" element={<CalendarMonth />} />
          <Route path="/interventi" element={<InterventiPage />} />
          <Route path="/clienti" element={<ClientiPage />} />
          <Route path="/listino" element={<ListinoPage />} />
          <Route path="/bollettino/:id" element={<BollettinoPage />} />
          <Route path="/fatture" element={<FatturePage />} />
          <Route path="/storico-fatture" element={<StoricoFatturePage />} />
          <Route path="/archivio" element={<ArchivioInterventiPage />} />
          <Route path="/archivio-cliente" element={<ArchivioClientePage />} />
          <Route path="/fattura/:id" element={<FatturaDettaglioPage />} />
          <Route path="/operatori" element={<OperatoriPage />} />
<Route path="/storico" element={<InterventiStorico />} />


          {/* 🆕 ROUTE BOLLE */}
          <Route path="/bolle" element={<BolleUploadPage />} />

          <Route path="/test" element={<TestCantieri />} />
        </Routes>
      </div>

    </Router>
  )
}

// STILE MENU
const menuBar = {
  display: "flex",
  gap: 10,
  padding: 10,
  borderBottom: "1px solid #ccc",
  background: "#f5f5f5",
  flexWrap: "wrap"
}