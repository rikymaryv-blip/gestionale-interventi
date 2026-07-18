// CONFIGURAZIONE PUNTI LUCE

const creaVoce = ({
  value,
  label,
  moduli = 0,
  richiedePosti = false,
  postiFissi = 1,
  postiDefault = 1,
  richiedeDescrizione = false,
  ordine = 1
}) => ({
  value,
  voce: label,
  label,
  moduli,
  richiedePosti,
  richiede_posti: richiedePosti,
  postiFissi,
  posti_fissi: postiFissi,
  postiDefault,
  posti_default: postiDefault,
  richiedeDescrizione,
  richiede_descrizione: richiedeDescrizione,
  attivo: true,
  ordine
})

export const serieCivili = [
  "Living",
  "Matix",
  "Linea",
  "Now",
  "Altro"
]

export const scatoleDisponibili = [
  {
    codice: "503",
    moduli: 3,
    descrizioneSupporto: "Supporto 503",
    descrizionePlacca: "Placca 503"
  },
  {
    codice: "504",
    moduli: 4,
    descrizioneSupporto: "Supporto 504",
    descrizionePlacca: "Placca 504"
  },
  {
    codice: "506",
    moduli: 6,
    descrizioneSupporto: "Supporto 506",
    descrizionePlacca: "Placca 506"
  },
  {
    codice: "507",
    moduli: 7,
    descrizioneSupporto: "Supporto 507",
    descrizionePlacca: "Placca 507"
  }
]

export const capitoliPuntiLuce = {
  punti_luce: {
    label: "💡 Punti luce",
    ordine: 1,
    voci: [
      creaVoce({
        value: "interruttore",
        label: "Accensione a interruttore",
        moduli: 1,
        postiFissi: 1,
        ordine: 1
      }),

      creaVoce({
        value: "deviata",
        label: "Accensione deviata",
        moduli: 2,
        postiFissi: 2,
        postiDefault: 2,
        ordine: 2
      }),

      creaVoce({
        value: "invertita",
        label: "Accensione invertita",
        moduli: null,
        richiedePosti: true,
        postiFissi: null,
        postiDefault: 3,
        ordine: 3
      }),

      creaVoce({
        value: "pulsante",
        label: "Accensione a pulsante",
        moduli: null,
        richiedePosti: true,
        postiFissi: null,
        postiDefault: 1,
        ordine: 4
      })
    ]
  },

  prese: {
    label: "🔌 Prese",
    ordine: 2,
    voci: [
      creaVoce({
        value: "presa_bipasso",
        label: "Presa bipasso",
        moduli: 1,
        ordine: 1
      }),

      creaVoce({
        value: "presa_schuko",
        label: "Presa schuko",
        moduli: 2,
        ordine: 2
      }),

      creaVoce({
        value: "presa_tv",
        label: "Presa TV",
        moduli: 1,
        ordine: 3
      }),

      creaVoce({
        value: "presa_dati",
        label: "Presa dati RJ45",
        moduli: 1,
        ordine: 4
      }),

      creaVoce({
        value: "presa_usb",
        label: "Presa USB",
        moduli: 1,
        ordine: 5
      })
    ]
  },

  comandi: {
    label: "🔘 Comandi",
    ordine: 3,
    voci: [
      creaVoce({
        value: "tapparella",
        label: "Comando tapparella",
        moduli: 2,
        ordine: 1
      }),

      creaVoce({
        value: "termostato",
        label: "Termostato",
        moduli: 3,
        ordine: 2
      }),

      creaVoce({
        value: "citofono",
        label: "Citofono",
        moduli: 0,
        ordine: 3
      })
    ]
  },

  predisposizioni: {
    label: "📦 Predisposizioni",
    ordine: 4,
    voci: [
      creaVoce({
        value: "coperchio_cieco",
        label: "Coperchio cieco",
        moduli: 0,
        ordine: 1
      }),

      creaVoce({
        value: "pred_clima",
        label: "Predisposizione climatizzatore",
        moduli: 0,
        ordine: 2
      }),

      creaVoce({
        value: "pred_forno",
        label: "Predisposizione forno",
        moduli: 0,
        ordine: 3
      }),

      creaVoce({
        value: "pred_lavastoviglie",
        label: "Predisposizione lavastoviglie",
        moduli: 0,
        ordine: 4
      }),

      creaVoce({
        value: "pred_lavatrice",
        label: "Predisposizione lavatrice",
        moduli: 0,
        ordine: 5
      })
    ]
  },

  altro: {
    label: "🧰 Altro",
    ordine: 5,
    voci: [
      creaVoce({
        value: "altro",
        label: "Altro",
        moduli: 1,
        richiedeDescrizione: true,
        ordine: 1
      })
    ]
  }
}

export const vociPuntiLuce =
  Object.entries(capitoliPuntiLuce).flatMap(
    ([capitolo, configurazione]) =>
      configurazione.voci.map((voce, indice) => ({
        id: `${capitolo}_${voce.value}`,
        capitolo,
        ...voce,
        ordine: voce.ordine || indice + 1
      }))
  )

export const stanzeTipoPredefinite = [
  {
    id: "cucina",
    nome: "Cucina",
    attivo: true,
    ordine: 1
  },
  {
    id: "soggiorno",
    nome: "Soggiorno",
    attivo: true,
    ordine: 2
  },
  {
    id: "camera",
    nome: "Camera",
    attivo: true,
    ordine: 3
  },
  {
    id: "bagno",
    nome: "Bagno",
    attivo: true,
    ordine: 4
  },
  {
    id: "corridoio",
    nome: "Corridoio",
    attivo: true,
    ordine: 5
  },
  {
    id: "garage",
    nome: "Garage",
    attivo: true,
    ordine: 6
  },
  {
    id: "esterno",
    nome: "Esterno",
    attivo: true,
    ordine: 7
  }
]

export function labelCapitolo(capitolo) {
  return (
    capitoliPuntiLuce[capitolo]?.label ||
    String(capitolo || "")
      .replaceAll("_", " ")
      .toUpperCase()
  )
}

export function creaStanzaVuota(nome = "") {
  return {
    id: `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 9)}`,

    nome,

    scatole: {
      "503": 0,
      "504": 0,
      "506": 0,
      "507": 0
    },

    punti: []
  }
}

// NOMI COMPATIBILI CON LE ALTRE PAGINE

export const SERIE_CIVILI = serieCivili
export const SERIE_PRODOTTO = serieCivili

export const SCATOLE_DISPONIBILI =
  scatoleDisponibili

export const CAPITOLI_PUNTI_LUCE =
  capitoliPuntiLuce

export const VOCI_PUNTI_LUCE =
  vociPuntiLuce

export const STANZE_TIPO_PREDEFINITE =
  stanzeTipoPredefinite

export const puntiLuceConfig = {
  serieCivili,
  scatoleDisponibili,
  capitoliPuntiLuce,
  vociPuntiLuce,
  stanzeTipoPredefinite
}

export const PUNTI_LUCE_CONFIG =
  puntiLuceConfig

export default puntiLuceConfig
