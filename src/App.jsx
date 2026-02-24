import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import InterventiPage from "./pages/InterventiPage"
import ClientiPage from "./pages/ClientiPage"

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: "20px", fontFamily: "Arial" }}>
        
        {/* MENU NAVIGAZIONE */}
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/" style={{ marginRight: "15px" }}>
            Calendario
          </Link>

          <Link to="/interventi" style={{ marginRight: "15px" }}>
            Interventi
          </Link>

          <Link to="/clienti">
            Clienti
          </Link>
        </nav>

        {/* ROUTES */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/interventi" element={<InterventiPage />} />
          <Route path="/clienti" element={<ClientiPage />} />
        </Routes>

      </div>
    </BrowserRouter>
  )
}

export default App