import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Trade dialog: appears when the avatar is near another agent and
// the user clicks "Trade." Shows both agents' inventories side by
// side and lets you pick a skill to copy from one to the other.
//
// A "trade" in Phase 1 is simple: pick a skill from one agent's
// inventory and copy it to the other. The skill itself is not
// removed from the source (it's a copy, like sharing knowledge).

export default function TradeDialog({
  session,
  avatarAgent,
  targetAgent,
  onClose,
  onTradeComplete,
}) {
  const [avatarSkills, setAvatarSkills] = useState([])
  const [targetSkills, setTargetSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [trading, setTrading] = useState(false)
  const [message, setMessage] = useState(null)

  const loadBothInventories = useCallback(async () => {
    const [avatarRes, targetRes] = await Promise.all([
      supabase
        .from('inventories')
        .select('id, skill_id, skills(id, title, description, type)')
        .eq('agent_id', avatarAgent.id),
      supabase
        .from('inventories')
        .select('id, skill_id, skills(id, title, description, type)')
        .eq('agent_id', targetAgent.id),
    ])

    if (!avatarRes.error) setAvatarSkills(avatarRes.data || [])
    if (!targetRes.error) setTargetSkills(targetRes.data || [])
    setLoading(false)
  }, [avatarAgent.id, targetAgent.id])

  useEffect(() => {
    loadBothInventories()
  }, [loadBothInventories])

  // Transfer a skill: copy it from one agent's inventory to the other.
  // Creates a trade record, then adds the skill to the receiver's inventory.
  async function handleTransfer(skillId, fromAgentId, toAgentId, direction) {
    setTrading(true)
    setMessage(null)

    // Check if the receiver already has this skill.
    const { data: existing } = await supabase
      .from('inventories')
      .select('id')
      .eq('agent_id', toAgentId)
      .eq('skill_id', skillId)
      .single()

    if (existing) {
      setMessage('That agent already has this skill.')
      setTrading(false)
      return
    }

    // Create the trade record.
    const { error: tradeError } = await supabase.from('trades').insert({
      offerer_agent_id: fromAgentId,
      receiver_agent_id: toAgentId,
      skill_id: skillId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })

    if (tradeError) {
      setMessage('Trade failed: ' + tradeError.message)
      setTrading(false)
      return
    }

    // Copy the skill into the receiver's inventory.
    const { error: invError } = await supabase
      .from('inventories')
      .insert({ agent_id: toAgentId, skill_id: skillId })

    if (invError) {
      setMessage('Failed to add skill: ' + invError.message)
    } else {
      setMessage(
        direction === 'offer'
          ? `Shared skill with ${targetAgent.name}.`
          : `Received skill from ${targetAgent.name}.`
      )
      loadBothInventories()
      if (onTradeComplete) onTradeComplete()
    }

    setTrading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg mx-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-amber-200">Trade</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            Close
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-600 text-center py-8">Loading inventories...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {/* Avatar's inventory (left side) */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-2">
                {avatarAgent.name}
              </h3>
              {avatarSkills.length === 0 ? (
                <p className="text-xs text-gray-600">No skills</p>
              ) : (
                <ul className="space-y-1">
                  {avatarSkills.map((inv) => (
                    <li
                      key={inv.id}
                      className="p-1.5 bg-gray-800 rounded flex items-center justify-between gap-1"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-gray-300 truncate">
                          {inv.skills?.title}
                        </p>
                        <p className="text-[10px] text-gray-600">{inv.skills?.type}</p>
                      </div>
                      <button
                        onClick={() =>
                          handleTransfer(
                            inv.skill_id,
                            avatarAgent.id,
                            targetAgent.id,
                            'offer'
                          )
                        }
                        disabled={trading}
                        className="text-[10px] text-amber-400 hover:text-amber-300 shrink-0 disabled:opacity-50"
                        title={`Share with ${targetAgent.name}`}
                      >
                        Offer →
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Target's inventory (right side) */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 mb-2">
                {targetAgent.name}
              </h3>
              {targetSkills.length === 0 ? (
                <p className="text-xs text-gray-600">No skills</p>
              ) : (
                <ul className="space-y-1">
                  {targetSkills.map((inv) => (
                    <li
                      key={inv.id}
                      className="p-1.5 bg-gray-800 rounded flex items-center justify-between gap-1"
                    >
                      <button
                        onClick={() =>
                          handleTransfer(
                            inv.skill_id,
                            targetAgent.id,
                            avatarAgent.id,
                            'receive'
                          )
                        }
                        disabled={trading}
                        className="text-[10px] text-teal-400 hover:text-teal-300 shrink-0 disabled:opacity-50"
                        title={`Take from ${targetAgent.name}`}
                      >
                        ← Take
                      </button>
                      <div className="min-w-0 text-right">
                        <p className="text-xs text-gray-300 truncate">
                          {inv.skills?.title}
                        </p>
                        <p className="text-[10px] text-gray-600">{inv.skills?.type}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {message && (
          <p className="text-xs text-center mt-3 text-gray-400">{message}</p>
        )}
      </div>
    </div>
  )
}
