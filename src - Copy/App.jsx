import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./App.css"

// ── Dark Mode ──────────────────────────────────────────────
// Reads saved preference from localStorage, defaults to light
function getSavedTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) || "light"
}

// Applies the theme by setting a data-theme attribute on <html>
// CSS then reads this to switch color variables
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

// How long to wait before giving up on a request (12 seconds)
const REQUEST_TIMEOUT = 12000
const API_URL = import.meta.env.VITE_API_BASE_URL?.trim() || (import.meta.env.DEV ? "http://127.0.0.1:8000" : "/api")
const PROFILE_STORAGE_PREFIX = "casemind_profile:"
const LANG_STORAGE_KEY = "casemind_language"
const THEME_STORAGE_KEY = "casemind_theme"

const STRINGS = {
  en: {
    appName: "CaseMind AI",
    authTag: "Pakistani Legal Assistance",
    authBody: "A professional legal support platform for general users, registered lawyers, and administrators across Pakistan.",
    loginTitle: "Welcome Back",
    loginSubtitle: "Sign in to your CaseMind account.",
    chooseRoleTitle: "Create Account",
    chooseRoleSubtitle: "Select the type of account you want to create.",
    userSignupTitle: "Create User Account",
    userSignupSubtitle: "All fields are validated before submission.",
    lawyerSignupTitle: "Lawyer Registration",
    lawyerSignupSubtitle: "Admin will verify your DBA number before your profile goes live.",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    signIn: "Sign In",
    createAccount: "Create a new account",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    urdu: "Urdu",
    english: "English",
    profile: "Profile",
    yourProfile: "Your Profile",
    personalDetails: "Personal details",
    clearHistory: "Clear history",
    chatTitle: "Ask a Pakistani law question",
    chatPlaceholder: "Ask a legal question...",
    chatSub: "Responses are for guidance only. Consult a licensed lawyer for formal advice.",
    send: "Send",
    searchPlaceholder: "Search by name or specialization...",
    findLawyer: "Find an Approved Lawyer",
    verifiedDirectory: "Verified Directory",
    selectLanguage: "Language",
  },
  ur: {
    appName: "کیس مائنڈ اے آئی",
    authTag: "پاکستانی قانونی معاونت",
    authBody: "عام صارفین، رجسٹرڈ وکلاء، اور منتظمین کے لیے ایک پیشہ ور قانونی معاونت پلیٹ فارم۔",
    loginTitle: "خوش آمدید",
    loginSubtitle: "اپنے کیس مائنڈ اکاؤنٹ میں سائن ان کریں۔",
    chooseRoleTitle: "اکاؤنٹ بنائیں",
    chooseRoleSubtitle: "اکاؤنٹ کی قسم منتخب کریں۔",
    userSignupTitle: "صارف اکاؤنٹ بنائیں",
    userSignupSubtitle: "تمام معلومات جمع کرنے سے پہلے جانچی جاتی ہیں۔",
    lawyerSignupTitle: "وکیل رجسٹریشن",
    lawyerSignupSubtitle: "ڈیسک نمبر کی تصدیق کے بعد آپ کا پروفائل فعال ہوگا۔",
    emailLabel: "ای میل پتہ",
    passwordLabel: "پاس ورڈ",
    signIn: "سائن ان",
    createAccount: "نیا اکاؤنٹ بنائیں",
    darkMode: "ڈارک موڈ",
    lightMode: "لائٹ موڈ",
    urdu: "اردو",
    english: "English",
    profile: "پروفائل",
    yourProfile: "آپ کی پروفائل",
    personalDetails: "ذاتی معلومات",
    clearHistory: "ہسٹری صاف کریں",
    chatTitle: "پاکستانی قانون سے متعلق سوال پوچھیں",
    chatPlaceholder: "قانونی سوال لکھیں...",
    chatSub: "جوابات رہنمائی کے لیے ہیں۔ باقاعدہ مشورے کے لیے لائسنس یافتہ وکیل سے رجوع کریں۔",
    send: "بھیجیں",
    searchPlaceholder: "نام یا تخصص سے تلاش کریں...",
    findLawyer: "منظور شدہ وکیل تلاش کریں",
    verifiedDirectory: "تصدیق شدہ ڈائریکٹری",
    selectLanguage: "زبان",
  },
}

function getSavedLanguage() {
  return localStorage.getItem(LANG_STORAGE_KEY) || "en"
}

