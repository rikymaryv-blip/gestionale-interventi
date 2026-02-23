import { supabase } from "../supabaseClient"

// =========================
// INTERVENTI
// =========================

export async function getInterventi() {
  const { data, error } = await supabase
    .from("interventi")
    .select(`
      *,
      clienti(nome),
      ore_operatori(
        id,
        ore,
        operatori(nome)
      ),
      materiali_bollettino(
        id,
        codice,
        descrizione,
        quantita,
        prezzo,
        totale
      )
    `)
    .order("data", { ascending: false })

  return { data, error }
}

export async function createIntervento(descrizione, cliente_id, data) {
  const { data: inserted, error } = await supabase
    .from("interventi")
    .insert([{ descrizione, data, cliente_id }])
    .select(`
      *,
      clienti(nome),
      materiali_bollettino(*)
    `)
    .single()

  return { data: inserted, error }
}

export async function updateIntervento(id, descrizione, cliente_id, data) {
  const { data: updated, error } = await supabase
    .from("interventi")
    .update({ descrizione, cliente_id, data })
    .eq("id", id)
    .select(`
      *,
      clienti(nome),
      materiali_bollettino(*)
    `)
    .single()

  return { data: updated, error }
}

export async function deleteIntervento(id) {
  const { error } = await supabase
    .from("interventi")
    .delete()
    .eq("id", id)

  return { error }
}

// =========================
// CLIENTI
// =========================

export async function getClienti() {
  const { data, error } = await supabase
    .from("clienti")
    .select("*")
    .order("nome", { ascending: true })

  return { data, error }
}

export async function createCliente(nome) {
  const { data, error } = await supabase
    .from("clienti")
    .insert([{ nome, attivo: true }])
    .select()
    .single()

  return { data, error }
}

// =========================
// OPERATORI
// =========================

export async function getOperatori() {
  const { data, error } = await supabase
    .from("operatori")
    .select("*")
    .order("nome", { ascending: true })

  return { data, error }
}

// =========================
// ORE OPERATORI
// =========================

export async function salvaOreOperatore(intervento_id, operatore_id, ore) {
  const { data, error } = await supabase
    .from("ore_operatori")
    .insert([{ intervento_id, operatore_id, ore }])
    .select()
    .single()

  return { data, error }
}

// =========================
// RICERCA MATERIALE
// =========================

export async function cercaPreferiti(testo) {
  if (!testo || testo.length < 2) {
    return { data: [], error: null }
  }

  const cleaned = testo.trim()

  const { data, error } = await supabase
    .from("articoli_preferiti")
    .select("id, codice, descrizione, prezzo")
    .ilike("codice", `${cleaned}%`)
    .limit(20)

  return { data: data || [], error }
}

export async function cercaListino(testo) {
  if (!testo) {
    return { data: [], error: null }
  }

  const cleaned = testo
    .trim()
    .replace(/\s+/g, " ")

  if (!cleaned || cleaned.length < 2 || cleaned.endsWith(" ")) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase.rpc(
    "cerca_listino_fast",
    { q: cleaned, lim: 30 }
  )

  return { data: data || [], error }
}

// =========================
// MATERIALI BOLLETTINO
// =========================

export async function salvaMateriale(intervento_id, materiale) {
  const { data, error } = await supabase
    .from("materiali_bollettino")
    .insert([{
      intervento_id,
      codice: materiale.codice,
      descrizione: materiale.descrizione,
      quantita: materiale.quantita,
      prezzo: materiale.prezzo,
      totale: materiale.quantita * materiale.prezzo,
      origine: "listino"
    }])

  return { data, error }
}