import { useEffect } from "react"
import { Html5Qrcode } from "html5-qrcode"

export default function BarcodeScanner({ onScan, onClose }) {

  useEffect(() => {
    const scanner = new Html5Qrcode("reader")

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText) => {
        onScan(decodedText)
        scanner.stop()
        onClose()
      },
      () => {}
    )

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [])

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "black",
      zIndex: 9999
    }}>
      <div id="reader" style={{ width: "100%" }} />

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "10px",
          background: "white"
        }}
      >
        Chiudi
      </button>
    </div>
  )
}