const EXTRA_STRINGS = {
  en: {
    welcomeBot: "Assalamu Alaikum. I am CaseMind AI, your Pakistani legal assistant. Ask me anything about Pakistani law and I will guide you in simple language.",
    thinking: "Thinking...",
    chooseRoleUser: "General User",
    chooseRoleUserDesc: "Ask legal questions and search for approved lawyers.",
    chooseRoleLawyer: "Lawyer",
    chooseRoleLawyerDesc: "Register your profile for admin review and get listed.",
    backToLogin: "Back to login",
    verifiedByAdmin: "Only admin-verified lawyers are listed here.",
    searchLawyer: "Search by name or specialization...",
    noLawyersFound: "No lawyers found.",
    approvedLawyers: "Approved Lawyers",
    pendingRequests: "Pending Requests",
    noPending: "No pending requests at the moment.",
    noApproved: "No approved lawyers yet.",
    pendingHeader: "Pending Verification Requests",
    pendingHelp: "Manually verify the DBA number with the district bar association before approving.",
    approvedHeader: "Approved Lawyers",
    approvedHelp: "These lawyers are publicly visible in the lawyer directory.",
    approve: "Approve",
    reject: "Reject",
    remove: "Remove",
    adminDashboard: "Admin Dashboard",
    verifyLawyers: "Verify lawyers, manage registrations, and maintain the public directory.",
    totalLawyers: "Total Lawyers",
    generalUsers: "General Users",
    pendingReviews: "Pending Reviews",
    approvedListings: "Approved Lawyers",
    profile: "Profile",
    yourProfile: "Your Profile",
    personalDetails: "Personal details",
    close: "Close",
    nameLabel: "Name",
    emailLabelShort: "Email",
    phoneLabel: "Phone",
    cityLabel: "City",
    roleLabel: "Role",
    dbaLabel: "DBA Number",
    specializationLabel: "Specialization",
    verificationLabel: "Verification",
    chatbot: "AI Chatbot",
    lawyersTab: "Lawyers",
    findLawyersTab: "Find Lawyers",
    dashboardTab: "Dashboard",
    logout: "Logout",
  },
  ur: {
    welcomeBot: "السلام علیکم۔ میں کیس مائنڈ اے آئی ہوں، آپ کا پاکستانی قانونی معاون۔ آپ مجھ سے پاکستانی قانون پر کوئی بھی سوال کریں، میں آسان زبان میں رہنمائی کروں گا۔",
    thinking: "سوچ رہا ہوں...",
    chooseRoleUser: "عام صارف",
    chooseRoleUserDesc: "قانونی سوال پوچھیں اور منظور شدہ وکلاء تلاش کریں۔",
    chooseRoleLawyer: "وکیل",
    chooseRoleLawyerDesc: "اپنا پروفائل انتظامیہ کی تصدیق کے لیے درج کریں۔",
    backToLogin: "لاگ اِن پر واپس",
    verifiedByAdmin: "صرف انتظامیہ سے منظور شدہ وکلاء یہاں دکھائے جاتے ہیں۔",
    searchLawyer: "نام یا تخصص سے تلاش کریں...",
    noLawyersFound: "کوئی وکیل نہیں ملا۔",
    approvedLawyers: "منظور شدہ وکلاء",
    pendingRequests: "منتظر درخواستیں",
    noPending: "اس وقت کوئی منتظر درخواست موجود نہیں۔",
    noApproved: "ابھی تک کوئی منظور شدہ وکیل موجود نہیں۔",
    pendingHeader: "تصدیق کے منتظر درخواستیں",
    pendingHelp: "منظور کرنے سے پہلے DBA نمبر کی تصدیق کریں۔",
    approvedHeader: "منظور شدہ وکلاء",
    approvedHelp: "یہ وکلاء عوامی ڈائریکٹری میں دکھائی دیتے ہیں۔",
    approve: "منظور کریں",
    reject: "رد کریں",
    remove: "حذف کریں",
    adminDashboard: "ایڈمن پینل",
    verifyLawyers: "وکلاء کی تصدیق کریں، رجسٹریشن منظم کریں، اور عوامی ڈائریکٹری برقرار رکھیں۔",
    totalLawyers: "کل وکلاء",
    generalUsers: "عام صارفین",
    pendingReviews: "تصدیق منتظر",
    approvedListings: "منظور شدہ وکلاء",
    profile: "پروفائل",
    yourProfile: "آپ کی پروفائل",
    personalDetails: "ذاتی معلومات",
    close: "بند کریں",
    nameLabel: "نام",
    emailLabelShort: "ای میل",
    phoneLabel: "فون",
    cityLabel: "شہر",
    roleLabel: "کردار",
    dbaLabel: "ڈی بی اے نمبر",
    specializationLabel: "تخصص",
    verificationLabel: "تصدیق",
    chatbot: "اے آئی چیٹ بوٹ",
    lawyersTab: "وکلاء",
    findLawyersTab: "وکیل تلاش کریں",
    dashboardTab: "ڈیش بورڈ",
    logout: "لاگ آؤٹ",
  },
}

// Empty form templates
const emptyUserForm = {
  full_name: "",
  email: "",
  phone: "",
  city: "",
  password: "",
  confirm: "",
}

const emptyLawyerForm = {
  lawyer_name: "",
  email: "",
  phone: "",
  city: "",
  dba_number: "",
  specialization: "",
  password: "",
  confirm: "",
}

function getProfileKey(email) {
  return `${PROFILE_STORAGE_PREFIX}${(email || "").trim().toLowerCase()}`
}

function getT(lang) {
  const base = { ...(STRINGS.en || {}), ...(EXTRA_STRINGS.en || {}), ...(STRINGS[lang] || {}), ...(EXTRA_STRINGS[lang] || {}) }
  if (lang === "ur") {
    base.emailPlaceholder = "aap@misal.com"
    base.passwordPlaceholder = "اپنا پاس ورڈ درج کریں"
  } else {
    base.emailPlaceholder = "you@example.com"
    base.passwordPlaceholder = "Enter your password"
  }
  return base
}

