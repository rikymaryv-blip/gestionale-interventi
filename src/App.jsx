import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import InterventiPage from "./pages/InterventiPage"

function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: "20px", fontFamily: "Arial" }}>
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/" style={{ marginRight: "15px" }}>
            Calendario
          </Link>
          <Link to="/interventi">
            Interventi
          </Link>
        </nav>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/interventi" element={<InterventiPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App