export function Welcome() {
  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-forest">
        <span className="text-xl font-bold text-cream">Orkula</span>
        <nav className="flex items-center gap-3 md:gap-4">
          <a
            href="/login"
            className="text-cream hover:opacity-80 transition-opacity text-sm md:text-base"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="px-4 md:px-5 py-2 text-sm md:text-base font-semibold rounded-lg transition-opacity hover:opacity-80 bg-cream text-forest"
          >
            Sign in
          </a>
        </nav>
      </header>

      <main className="flex flex-col md:flex-row flex-1 w-full">
        {/* Image Section */}
        <section className="w-full md:w-1/2 h-64 md:h-auto">
          <div className="h-full w-full">
            <img
              src="/olives.png"
              alt="Olives"
              className="w-full h-full object-cover"
            />
          </div>
        </section>

        {/* Description Section */}
        <section className="w-full md:w-1/2 flex flex-col items-start px-8 md:px-16 py-12 md:py-0 gap-6">
          <h1 className="text-4xl md:text-5xl mt-7 font-bold text-forest">
            Orkula
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-md text-forest">
            A modern agriculture management platform. Track your fields, monitor
            crops, and manage your farm operations all in one place.
          </p>
          <button className="mt-2 md:mt-4 px-8 py-3 font-semibold rounded-lg transition-opacity hover:opacity-80 bg-forest text-cream">
            Get Started
          </button>
        </section>
      </main>
    </div>
  );
}