function saveProfile(profile) {
  if (!profile?.email) return
  try {
    localStorage.setItem(getProfileKey(profile.email), JSON.stringify(profile))
  } catch {
    // Ignore storage failures.
  }
}

function loadProfile(email) {
  if (!email) return null
  try {
    const saved = localStorage.getItem(getProfileKey(email))
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function mergeProfile(base, extra = {}) {
  return {
    ...base,
    ...extra,
    email: (extra.email || base.email || "").trim().toLowerCase(),
  }
}

// ─── API HELPER ───────────────────────────────────────────────
// This function sends requests to the backend
async function apiRequest(path, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const url = `${API_URL}${path}`
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return await res.json()
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out while reaching ${API_URL}.`)
    }
    throw new Error(`Cannot reach the backend server at ${API_URL}.`)
  } finally {
    clearTimeout(timer)
  }
}

// ─── VALIDATION HELPERS ───────────────────────────────────────
function isValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

function isValidPhone(val) {
  return /^(\+92|0)?3\d{9}$/.test(val.replace(/[\s-]/g, ""))
}

function isValidName(val) {
  return /^[A-Za-z .'-]{3,}$/.test(val.trim())
}

function isValidCity(val) {
  return /^[A-Za-z ]{2,}$/.test(val.trim())
}

function isValidDba(val) {
  return /^[A-Za-z0-9/-]{3,20}$/.test(val.trim())
}

// ─── BOT RESPONSE CLEANER ─────────────────────────────────────
// Groq returns markdown symbols like ** and * — this removes them
function cleanResponse(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // remove **bold**
    .replace(/\*(.+?)\*/g, "$1")        // remove *italic*
    .replace(/^#{1,3}\s+/gm, "")        // remove ### headings
    .replace(/^\s*[-*]\s+/gm, "• ")     // turn - bullets into •
    .trim()
}

function formatReply(text) {
  const lines = (text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean)
  return lines.map((line) => {
    if (/^[•-]\s/.test(line)) return line
    if (/^\d+[\).\s]/.test(line)) return line
    return line
  }).join("\n\n")
}

// ─── REUSABLE COMPONENTS ──────────────────────────────────────

// A single form field with label and error message
function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

// A text input wrapped inside a Field
function TextInput({ label, error, ...props }) {
  return (
    <Field label={label} error={error}>
      <input {...props} />
    </Field>
  )
}

// The left panel shown on auth pages (login, signup)
function BrandPanel({ t }) {
  return (
    <section className="brand-panel">
      <img className="brand-mark" src="/paklaw-logo-embedded.png" alt="PakLaw AI logo" />
      <p className="eyebrow">{t.authTag}</p>
      <h1>{t.appName}</h1>
      <p>{t.authBody}</p>
    </section>
  )
}

// Wrapper layout for all auth screens
function AuthShell({ title, subtitle, children, t }) {
  return (
    <main className="auth-shell">
      <BrandPanel t={t} />
      <section className="auth-card">
        <h2>{title}</h2>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </section>
    </main>
  )
}

// ─── LOGIN PAGE ───────────────────────────────────────────────
function LoginPage({ onLogin, onCreateAccount, onForgotPassword, t }) {
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function updateField(field) {
    return function (e) {
      setForm({ ...form, [field]: e.target.value })
    }
  }

  async function handleLogin(e) {
    e.preventDefault()

    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (!form.password) {
      setError("Please enter your password.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const data = await apiRequest("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (data.success) {
        const profile = loadProfile(form.email) || { email: form.email, name: data.name, role: data.role }
        onLogin(mergeProfile(profile, data))
      } else {
        setError(data.message || "Invalid email or password.")
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t.loginTitle} subtitle={t.loginSubtitle} t={t}>
      <form onSubmit={handleLogin} className="form-stack">
        <TextInput
          label={t.emailLabel}
          type="email"
          value={form.email}
          onChange={updateField("email")}
          placeholder="you@example.com"
        />
        <TextInput
          label={t.passwordLabel}
          type="password"
          value={form.password}
          onChange={updateField("password")}
          placeholder="Enter your password"
        />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? `${t.signIn}...` : t.signIn}
        </button>
      </form>
      <div className="auth-footer">
        <button className="link-btn" onClick={onCreateAccount}>
          {t.createAccount}
        </button>
        <button className="link-btn forgot-link" type="button" onClick={() => onForgotPassword(form.email)}>
          Forgot password?
        </button>
        <span>Admin: admin@casemind.ai / admin123</span>
      </div>
    </AuthShell>
  )
}

function ForgotPasswordModal({ open, initialEmail = "", onClose, onReset, t }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ email: initialEmail, password: "", confirm: "" })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(1)
      setForm({ email: initialEmail || "", password: "", confirm: "" })
      setMessage("")
    }
  }, [open, initialEmail])

  if (!open) return null

  function updateField(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage("")

    if (step === 1) {
      if (!isValidEmail(form.email)) return setMessage("Enter a valid email address.")
      setStep(2)
      return
    }

    if ((form.password || "").length < 6) return setMessage("Password must be at least 6 characters.")
    if (form.password !== form.confirm) return setMessage("Passwords do not match.")

    setLoading(true)
    try {
      const data = await apiRequest("/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      if (data.success) {
        onReset?.(form.email, form.password)
        setMessage("Password updated successfully. You can sign in now.")
        setTimeout(onClose, 1000)
      } else {
        setMessage(data.message || "Unable to reset password.")
      }
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="modal-card">
        <div className="modal-head">
          <h2>Forgot password</h2>
          <button type="button" className="link-btn" onClick={onClose}>{t.close}</button>
        </div>
        <form className="form-stack" onSubmit={handleSubmit}>
          {step === 1 ? (
            <TextInput label={t.emailLabel} type="email" value={form.email} onChange={updateField("email")} placeholder="you@example.com" />
          ) : (
            <>
              <p className="auth-subtitle">Set a new password for {form.email}</p>
              <TextInput label={t.passwordLabel} type="password" value={form.password} onChange={updateField("password")} />
              <TextInput label={`Confirm ${t.passwordLabel}`} type="password" value={form.confirm} onChange={updateField("confirm")} />
            </>
          )}
          {message && <p className="form-error">{message}</p>}
          <button className="primary-btn" disabled={loading}>
            {loading ? "Updating..." : step === 1 ? "Continue" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  )
}

// ─── CHOOSE ROLE PAGE ─────────────────────────────────────────
function ChooseRolePage({ onChoose, onBack, t }) {
  return (
    <AuthShell
      title={t.chooseRoleTitle}
      subtitle={t.chooseRoleSubtitle}
      t={t}
    >
      <div className="role-grid">
        <button className="role-card" onClick={() => onChoose("user")}>
          <strong>{t.chooseRoleUser}</strong>
          <span>{t.chooseRoleUserDesc}</span>
        </button>
        <button className="role-card" onClick={() => onChoose("lawyer")}>
          <strong>{t.chooseRoleLawyer}</strong>
          <span>{t.chooseRoleLawyerDesc}</span>
        </button>
      </div>
      <button className="link-btn" onClick={onBack}>
        {t.backToLogin}
      </button>
    </AuthShell>
  )
}

// ─── USER SIGNUP PAGE ─────────────────────────────────────────
function getUserErrors(form) {
  const errors = {}
  if (!isValidName(form.full_name)) errors.full_name = "Name must be at least 3 letters."
  if (!isValidEmail(form.email)) errors.email = "Enter a valid email address."
  if (!isValidPhone(form.phone)) errors.phone = "Enter a valid Pakistani mobile number (e.g. 03001234567)."
  if (!isValidCity(form.city)) errors.city = "City name must contain letters only."
  if ((form.password || "").length < 6) errors.password = "Password must be at least 6 characters."
  if (form.password !== form.confirm) errors.confirm = "Passwords do not match."
  return errors
}

function UserSignupPage({ onSuccess, onBack, t }) {
  const [form, setForm] = useState(emptyUserForm)
  const [errors, setErrors] = useState({})
  const [serverMessage, setServerMessage] = useState("")
  const [loading, setLoading] = useState(false)

  function updateField(field) {
    return function (e) {
      setForm({ ...form, [field]: e.target.value })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const fieldErrors = getUserErrors(form)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setLoading(true)
    setServerMessage("")

      try {
        const data = await apiRequest("/signup/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })

        if (data.success) {
          const profile = {
            name: form.full_name,
            email: form.email,
            phone: form.phone,
            city: form.city,
            role: "user",
          }
          saveProfile(profile)
          onSuccess(profile)
        } else {
          setServerMessage(data.message)
        }
    } catch (err) {
      setServerMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={t.userSignupTitle}
      subtitle={t.userSignupSubtitle}
      t={t}
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <TextInput label={t.nameLabel} value={form.full_name} onChange={updateField("full_name")} error={errors.full_name} maxLength={60} pattern="[A-Za-z .'-]{3,}" />
        <TextInput label={t.emailLabel} type="email" value={form.email} onChange={updateField("email")} error={errors.email} autoComplete="email" />
        <TextInput label={t.phoneLabel} value={form.phone} onChange={updateField("phone")} error={errors.phone} placeholder="03001234567" inputMode="tel" maxLength={13} />
        <TextInput label={t.cityLabel} value={form.city} onChange={updateField("city")} error={errors.city} maxLength={40} />
        <TextInput label={t.passwordLabel} type="password" value={form.password} onChange={updateField("password")} error={errors.password} minLength={6} autoComplete="new-password" />
        <TextInput label={`Confirm ${t.passwordLabel}`} type="password" value={form.confirm} onChange={updateField("confirm")} error={errors.confirm} minLength={6} autoComplete="new-password" />
        {serverMessage && <p className="form-error">{serverMessage}</p>}
        <button className="primary-btn" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
      <button className="link-btn" onClick={onBack}>Back</button>
    </AuthShell>
  )
}

// ─── LAWYER SIGNUP PAGE ───────────────────────────────────────
function getLawyerErrors(form) {
  const errors = {}
  if (!isValidName(form.lawyer_name)) errors.lawyer_name = "Name must be at least 3 letters."
  if (!isValidEmail(form.email)) errors.email = "Enter a valid email address."
  if (!isValidPhone(form.phone)) errors.phone = "Enter a valid Pakistani mobile number."
  if (!isValidCity(form.city)) errors.city = "City name must contain letters only."
  if (!isValidDba(form.dba_number)) errors.dba_number = "DBA number must be 3–20 characters (letters, numbers, /, -)."
  if ((form.specialization || "").trim().length < 3) errors.specialization = "Enter your area of specialization."
  if ((form.password || "").length < 6) errors.password = "Password must be at least 6 characters."
  if (form.password !== form.confirm) errors.confirm = "Passwords do not match."
  return errors
}

function LawyerSignupPage({ onSuccess, onBack, t }) {
  const [form, setForm] = useState(emptyLawyerForm)
  const [errors, setErrors] = useState({})
  const [serverMessage, setServerMessage] = useState("")
  const [loading, setLoading] = useState(false)

  function updateField(field) {
    return function (e) {
      setForm({ ...form, [field]: e.target.value })
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    const fieldErrors = getLawyerErrors(form)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setLoading(true)
    setServerMessage("")

      try {
        const data = await apiRequest("/signup/lawyer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })

        if (data.success) {
          const profile = {
            name: form.lawyer_name,
            email: form.email,
            phone: form.phone,
            city: form.city,
            dba_number: form.dba_number,
            specialization: form.specialization,
            role: "lawyer",
            verification_status: "pending",
          }
          saveProfile(profile)
          onSuccess(profile)
        } else {
          setServerMessage(data.message)
        }
    } catch (err) {
      setServerMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title={t.lawyerSignupTitle}
      subtitle={t.lawyerSignupSubtitle}
      t={t}
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <TextInput label={t.nameLabel} value={form.lawyer_name} onChange={updateField("lawyer_name")} error={errors.lawyer_name} maxLength={60} pattern="[A-Za-z .'-]{3,}" />
        <TextInput label={t.emailLabel} type="email" value={form.email} onChange={updateField("email")} error={errors.email} autoComplete="email" />
        <TextInput label={t.phoneLabel} value={form.phone} onChange={updateField("phone")} error={errors.phone} placeholder="03001234567" inputMode="tel" maxLength={13} />
        <TextInput label={t.cityLabel} value={form.city} onChange={updateField("city")} error={errors.city} maxLength={40} />
        <TextInput label={t.dbaLabel} value={form.dba_number} onChange={updateField("dba_number")} error={errors.dba_number} placeholder="424 or 123-G/2018" maxLength={20} />
        <TextInput label={t.specializationLabel} value={form.specialization} onChange={updateField("specialization")} error={errors.specialization} placeholder="e.g. Family Law, Criminal Law" maxLength={50} />
        <TextInput label={t.passwordLabel} type="password" value={form.password} onChange={updateField("password")} error={errors.password} minLength={6} autoComplete="new-password" />
        <TextInput label={`Confirm ${t.passwordLabel}`} type="password" value={form.confirm} onChange={updateField("confirm")} error={errors.confirm} minLength={6} autoComplete="new-password" />
        {serverMessage && <p className="form-error">{serverMessage}</p>}
        <button className="primary-btn" disabled={loading}>
          {loading ? "Submitting..." : "Register as Lawyer"}
        </button>
      </form>
      <button className="link-btn" onClick={onBack}>Back</button>
    </AuthShell>
  )
}

// ─── NAVBAR ───────────────────────────────────────────────────
function Navbar({ currentPage, onNavigate, user, onLogout, theme, onToggleTheme, showProfile, onToggleProfile, onSaveProfile, t, onToggleLanguage, lang }) {
  const adminTabs = [["admin", t.dashboardTab], ["chat", t.chatbot], ["lawyers", t.lawyersTab]]
  const userTabs = [["chat", t.chatbot], ["lawyers", t.findLawyersTab]]
  const tabs = user?.role === "admin" ? adminTabs : userTabs

  return (
    <nav className="navbar">
      <button
        className="nav-brand"
        aria-label={t.appName}
        onClick={() => onNavigate(user?.role === "admin" ? "admin" : "chat")}
      >
        <img className="nav-logo" src="/paklaw-logo-embedded.png" alt="" aria-hidden="true" />
      </button>

      <div className="nav-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={currentPage === id ? "nav-tab active" : "nav-tab"}
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="nav-user">
        <button type="button" className="theme-btn" onClick={onToggleLanguage}>
          {lang === "en" ? t.urdu : t.english}
        </button>
        <button type="button" className="theme-btn" onClick={onToggleTheme}>
          {theme === "dark" ? t.lightMode : t.darkMode}
        </button>
        <button type="button" className="nav-username nav-profile-trigger" onClick={onToggleProfile}>
          {user?.name}
        </button>
        <button className="logout-btn" onClick={onLogout}>{t.logout || "Logout"}</button>
      </div>
      {showProfile && user && (
        <div className="profile-popover">
          <ProfileCard user={user} t={t} onSaveProfile={onSaveProfile} />
          <button type="button" className="link-btn popover-close" onClick={onToggleProfile}>
            {t.close}
          </button>
        </div>
      )}
    </nav>
  )
}

function ProfileCard({ user, t, onSaveProfile }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => ({
    name: user?.name || "",
    phone: user?.phone || "",
    city: user?.city || "",
    dba_number: user?.dba_number || "",
    specialization: user?.specialization || "",
  }))
  const [message, setMessage] = useState("")

  useEffect(() => {
    setForm({
      name: user?.name || "",
      phone: user?.phone || "",
      city: user?.city || "",
      dba_number: user?.dba_number || "",
      specialization: user?.specialization || "",
    })
  }, [user])

  function updateField(field) {
    return (e) => setForm((current) => ({ ...current, [field]: e.target.value }))
  }

  function handleSave() {
    const updated = {
      ...user,
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      dba_number: form.dba_number.trim(),
      specialization: form.specialization.trim(),
    }
    onSaveProfile?.(updated)
    setMessage("Profile updated.")
    setEditing(false)
  }

  const rows = [
    [t.nameLabel, user?.name || "-"],
    [t.emailLabelShort, user?.email || "-"],
    [t.phoneLabel, user?.phone || "-"],
    [t.cityLabel, user?.city || "-"],
    [t.roleLabel, user?.role || "-"],
  ]

  if (user?.role === "lawyer") {
    rows.push([t.dbaLabel, user?.dba_number || "-"])
    rows.push([t.specializationLabel, user?.specialization || "-"])
    rows.push([t.verificationLabel, user?.verification_status || "-"])
  }

  return (
    <section className="profile-panel">
      <div className="profile-panel__header">
        <div>
          <p className="eyebrow">{t.yourProfile}</p>
          <h2>{t.personalDetails}</h2>
        </div>
        <div className={`status-badge ${user?.role || "guest"}`}>
          {user?.role || "guest"}
        </div>
      </div>
      <div className="profile-edit-toggle">
        <button type="button" className="secondary-btn" onClick={() => setEditing((current) => !current)}>
          {editing ? "Cancel edit" : "Edit profile"}
        </button>
      </div>
      {editing && (
        <div className="profile-edit-form">
          <TextInput label={t.nameLabel} value={form.name} onChange={updateField("name")} />
          <TextInput label={t.phoneLabel} value={form.phone} onChange={updateField("phone")} />
          <TextInput label={t.cityLabel} value={form.city} onChange={updateField("city")} />
          {user?.role === "lawyer" && (
            <>
              <TextInput label={t.dbaLabel} value={form.dba_number} onChange={updateField("dba_number")} />
              <TextInput label={t.specializationLabel} value={form.specialization} onChange={updateField("specialization")} />
            </>
          )}
          {message && <p className="form-error">{message}</p>}
          <button type="button" className="primary-btn" onClick={handleSave}>Save changes</button>
        </div>
      )}
      <div className="profile-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="profile-item">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── CHAT PAGE ────────────────────────────────────────────────
function ChatPage({ user, t }) {
  const storageKey = user?.email ? `casemind_chat_history:${user.email}` : "casemind_chat_history:guest"
  const initialMessages = [
    {
      role: "bot",
      text: t.welcomeBot,
    },
  ]
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (!saved) return initialMessages
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialMessages
    } catch {
      return initialMessages
    }
  })
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef(null)
  const quickPrompts = useMemo(() => [
    "What should I do if my property was taken without permission?",
    "How do I verify a lawyer's DBA number?",
    "What documents do I need for a family dispute?",
  ], [])

  // Scroll to the latest message automatically
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch {
      // If storage is unavailable, the chat still works for this session.
    }
  }, [messages, storageKey])

  async function sendMessage() {
    const question = inputText.trim()
    if (!question || isLoading) return

    const userMessage = { role: "user", text: question }
    const chatSoFar = [...messages, userMessage]

    setMessages([...chatSoFar, { role: "bot", text: t.thinking || "..." }])
    setInputText("")
    setIsLoading(true)

    try {
      // Build history in the format Groq expects
      const history = messages.map(msg => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      }))

     const botReply = await apiRequest("/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question, history }),
})
      const cleanAnswer = formatReply(cleanResponse(botReply.answer))
      setMessages([...chatSoFar, { role: "bot", text: cleanAnswer }])
    } catch (err) {
      setMessages([...chatSoFar, { role: "bot", text: err.message }])
    } finally {
      setIsLoading(false)
    }
  }

  function clearChatHistory() {
    setMessages(initialMessages)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  return (
    <main className="chat-page">
      {/* Show a warning if lawyer is not yet approved */}
      {user?.verification_status === "pending" && (
        <p className="pending-notice">
          Your lawyer profile is under admin review. You will appear in the public directory once approved.
        </p>
      )}

      <div className="chat-window">

        {/* Chat header bar */}
        <div className="chat-header">
          <img className="chat-avatar" src="/paklaw-logo-embedded.png" alt="PakLaw AI logo" />
          <button type="button" className="ghost-btn" onClick={clearChatHistory}>
            {t.clearHistory}
          </button>
        </div>

        <div className="quick-prompts">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="prompt-chip"
              onClick={() => setInputText(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message area */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`bubble-row ${msg.role}`}>
              <div className={`bubble ${msg.role}`}>
                {msg.role === "bot" ? <MessageText text={msg.text} /> : msg.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar at the bottom */}
        <div className="chat-input-bar">
          <input
            type="text"
            className="chat-input"
            placeholder={t.chatPlaceholder}
            value={inputText}
            disabled={isLoading}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") sendMessage()
            }}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? "..." : t.send}
          </button>
        </div>

      </div>

      <p className="chat-disclaimer">
        {t.chatSub}
      </p>

    </main>
  )
}

function MessageText({ text }) {
  const parts = String(text || "").split(/\n{2,}/).filter(Boolean)
  return parts.map((part, index) => {
    const lines = part.split(/\n/).filter(Boolean)
    return (
      <div key={`${index}-${part.slice(0, 12)}`} className="message-block">
        {lines.map((line, lineIndex) => (
          <p key={lineIndex}>{line}</p>
        ))}
      </div>
    )
  })
}

// ─── LAWYERS PAGE ─────────────────────────────────────────────
function LawyerCard({ lawyer }) {
  const [expanded, setExpanded] = useState(false)

  const initials = lawyer.name
    .split(" ")
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="lawyer-card">
      <div className="lawyer-top">
        <div className="avatar">{initials}</div>
        <div>
          <h3>{lawyer.name}</h3>
          <p className="specialization">{lawyer.specialization}</p>
        </div>
      </div>

      <div className="lawyer-meta">
        <span>{lawyer.city}</span>
        <span>{lawyer.dba_number}</span>
      </div>

      {expanded && (
        <div className="lawyer-details">
          <span>{lawyer.phone}</span>
          <span>{lawyer.email}</span>
        </div>
      )}

      <button
        className="secondary-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide Details" : "View Details"}
      </button>
    </article>
  )
}

function LawyersPage({ t }) {
  const [lawyers, setLawyers] = useState([])
  const [search, setSearch] = useState("")
  const [cityFilter, setCityFilter] = useState("All")

  useEffect(() => {
    apiRequest("/lawyers")
      .then(data => setLawyers(data.lawyers || []))
      .catch(() => setLawyers([]))
  }, [])

  const cities = useMemo(() => {
    return ["All", ...new Set(lawyers.map(l => l.city))]
  }, [lawyers])

  const filteredLawyers = lawyers.filter(lawyer => {
    const matchesSearch = `${lawyer.name} ${lawyer.specialization}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesCity = cityFilter === "All" || lawyer.city === cityFilter
    return matchesSearch && matchesCity
  })

  return (
    <main className="page">
      <section className="page-heading">
        <p className="eyebrow">{t.verifiedDirectory}</p>
        <h1>{t.findLawyer}</h1>
        <p>{t.verifiedByAdmin}</p>
      </section>

      <div className="search-bar">
        <input
          placeholder={t.searchLawyer}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
          {cities.map(city => <option key={city}>{city}</option>)}
        </select>
      </div>

      <p className="result-count">
        {filteredLawyers.length} lawyer{filteredLawyers.length !== 1 ? "s" : ""} found
      </p>

      {filteredLawyers.length === 0 && (
        <p className="empty-state">{t.noLawyersFound}</p>
      )}

      <div className="lawyer-grid">
        {filteredLawyers.map(lawyer => (
          <LawyerCard key={lawyer.id || lawyer.email} lawyer={lawyer} />
        ))}
      </div>
    </main>
  )
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────
function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </div>
  )
}

