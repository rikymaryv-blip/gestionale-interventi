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
        operatore_id,
        operatori(id, nome)
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
    .select()
    .single()

  return { data: inserted, error }
}

export async function updateIntervento(id, descrizione, cliente_id, data) {
  const { data: updated, error } = await supabase
    .from("interventi")
    .update({ descrizione, cliente_id, data })
    .eq("id", id)
    .select()
    .single()

  return { data: updated, error }
}

export async function deleteIntervento(id) {
  return await supabase.from("interventi").delete().eq("id", id)
}

// =========================
// CLIENTI
// =========================

export async function getClienti() {
  return await supabase.from("clienti").select("*").order("nome")
}

// =========================
// OPERATORI
// =========================

export async function getOperatori() {
  return await supabase.from("operatori").select("*").order("nome")
}

// =========================
// ORE
// =========================

export async function salvaOreOperatore(intervento_id, operatore_id, ore) {
  return await supabase
    .from("ore_operatori")
    .insert([{ intervento_id, operatore_id, ore }])
}

export async function deleteOreByIntervento(intervento_id) {
  return await supabase
    .from("ore_operatori")
    .delete()
    .eq("intervento_id", intervento_id)
}

// =========================
// 🔥 RICERCA COME PRIMA (FUNZIONANTE)
// =========================

export async function cercaListino(testo) {
  try {
    if (!testo || testo.length < 2) {
      return { data: [] }
    }

    const q = testo.trim()

    const filtro = `codice.ilike.%${q}%,descrizione.ilike.%${q}%,ean.ilike.%${q}%`

    const { data, error } = await supabase
      .from("articoli_listino")
      .select("id, codice, descrizione, prezzo, ean")
      .or(filtro)
      .limit(100)

    if (error) {
      console.error(error)
      return { data: [] }
    }

    return { data }

  } catch (err) {
    console.error(err)
    return { data: [] }
  }
}

// =========================
// MATERIALI
// =========================

export async function salvaMateriale(intervento_id, materiale) {
  return await supabase.from("materiali_bollettino").insert([{
    intervento_id,
    codice: materiale.codice,
    descrizione: materiale.descrizione,
    quantita: materiale.quantita,
    prezzo: materiale.prezzo,
    totale: materiale.quantita * materiale.prezzo
  }])
}

export async function updateMateriale(id, quantita) {
  return await supabase
    .from("materiali_bollettino")
    .update({ quantita })
    .eq("id", id)
}

export async function deleteMateriale(id) {
  return await supabase
    .from("materiali_bollettino")
    .delete()
    .eq("id", id)
}

export async function deleteMaterialiByIntervento(intervento_id) {
  return await supabase
    .from("materiali_bollettino")
    .delete()
    .eq("intervento_id", intervento_id)
}