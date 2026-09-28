function App() {
  const colors = [
    { name: 'paper', value: '#FAF7F2' },
    { name: 'ink', value: '#1A1A18' },
    { name: 'ink-soft', value: '#5C5A55' },
    { name: 'line', value: '#E5DFD5' },
    { name: 'surface', value: '#FFFFFF' },
    { name: 'iron', value: '#B7410E' },
    { name: 'calcium', value: '#2F6B5E' },
    { name: 'vitd', value: '#C98A12' },
    { name: 'b12', value: '#6B4FA0' },
    { name: 'risk-high', value: '#B7410E' },
    { name: 'risk-med', value: '#C98A12' },
    { name: 'risk-low', value: '#2F6B5E' },
  ] as const

  return (
    <main className="min-h-screen w-full max-w-dashboard mx-auto p-6">
      <h1 className="font-display text-3xl font-semibold text-ink mb-6">
        AURA-Nutri Design Tokens
      </h1>

      <section className="mb-8">
        <h2 className="font-display text-xl font-medium text-ink mb-4">
          Colors
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {colors.map(({ name, value }) => (
            <div
              key={name}
              className="border border-line rounded-card p-4 bg-surface"
            >
              <div
                className="h-16 w-full rounded-data mb-3 border border-line"
                style={{ backgroundColor: value }}
              />
              <p className="text-sm font-medium text-ink">{name}</p>
              <p className="text-sm text-ink-soft">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl font-medium text-ink mb-4">
          Typography
        </h2>
        <div className="space-y-4">
          <div className="border border-line rounded-card p-4 bg-surface">
            <p className="text-sm text-ink-soft mb-1">Display / Fraunces 600</p>
            <p className="font-display text-2xl font-semibold text-ink">
              Iron intake today
            </p>
          </div>
          <div className="border border-line rounded-card p-4 bg-surface">
            <p className="text-sm text-ink-soft mb-1">Body / Source Sans 3 400</p>
            <p className="font-sans text-base text-ink">
              AURA-Nutri provides food intelligence, not medical advice.
            </p>
          </div>
          <div className="border border-line rounded-card p-4 bg-surface">
            <p className="text-sm text-ink-soft mb-1">Hindi / Tiro Devanagari Hindi</p>
            <p className="font-hindi text-base text-ink">
              आज आपने क्या खाया?
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-medium text-ink mb-4">
          Focus ring
        </h2>
        <button
          type="button"
          className="px-4 py-2 bg-iron text-paper rounded-data font-sans font-medium"
        >
          Focus me
        </button>
      </section>
    </main>
  )
}

export default App
