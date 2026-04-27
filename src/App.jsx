import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import AgentPanel from './components/AgentPanel'
import CampgroundCanvas from './game/CampgroundCanvas'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Load agents when we have a session.
  const loadAgents = useCallback(async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load agents:', error)
    } else {
      setAgents(data)
    }
  }, [])

  useEffect(() => {
    if (session) {
      loadAgents()
    }
  }, [session, loadAgents])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <h1 className="text-lg text-amber-200 font-semibold">Campground</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          Log out
        </button>
      </header>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 flex items-center justify-center p-4">
          <CampgroundCanvas agents={agents} />
        </main>
        <AgentPanel session={session} agents={agents} onAgentCreated={loadAgents} />
      </div>
    </div>
  )
}

export default App
