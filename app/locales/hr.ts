export default {
  // Common
  save: "Spremi",
  saving: "Spremanje...",
  cancel: "Odustani",
  total: "Ukupno",
  logout: "Odjava",
  navigation: "Navigacija",

  // Auth
  login: "Prijava",
  loginDescription: "Unesite svoje podatke za prijavu.",
  email: "Email",
  password: "Lozinka",
  signingIn: "Prijavljivanje...",
  signIn: "Prijavi se",
  noAccount: "Nemate račun?",
  signUp: "Registriraj se",
  invalidCredentials: "Neispravna email adresa ili lozinka",
  signup: "Izradite račun",
  signupDescription: "Ispunite podatke ispod za početak.",
  farmName: "Naziv farme / organizacije",
  firstName: "Ime",
  lastName: "Prezime",
  creatingAccount: "Izrada računa...",
  createAccount: "Izradi račun",
  alreadyHaveAccount: "Već imate račun?",
  accountExists: "Račun s ovom email adresom već postoji",
  somethingWentWrong: "Došlo je do greške. Pokušajte ponovno.",

  // Dashboard
  dashboard: "Nadzorna ploča",
  welcome: "Dobrodošli, {{name}}!",
  userFallback: "korisniče",

  // Groves
  groves: "Maslinici",
  grovesDescription: "Upravljajte svojim maslinicima.",
  newGrove: "Novi maslinik",
  newGroveDescription: "Dodajte novi maslinik.",
  saveGrove: "Spremi maslinik",
  name: "Naziv",
  location: "Lokacija",
  areaHa: "Površina (ha)",
  trees: "Stabla",
  varieties: "Sorte",
  harvestCount: "Berbe",
  createdAt: "Kreirano",
  noGroves: "Nema maslinika.",
  namePlaceholder: "npr. Sjeverni maslinik",
  locationPlaceholder: "npr. Istra",

  // Harvests
  harvests: "Berbe",
  harvestsDescription: "Pratite evidenciju berbi.",
  newHarvest: "Nova berba",
  newHarvestDescription: "Zabilježite novu berbu.",
  saveHarvest: "Spremi berbu",
  date: "Datum",
  grove: "Maslinik",
  quantityKg: "Količina (kg)",
  oilYieldLt: "Prinos ulja (L)",
  oilYieldPct: "Prinos ulja (%)",
  method: "Metoda",
  notes: "Bilješke",
  recordedBy: "Zabilježio/la",
  noHarvests: "Nema berbi.",
  selectGrove: "Odaberite maslinik",
  notesPlaceholder: "Neobavezne bilješke o berbi",
  groveNotFound: "Maslinik nije pronađen",

  // Harvest methods
  methodHand: "Ručno",
  methodRake: "Grablje",
  methodMechanicalShaker: "Mehanički tresač",
  methodVibrator: "Vibrator",
  methodNet: "Mreža",

  // Validation
  validationInvalidEmail: "Neispravna email adresa",
  validationPasswordMin: "Lozinka mora imati najmanje 6 znakova",
  validationFarmNameRequired: "Naziv farme je obavezan",
  validationFirstNameRequired: "Ime je obavezno",
  validationLastNameRequired: "Prezime je obavezno",
  validationNameRequired: "Naziv je obavezan",
  validationMustBePositive: "Mora biti pozitivan broj",
  validationGroveRequired: "Maslinik je obavezan",
  validationDateRequired: "Datum je obavezan",
  validationInvalidLanguage: "Nevažeći jezik",

  // Settings
  settings: "Postavke",
  settingsDescription: "Upravljajte postavkama nadzorne ploče.",
  language: "Jezik",
  languageDescription: "Odaberite jezik za prikaz nadzorne ploče.",

  // Home
  homeLogin: "Prijava",
  homeSignup: "Registracija",
  homeHeadline: "Orkula",
  homeDescription:
    "Moderna platforma za upravljanje poljoprivredom. Pratite svoja polja, nadzirite usjeve i upravljajte svim operacijama na jednom mjestu.",
  homeCta: "Započnite",

  // Errors
  errorOops: "Ups!",
  errorUnexpected: "Došlo je do neočekivane greške.",
  errorNotFound: "Tražena stranica nije pronađena.",
  error404: "404",
  errorGeneric: "Greška",
} as const;
