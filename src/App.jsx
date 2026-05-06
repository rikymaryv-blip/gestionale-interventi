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

// NUOVI
import StoricoInterventiPage from "./pages/StoricoInterventiPage"
import CarrelliPage from "./pages/CarrelliPage"
import PreferitiPage from "./pages/PreferitiPage"
import OreOperatoriExcelPage from "./pages/OreOperatoriExcelPage"

// MENU
function Menu() {
  const [openMateriali, setOpenMateriali] = useState(false)
  const [openArchivio, setOpenArchivio] = useState(false)
  const [openFatt, setOpenFatt] = useState(false)

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

  function chiediCodiceEApri(callback) {
    const codice = prompt("Inserisci codice accesso")
    if (codice !== "1234") {
      alert("Accesso negato")
      return
    }

    callback()
  }

  return (
    <div style={menuBar}>

      {/* PRINCIPALI */}
      {btn("/", "Calendario", "📅")}
      {btn("/interventi", "Interventi", "🧾")}
      {btn("/clienti", "Clienti", "👤")}

      {/* MATERIALI */}
      <button
        style={{
          ...menuBtn,
          background: openMateriali ? "#1976d2" : "white",
          color: openMateriali ? "white" : "black",
          border: openMateriali ? "none" : "1px solid #ccc"
        }}
        onClick={() => {
          chiediCodiceEApri(() => {
            setOpenMateriali(!openMateriali)
            setOpenArchivio(false)
            setOpenFatt(false)
          })
        }}
      >
        📦 Materiali
      </button>

      {openMateriali && (
        <div style={subMenu}>
          {btn("/bolle", "Bolle", "📥")}
          {btn("/carrelli", "Carrelli", "🛒")}
          {btn("/preferiti", "Preferiti", "⭐")}
          {btn("/listino", "Listino", "📦")}
        </div>
      )}

      {/* ARCHIVIO */}
      <button
        style={{
          ...menuBtn,
          background: openArchivio ? "#1976d2" : "white",
          color: openArchivio ? "white" : "black",
          border: openArchivio ? "none" : "1px solid #ccc"
        }}
        onClick={() => {
          setOpenArchivio(!openArchivio)
          setOpenMateriali(false)
          setOpenFatt(false)
        }}
      >
        📂 Archivio
      </button>

      {openArchivio && (
        <div style={subMenu}>
          {btn("/storico-interventi", "Storico Interventi", "📂")}
          {btn("/archivio", "Archivio Interventi", "📦")}
          {btn("/archivio-cliente", "Archivio Cliente", "👤")}
        </div>
      )}

      {/* FATTURAZIONE */}
      <button
        style={{
          ...menuBtn,
          background: openFatt ? "#1976d2" : "white",
          color: openFatt ? "white" : "black",
          border: openFatt ? "none" : "1px solid #ccc"
        }}
        onClick={() => {
          chiediCodiceEApri(() => {
            setOpenFatt(!openFatt)
            setOpenMateriali(false)
            setOpenArchivio(false)
          })
        }}
      >
        💰 Fatturazione
      </button>

      {openFatt && (
        <div style={subMenu}>
          {btn("/fatture", "Fatture", "💰")}
          {btn("/storico-fatture", "Storico Fatture", "📜")}
          {btn("/ore-operatori-excel", "Ore Operatori", "📊")}
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
          <Route path="/carrelli" element={<CarrelliPage />} />
          <Route path="/preferiti" element={<PreferitiPage />} />
          <Route path="/ore-operatori-excel" element={<OreOperatoriExcelPage />} />
          <Route path="/test" element={<TestCantieri />} />
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
  flexWrap: "wrap",
  padding: "6px 8px",
  background: "#eeeeee",
  borderRadius: 6
}