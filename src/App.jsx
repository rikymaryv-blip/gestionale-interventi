import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom"
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
import OreMesePage from "./pages/OreMesePage"
import BolleUploadPage from "./pages/BolleUploadPage"
import TestCantieri from "./TestCantieri"

// 🔥 NUOVO
import StoricoInterventiPage from "./pages/StoricoInterventiPage"

// MENU
function Menu() {
  const [openFatt, setOpenFatt] = useState(false)
  const [openListino, setOpenListino] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function btn(path, label, icon) {
    const active = location.pathname === path

    return (
      <button
        onClick={() => navigate(path)}
        style={{
          ...menuBtn,
          background: active ? "#1976d2" : "white",
          color: active ? "white" : "black",
          border: active ? "none" : "1px solid #ccc"
        }}
      >
        {icon} {label}
      </button>
    )
  }

  return (
    <div style={menuBar}>

      {btn("/", "Calendario", "📅")}
      {btn("/interventi", "Interventi", "🧾")}
      {btn("/clienti", "Clienti", "👤")}

      {/* 🔥 NUOVO BOTTONE */}
      {btn("/storico-interventi", "Storico Interventi", "📂")}

      {/* BOLLE */}
      <button
        style={menuBtn}
        onClick={() => {
          const codice = prompt("Inserisci codice accesso")
          if (codice !== "1234") return alert("Accesso negato")
          navigate("/bolle")
        }}
      >
        📥 Bolle
      </button>

      {/* FATTURAZIONE */}
      <button
        style={menuBtn}
        onClick={() => {
          const codice = prompt("Inserisci codice accesso")
          if (codice !== "1234") return alert("Accesso negato")
          setOpenFatt(!openFatt)
        }}
      >
        💰 Fatturazione
      </button>

      {openFatt && (
        <div style={subMenu}>
          {btn("/fatture", "Fatture", "💰")}
          {btn("/storico-fatture", "Storico", "📜")}
        </div>
      )}

      {/* LISTINO */}
      <button
        style={menuBtn}
        onClick={() => {
          const codice = prompt("Inserisci codice accesso")
          if (codice !== "1234") return alert("Accesso negato")
          setOpenListino(!openListino)
        }}
      >
        📦 Listino
      </button>

      {openListino && (
        <div style={subMenu}>
          {btn("/listino", "Gestione", "📦")}
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
          <Route path="/ore-mese" element={<OreMesePage />} />
          <Route path="/bolle" element={<BolleUploadPage />} />
          <Route path="/test" element={<TestCantieri />} />

          {/* 🔥 NUOVA ROUTE */}
          <Route path="/storico-interventi" element={<StoricoInterventiPage />} />
        </Routes>
      </div>

    </Router>
  )
}

// STILI
const menuBar = {
  display: "flex",
  gap: 10,
  padding: 10,
  borderBottom: "1px solid #ccc",
  background: "#f5f5f5",
  flexWrap: "wrap"
}

const menuBtn = {
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
  border: "1px solid #ccc",
  background: "white"
}

const subMenu = {
  display: "flex",
  gap: 8,
  marginLeft: 10,
  flexWrap: "wrap"
}