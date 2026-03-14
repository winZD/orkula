import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function Welcome() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-4 bg-forest">
        <span className="text-xl font-bold text-cream">Orkula</span>
        <nav className="flex items-center gap-3 md:gap-4">
          <Link
            to="/login"
            className="text-cream hover:opacity-80 transition-opacity text-sm md:text-base"
          >
            {t("homeLogin")}
          </Link>
          <Link
            to="/signup"
            className="px-4 md:px-5 py-2 text-sm md:text-base font-semibold rounded-lg transition-opacity hover:opacity-80 bg-cream text-forest"
          >
            {t("homeSignup")}
          </Link>
        </nav>
      </header>

      <main className="flex flex-col md:flex-row flex-1 w-full">
        {/* Image Section */}
        <section className="relative w-full md:w-1/2 h-64 md:h-full">
          <img
            src="/olives.png"
            alt="Olives"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </section>

        {/* Description Section */}
        <section className="w-full md:w-1/2 flex flex-col justify-center items-start px-8 md:px-16 py-12 md:py-0 gap-6">
          <h1 className="text-4xl md:text-5x mt-7 font-bold text-forest">
            {t("homeHeadline")}
          </h1>
          <p className="text-base md:text-lg leading-relaxed max-w-md text-forest">
            {t("homeDescription")}
          </p>
          <button className="mt-2 md:mt-4 px-8 py-3 font-semibold rounded-lg transition-opacity hover:opacity-80 bg-forest text-cream">
            {t("homeCta")}
          </button>
        </section>
      </main>
    </div>
  );
}
