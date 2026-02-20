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
      )
    `)
    .order("data", { ascending: false })

  return { data, error }
}

export async function createIntervento(descrizione, cliente_id, data) {
  const { data: inserted, error } = await supabase
    .from("interventi")
    .insert([{ descrizione, data, cliente_id }])
    .select("*, clienti(nome)")
    .single()

  return { data: inserted, error }
}

export async function updateIntervento(id, descrizione, cliente_id, data) {
  const { data: updated, error } = await supabase
    .from("interventi")
    .update({ descrizione, cliente_id, data })
    .eq("id", id)
    .select("*, clienti(nome)")
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