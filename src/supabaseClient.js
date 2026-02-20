import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://olmekymxlopdilkhucvf.supabase.co'
const supabaseAnonKey = 'sb_publishable_s9jPRatosqy23kNRtfjVlA_txqZgOpJ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
