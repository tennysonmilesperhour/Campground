import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Panel for creating agents and viewing the list of your agents.
// Each agent represents one of your real projects.

export default function AgentPanel({ session }) {
  const [agents, setAgents] = useState([])
  const [name, setName] = useState('')
  const [currentProject, setCurrentProject] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  // Load agents from Supabase when the component mounts.
  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to load agents:', error)
    } else {
      setAgents(data)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setError(null)

    // Randomize starting position a bit so agents don't stack on top
    // of each other. 200-600 range keeps them in the visible area.
    const position_x = 200 + Math.random() * 400
    const position_y = 150 + Math.random() * 300

    const { error } = await supabase.from('agents').insert({
      user_id: session.user.id,
      name: name.trim(),
      current_project: currentProject.trim(),
      position_x,
      position_y,
    })

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setCurrentProject('')
      await loadAgents()
    }

    setCreating(false)
  }

  return (
    <div className="w-72 bg-gray-850 border-l border-gray-800 p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Your Agents
      </h2>

      {/* Agent list */}
      {agents.length === 0 ? (
        <p className="text-sm text-gray-600">No agents yet. Create one below.</p>
      ) : (
        <ul className="space-y-2">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className="p-2 bg-gray-800 rounded border border-gray-700"
            >
              <p className="text-sm text-amber-200 font-medium">{agent.name}</p>
              {agent.current_project && (
                <p className="text-xs text-gray-500 mt-1">{agent.current_project}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Create agent form */}
      <form onSubmit={handleCreate} className="space-y-2 border-t border-gray-800 pt-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase">New Agent</h3>
        <input
          type="text"
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-amber-500"
        />
        <input
          type="text"
          placeholder="Current project (optional)"
          value={currentProject}
          onChange={(e) => setCurrentProject(e.target.value)}
          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 focus:outline-none focus:border-amber-500"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={creating}
          className="w-full py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded text-sm font-medium disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Agent'}
        </button>
      </form>
    </div>
  )
}
