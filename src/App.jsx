import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import CampgroundCanvas from './game/CampgroundCanvas'

function App() {
  // session is null when logged out, and contains user info when logged in.
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if there is already a logged-in session (e.g. from a
    // previous visit, stored in the browser's local storage).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for login/logout events so the UI updates immediately.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    // Clean up the listener when the component unmounts.
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  // Not logged in: show the login/signup form.
  if (!session) {
    return <Auth />
  }

  // Logged in: show the campground.
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <h1 className="text-lg text-amber-200 font-semibold">Campground</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-400 hover:text-gray-200"
        >
          Log out
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <CampgroundCanvas />
      </main>
    </div>
  )
}

export default App
