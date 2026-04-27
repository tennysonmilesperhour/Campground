import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import AgentPanel from './components/AgentPanel'
import CampgroundCanvas from './game/CampgroundCanvas'
import TradeDialog from './components/TradeDialog'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState([])
  // Which agent the user is currently walking around as an avatar.
  const [activeAgentId, setActiveAgentId] = useState(null)
  // Which agent (if any) the avatar is currently near.
  const [nearAgent, setNearAgent] = useState(null)
  // Whether the trade dialog is open.
  const [tradeOpen, setTradeOpen] = useState(false)

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

  // Save an agent's position to Supabase. Called by the Phaser scene
  // when the avatar moves (throttled, not every frame).
  const handlePositionChange = useCallback(async (agentId, x, y) => {
    await supabase
      .from('agents')
      .update({ position_x: x, position_y: y })
      .eq('id', agentId)
  }, [])

  // Called by Phaser when the avatar enters/exits proximity of another agent.
  const handleProximity = useCallback((agent) => {
    setNearAgent(agent)
  }, [])

  const activeAgent = agents.find((a) => a.id === activeAgentId)

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
          <CampgroundCanvas
            agents={agents}
            activeAgentId={activeAgentId}
            onPositionChange={handlePositionChange}
            onProximity={handleProximity}
          />
        </main>
        <AgentPanel
          session={session}
          agents={agents}
          activeAgentId={activeAgentId}
          nearAgent={nearAgent}
          onSelectAgent={setActiveAgentId}
          onAgentCreated={loadAgents}
          onOpenTrade={() => setTradeOpen(true)}
        />
      </div>

      {tradeOpen && activeAgent && nearAgent && (
        <TradeDialog
          session={session}
          avatarAgent={activeAgent}
          targetAgent={nearAgent}
          onClose={() => setTradeOpen(false)}
          onTradeComplete={loadAgents}
        />
      )}
    </div>
  )
}

export default App
