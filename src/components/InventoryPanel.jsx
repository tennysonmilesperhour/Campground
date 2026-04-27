import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Shows the skills an agent is carrying and lets you add new ones.
// "Inventory" in the database is a join table between agents and skills.
// When you create a skill here, it creates the skill row AND adds it
// to this agent's inventory in one step.

export default function InventoryPanel({ agent, session }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form state for creating a new skill
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('prompt')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadInventory = useCallback(async () => {
    if (!agent) return

    // Query the inventories table and join in the skill data.
    // This gives us both the inventory record and the full skill details.
    const { data, error } = await supabase
      .from('inventories')
      .select('id, skill_id, skills(id, title, description, body, type)')
      .eq('agent_id', agent.id)

    if (error) {
      console.error('Failed to load inventory:', error)
    } else {
      setSkills(data || [])
    }
    setLoading(false)
  }, [agent])

  useEffect(() => {
    setLoading(true)
    loadInventory()
  }, [loadInventory])

  async function handleCreateSkill(e) {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    setError(null)

    // Step 1: Create the skill itself.
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .insert({
        author_user_id: session.user.id,
        title: title.trim(),
        description: description.trim(),
        body: body.trim(),
        type,
      })
      .select()
      .single()

    if (skillError) {
      setError(skillError.message)
      setSaving(false)
      return
    }

    // Step 2: Add it to this agent's inventory.
    const { error: invError } = await supabase
      .from('inventories')
      .insert({ agent_id: agent.id, skill_id: skill.id })

    if (invError) {
      setError(invError.message)
    } else {
      setTitle('')
      setDescription('')
      setBody('')
      setType('prompt')
      setShowForm(false)
      loadInventory()
    }

    setSaving(false)
  }

  if (!agent) return null

  return (
    <div className="border-t border-gray-800 pt-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase">
          Inventory ({skills.length})
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] text-amber-400 hover:text-amber-300 uppercase tracking-wider"
        >
          {showForm ? 'Cancel' : '+ Add Skill'}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-600">Loading...</p>
      ) : skills.length === 0 && !showForm ? (
        <p className="text-xs text-gray-600">No skills yet.</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {skills.map((inv) => (
            <li
              key={inv.id}
              className="p-1.5 bg-gray-800/50 rounded text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-600 uppercase">
                  {inv.skills?.type}
                </span>
                <span className="text-gray-300">{inv.skills?.title}</span>
              </div>
              {inv.skills?.description && (
                <p className="text-gray-600 mt-0.5">{inv.skills.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleCreateSkill} className="space-y-2 mt-2">
          <input
            type="text"
            placeholder="Skill title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-amber-500"
          />
          <input
            type="text"
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-amber-500"
          />
          <textarea
            placeholder="Skill body (markdown)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-amber-500 resize-none"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 focus:outline-none focus:border-amber-500"
          >
            <option value="prompt">Prompt</option>
            <option value="snippet">Snippet</option>
            <option value="playbook">Playbook</option>
            <option value="command">Command</option>
            <option value="doc">Doc</option>
          </select>
          {error && <p className="text-red-400 text-[10px]">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-1 bg-amber-700 hover:bg-amber-600 text-amber-100 rounded text-xs font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add to Inventory'}
          </button>
        </form>
      )}
    </div>
  )
}
