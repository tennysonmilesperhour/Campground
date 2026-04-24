import { createClient } from '@supabase/supabase-js'

// These values come from environment variables so they are not
// hardcoded in source code. Vite makes env vars available via
// import.meta.env when they are prefixed with VITE_.
//
// You set these in a .env.local file at the project root:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key-here
//
// .env.local is in .gitignore so it won't be committed.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase env vars. Create a .env.local file with ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
