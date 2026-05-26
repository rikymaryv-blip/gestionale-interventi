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
import PuntiLucePage from "./pages/PuntiLucePage"
import PuntiLuceVociPage from "./pages/PuntiLuceVociPage"
import PuntiLuceStanzeTipoPage from "./pages/PuntiLuceStanzeTipoPage"
import ListaOrdinePage from "./pages/ListaOrdinePage"

// MENU
function Menu() {
  const [menuAperto, setMenuAperto] = useState("")
  const navigate = useNavigate()
  const location = useLocation()

  function chiediCodiceEApri(callback) {
    const codice = prompt("Inserisci codice accesso")
    if (codice !== "1234") {
      alert("Accesso negato")
      return
    }

    callback()
  }

  function capitolo(nome, label, icon, protetto = false) {
    const active = menuAperto === nome

    return (
      <button
        onClick={() => {
          if (nome === "calendario") {
            setMenuAperto("")
            navigate("/")
            return
          }

          if (protetto) {
            chiediCodiceEApri(() => {
              setMenuAperto(active ? "" : nome)
            })
            return
          }

          setMenuAperto(active ? "" : nome)
        }}
        style={{
          ...menuBtn,
          background: active || (nome === "calendario" && location.pathname === "/") ? "#1976d2" : "white",
          color: active || (nome === "calendario" && location.pathname === "/") ? "white" : "black",
          border: active || (nome === "calendario" && location.pathname === "/") ? "none" : "1px solid #ccc",
          fontWeight: "bold"
        }}
      >
        {icon} {label}
      </button>
    )
  }

  function btn(path, label, icon, protetto = false) {
    const active = location.pathname === path

    return (
      <button
        onClick={() => {
          if (protetto) {
            chiediCodiceEApri(() => navigate(path))
            return
          }

          navigate(path)
        }}
        style={{
          ...subBtn,
          background: active ? "#1976d2" : "white",
          color: active ? "white" : "black",
          border: active ? "none" : "1px solid #ccc"
        }}
      >
        {icon} {label}
      </button>
    )
  }

  function renderSottoMenu() {
    if (menuAperto === "interventi") {
      return (
        <div style={subMenuBar}>
          {btn("/interventi", "Interventi", "🧾")}
          {btn("/storico-interventi", "Storico Interventi", "📂")}
          {btn("/archivio", "Archivio Interventi", "📦")}
          {btn("/ore-mese", "Ore Mese", "📊")}
        </div>
      )
    }

    if (menuAperto === "punti_luce") {
      return (
        <div style={subMenuBar}>
          {btn("/punti-luce", "Progetto Punti Luce", "💡")}
          {btn("/punti-luce-voci", "Voci Punti Luce", "⚙️")}
          {btn("/punti-luce-stanze-tipo", "Stanze Tipo", "🏠")}
        </div>
      )
    }

    if (menuAperto === "anagrafiche") {
      return (
        <div style={subMenuBar}>
          {btn("/clienti", "Clienti", "👤")}
          {btn("/operatori", "Operatori", "👷", true)}
        </div>
      )
    }

    if (menuAperto === "materiali") {
      return (
        <div style={subMenuBar}>
          {btn("/bolle", "Bolle", "📥")}
          {btn("/carrelli", "Carrelli", "🛒")}
          {btn("/preferiti", "Preferiti", "⭐")}
          {btn("/lista-ordine", "Lista Ordine", "🧾")}
          {btn("/listino", "Listino", "📦")}
        </div>
      )
    }

    if (menuAperto === "fatturazione") {
      return (
        <div style={subMenuBar}>
          {btn("/fatture", "Fatture", "💰")}
          {btn("/storico-fatture", "Storico Fatture", "📜")}
          {btn("/archivio-cliente", "Archivio Cliente", "👤")}
          {btn("/ore-operatori-excel", "Ore Operatori", "📊")}
        </div>
      )
    }

    return null
  }

  return (
    <>
      <div style={menuBar}>
        {capitolo("calendario", "Calendario", "📅")}
        {capitolo("interventi", "Interventi", "🧾")}
        {capitolo("punti_luce", "Punti Luce", "💡")}
        {capitolo("anagrafiche", "Anagrafiche", "👤")}
        {capitolo("materiali", "Materiali", "📦", true)}
        {capitolo("fatturazione", "Fatturazione", "💰", true)}
      </div>

      {renderSottoMenu()}
    </>
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
          <Route path="/punti-luce" element={<PuntiLucePage />} />
          <Route path="/punti-luce-voci" element={<PuntiLuceVociPage />} />
          <Route path="/punti-luce-stanze-tipo" element={<PuntiLuceStanzeTipoPage />} />
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
          <Route path="/lista-ordine" element={<ListaOrdinePage />} />
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
  padding: "9px 14px",
  borderRadius: 6,
  cursor: "pointer",
  border: "1px solid #ccc",
  background: "white"
}

const subMenuBar = {
  display: "flex",
  gap: 8,
  padding: "10px",
  borderBottom: "1px solid #ddd",
  background: "#eeeeee",
  flexWrap: "wrap"
}

const subBtn = {
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
  border: "1px solid #ccc",
  background: "white"
}