function AdminDashboard({ t }) {
  const [summary, setSummary] = useState(null)
  const [lawyers, setLawyers] = useState([])
  const [activeTab, setActiveTab] = useState("pending")
  const [statusMessage, setStatusMessage] = useState("")

  async function loadData() {
    try {
      const [summaryData, lawyersData] = await Promise.all([
        apiRequest("/admin/summary"),
        apiRequest("/admin/lawyers"),
      ])
      setSummary(summaryData)
      setLawyers(lawyersData.lawyers || [])
    } catch (err) {
      setStatusMessage(err.message)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleStatusChange(lawyerId, newStatus) {
    setStatusMessage("")
    try {
      await apiRequest(`/admin/lawyers/${lawyerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      await loadData()
      setStatusMessage(`Lawyer has been ${newStatus}.`)
    } catch (err) {
      setStatusMessage(err.message)
    }
  }

  const pendingLawyers = lawyers.filter(l => l.verification_status === "pending")
  const approvedLawyers = lawyers.filter(l => l.verification_status === "approved")

  return (
    <main className="page">
      <section className="page-heading">
        <p className="eyebrow">{t.adminDashboard}</p>
        <h1>{t.adminDashboard}</h1>
        <p>{t.verifyLawyers}</p>
      </section>

      {statusMessage && <p className="alert info">{statusMessage}</p>}

      {/* Overview stats */}
      <div className="stats-grid">
        <StatCard label={t.generalUsers} value={summary?.users ?? "-"} />
        <StatCard label={t.totalLawyers} value={summary?.lawyers ?? "-"} />
        <StatCard label={t.pendingReviews} value={summary?.pending_lawyers ?? "-"} />
        <StatCard label={t.approvedListings} value={summary?.approved_lawyers ?? "-"} />
      </div>

      {/* Tab switcher */}
      <div className="admin-tabs">
        <button
          className={activeTab === "pending" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("pending")}
        >
          {t.pendingRequests} ({pendingLawyers.length})
        </button>
        <button
          className={activeTab === "approved" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("approved")}
        >
          {t.approvedLawyers} ({approvedLawyers.length})
        </button>
      </div>

      {/* Pending lawyers table */}
      {activeTab === "pending" && (
        <div className="admin-table">
          <div className="table-heading">
            <h2>{t.pendingHeader}</h2>
            <p>{t.pendingHelp}</p>
          </div>
          <div className="table-scroll">
            {pendingLawyers.length === 0 ? (
              <p className="empty-state">{t.noPending}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>City</th>
                    <th>DBA Number</th>
                    <th>Specialization</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLawyers.map(lawyer => (
                    <tr key={lawyer.id}>
                      <td>{lawyer.name}</td>
                      <td>{lawyer.email}</td>
                      <td>{lawyer.city}</td>
                      <td>{lawyer.dba_number}</td>
                      <td>{lawyer.specialization}</td>
                      <td className="row-actions">
                        <button className="approve-btn" onClick={() => handleStatusChange(lawyer.id, "approved")}>{t.approve}</button>
                        <button className="reject-btn" onClick={() => handleStatusChange(lawyer.id, "rejected")}>{t.reject}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Approved lawyers table */}
      {activeTab === "approved" && (
        <div className="admin-table">
          <div className="table-heading">
            <h2>{t.approvedHeader}</h2>
            <p>{t.approvedHelp}</p>
          </div>
          <div className="table-scroll">
            {approvedLawyers.length === 0 ? (
              <p className="empty-state">{t.noApproved}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>City</th>
                    <th>DBA Number</th>
                    <th>Specialization</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedLawyers.map(lawyer => (
                    <tr key={lawyer.id}>
                      <td>{lawyer.name}</td>
                      <td>{lawyer.email}</td>
                      <td>{lawyer.city}</td>
                      <td>{lawyer.dba_number}</td>
                      <td>{lawyer.specialization}</td>
                      <td className="row-actions">
                        <button className="reject-btn" onClick={() => handleStatusChange(lawyer.id, "rejected")}>{t.remove}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login")
  const [currentPage, setCurrentPage] = useState("chat")
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(() => getSavedTheme())
  const [lang, setLang] = useState(() => getSavedLanguage())
  const [showProfile, setShowProfile] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const t = getT(lang)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  }, [lang])

  function handleLogin(data) {
    saveProfile(data)
    setUser(data)
    setCurrentPage(data.role === "admin" ? "admin" : "chat")
    setScreen("main")
    setShowProfile(false)
    setShowForgotPassword(false)
    setForgotEmail("")
  }

  function handleProfileSave(updated) {
    saveProfile(updated)
    setUser(updated)
  }

  function handleLogout() {
    setUser(null)
    setScreen("login")
  }

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"))
  }

  function toggleLanguage() {
    setLang((current) => (current === "en" ? "ur" : "en"))
  }

  function toggleProfile() {
    setShowProfile((current) => !current)
  }

  // Auth screens
  if (screen === "login") return (
    <>
      <LoginPage
        t={t}
        onLogin={handleLogin}
        onCreateAccount={() => setScreen("chooseRole")}
        onForgotPassword={(email) => {
          setForgotEmail(email || "")
          setShowForgotPassword(true)
        }}
      />
      <ForgotPasswordModal
        open={showForgotPassword}
        initialEmail={forgotEmail}
        t={t}
        onClose={() => setShowForgotPassword(false)}
        onReset={(email, password) => {
          const existing = loadProfile(email)
          if (existing) saveProfile({ ...existing, password })
        }}
      />
    </>
  )
  if (screen === "chooseRole") return <ChooseRolePage t={t} onChoose={role => setScreen(role === "user" ? "userSignup" : "lawyerSignup")} onBack={() => setScreen("login")} />
  if (screen === "userSignup") return <UserSignupPage t={t} onSuccess={handleLogin} onBack={() => setScreen("chooseRole")} />
  if (screen === "lawyerSignup") return <LawyerSignupPage t={t} onSuccess={handleLogin} onBack={() => setScreen("chooseRole")} />

  // Main app after login
  return (
    <div className="app-shell" dir={lang === "ur" ? "rtl" : "ltr"} lang={lang === "ur" ? "ur" : "en"}>
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        showProfile={showProfile}
        onToggleProfile={toggleProfile}
        onSaveProfile={handleProfileSave}
        t={t}
        onToggleLanguage={toggleLanguage}
        lang={lang}
      />
      {currentPage === "admin" && user?.role === "admin" && <AdminDashboard t={t} />}
      {currentPage === "chat" && <ChatPage user={user} t={t} />}
      {currentPage === "lawyers" && <LawyersPage t={t} />}
    </div>
  )
}
