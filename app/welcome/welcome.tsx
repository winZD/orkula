export function Welcome() {
  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-4" style={{ backgroundColor: "var(--color-forest)" }}>
        <span className="text-xl font-bold" style={{ color: "var(--color-cream)" }}>Orkula</span>
        <nav className="flex items-center gap-4">
          <a href="/login" className="hover:opacity-80 transition-opacity" style={{ color: "var(--color-cream)" }}>
            Log in
          </a>
          <a
            href="/signup"
            className="px-5 py-2 font-semibold rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-cream)", color: "var(--color-forest)" }}
          >
            Sign in
          </a>
        </nav>
      </header>

    <main className="flex flex-1 w-full">
      {/* Image Section */}
      <section className="w-1/2 flex items-center justify-center" style={{ backgroundColor: "var(--color-cream)" }}>
        <span className="text-lg opacity-40" style={{ color: "var(--color-forest)" }}>[ image ]</span>
      </section>

      {/* Description Section */}
      <section className="w-1/2 flex flex-col items-start justify-center px-16 gap-6" style={{ backgroundColor: "var(--color-cream)" }}>
        <h1 className="text-5xl font-bold" style={{ color: "var(--color-forest)" }}>Orkula</h1>
        <p className="text-lg leading-relaxed max-w-md" style={{ color: "var(--color-forest)" }}>
          A modern agriculture management platform. Track your fields, monitor crops,
          and manage your farm operations all in one place.
        </p>
        <button
          className="mt-4 px-8 py-3 font-semibold rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--color-forest)", color: "var(--color-cream)" }}
        >
          Get Started
        </button>
      </section>
    </main>
    </div>
  );
}
