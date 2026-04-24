import CampgroundCanvas from './game/CampgroundCanvas'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl text-amber-200 font-semibold mb-4">Campground</h1>
      <CampgroundCanvas />
    </div>
  )
}

export default App
