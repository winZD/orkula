export default {
  // Common
  save: "Save",
  saving: "Saving...",
  cancel: "Cancel",
  total: "Total",
  logout: "Logout",
  navigation: "Navigation",

  // Auth
  login: "Login",
  loginDescription: "Enter your credentials to sign in.",
  email: "Email",
  password: "Password",
  signingIn: "Signing in...",
  signIn: "Sign in",
  noAccount: "Don't have an account?",
  signUp: "Sign up",
  invalidCredentials: "Invalid email or password",
  signup: "Create an account",
  signupDescription: "Fill in the details below to get started.",
  farmName: "Farm / Organization name",
  firstName: "First name",
  lastName: "Last name",
  creatingAccount: "Creating account...",
  createAccount: "Create account",
  alreadyHaveAccount: "Already have an account?",
  accountExists: "An account with this email already exists",
  somethingWentWrong: "Something went wrong. Please try again.",

  // Dashboard
  dashboard: "Dashboard",
  welcome: "Welcome, {{name}}!",
  userFallback: "user",

  // Groves
  groves: "Groves",
  grovesDescription: "Manage your olive groves.",
  newGrove: "New grove",
  newGroveDescription: "Add a new olive grove.",
  saveGrove: "Save grove",
  name: "Name",
  location: "Location",
  areaHa: "Area (ha)",
  trees: "Trees",
  varieties: "Varieties",
  harvestCount: "Harvests",
  createdAt: "Created",
  noGroves: "No groves found.",
  namePlaceholder: "e.g. Northern grove",
  locationPlaceholder: "e.g. Istria",

  // Harvests
  harvests: "Harvests",
  harvestsDescription: "Track harvest records.",
  newHarvest: "New harvest",
  newHarvestDescription: "Record a new harvest.",
  saveHarvest: "Save harvest",
  date: "Date",
  grove: "Grove",
  quantityKg: "Quantity (kg)",
  oilYieldLt: "Oil yield (L)",
  oilYieldPct: "Oil yield (%)",
  method: "Method",
  notes: "Notes",
  recordedBy: "Recorded by",
  noHarvests: "No harvests found.",
  selectGrove: "Select a grove",
  notesPlaceholder: "Optional notes about the harvest",
  groveNotFound: "Grove not found",

  // Harvest methods
  methodHand: "Hand",
  methodRake: "Rake",
  methodMechanicalShaker: "Mechanical shaker",
  methodVibrator: "Vibrator",
  methodNet: "Net",

  // Validation
  validationInvalidEmail: "Invalid email address",
  validationPasswordMin: "Password must be at least 6 characters",
  validationFarmNameRequired: "Farm name is required",
  validationFirstNameRequired: "First name is required",
  validationLastNameRequired: "Last name is required",
  validationNameRequired: "Name is required",
  validationMustBePositive: "Must be a positive number",
  validationGroveRequired: "Grove is required",
  validationDateRequired: "Date is required",
  validationInvalidLanguage: "Invalid language",

  // Settings
  settings: "Settings",
  settingsDescription: "Manage your dashboard settings.",
  language: "Language",
  languageDescription: "Choose the language for the dashboard display.",

  // Home
  homeLogin: "Log in",
  homeSignup: "Sign up",
  homeHeadline: "Orkula",
  homeDescription:
    "A modern agriculture management platform. Track your fields, monitor crops, and manage your farm operations all in one place.",
  homeCta: "Get Started",

  // Errors
  errorOops: "Oops!",
  errorUnexpected: "An unexpected error occurred.",
  errorNotFound: "The requested page could not be found.",
  error404: "404",
  errorGeneric: "Error",
} as const;
