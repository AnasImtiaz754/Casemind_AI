from pathlib import Path
import hashlib
import os
import re
import sqlite3

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).with_name("casemind.db")


def load_local_env():
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return

    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


load_local_env()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
ADMIN_EMAIL = os.getenv("CASEMIND_ADMIN_EMAIL", "admin@casemind.ai")
ADMIN_PASSWORD = os.getenv("CASEMIND_ADMIN_PASSWORD", "admin123")

SYSTEM_PROMPT = """You are CaseMind AI, a legal assistant specialized in Pakistani law.
Answer in a calm, practical tone.
Use short sections when useful:
1) Direct answer
2) Steps to take
3) Documents or proof to keep
4) Caution or next best move
Prefer bullet points over long paragraphs.
Keep the answer readable on a phone screen.
Always remind users to consult a real lawyer for formal advice."""


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            city TEXT,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS lawyers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lawyer_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            city TEXT,
            dba_number TEXT,
            specialization TEXT,
            password TEXT NOT NULL,
            verification_status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("PRAGMA table_info(lawyers)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "verification_status" not in columns:
        cursor.execute("ALTER TABLE lawyers ADD COLUMN verification_status TEXT DEFAULT 'pending'")

    conn.commit()
    conn.close()


init_db()


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def valid_email(value):
    return re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", value or "") is not None


def valid_phone(value):
    normalized = re.sub(r"[\s-]", "", value or "")
    return re.match(r"^(\+92|0)?3\d{9}$", normalized) is not None


def valid_name(value):
    return re.match(r"^[A-Za-z .'-]{3,}$", (value or "").strip()) is not None


def valid_city(value):
    return re.match(r"^[A-Za-z ]{2,}$", (value or "").strip()) is not None


def valid_dba(value):
    return re.match(r"^[A-Za-z0-9/-]{3,20}$", (value or "").strip()) is not None


def validation_error(message):
    return {"success": False, "message": message}


def validate_common(name, email, phone, city, password):
    if not valid_name(name):
        return "Name should contain letters only and be at least 3 characters."
    if not valid_email(email):
        return "Enter a valid email address."
    if not valid_phone(phone):
        return "Enter a valid Pakistani mobile number."
    if not valid_city(city):
        return "City should contain letters only."
    if len(password or "") < 6:
        return "Password must be at least 6 characters."
    return None


class UserSignup(BaseModel):
    full_name: str
    email: str
    phone: str
    city: str
    password: str


class LawyerSignup(BaseModel):
    lawyer_name: str
    email: str
    phone: str
    city: str
    dba_number: str
    specialization: str
    password: str


class LoginData(BaseModel):
    email: str
    password: str


class ForgotPasswordData(BaseModel):
    email: str
    password: str


class Question(BaseModel):
    question: str
    history: list = []


class StatusUpdate(BaseModel):
    status: str


def fallback_answer(question: str) -> str:
    text = (question or "").lower()

    if any(word in text for word in ["theft", "steal", "stolen", "robbery"]):
        return (
            "Under Pakistani law, theft and related offenses are generally covered by the Pakistan Penal Code. "
            "If property was taken without consent, the exact section depends on whether it was theft, robbery, or burglary. "
            "Preserve any proof, write down the incident timeline, and report it to the police as soon as possible. "
            "For formal legal action, consult a licensed lawyer."
        )

    if any(word in text for word in ["divorce", "khula", "talaq", "custody", "maintenance"]):
        return (
            "Family-law matters in Pakistan often involve different rules depending on the exact issue, such as talaq, khula, child custody, or maintenance. "
            "Document your marriage details, any notices exchanged, and financial records. "
            "A family lawyer can tell you which court process and documents apply to your situation."
        )

    if any(word in text for word in ["property", "land", "rent", "tenant", "lease"]):
        return (
            "Property disputes in Pakistan usually turn on ownership documents, possession history, and any written agreement. "
            "Keep the registry, sale deed, rent agreement, receipts, and correspondence together. "
            "If the dispute is active, a lawyer can help you choose between civil notice, settlement, or filing suit."
        )

    return (
        "I’m unable to reach the AI service right now, so here is a general legal note: "
        "share the key facts, collect documents, and avoid relying on informal advice for anything time-sensitive. "
        "If you want, ask a more specific question and I’ll give a practical Pakistani-law oriented answer from the local fallback system. "
        "For anything formal or risky, consult a licensed lawyer."
    )


@app.post("/signup/user")
def signup_user(data: UserSignup):
    error = validate_common(data.full_name, data.email, data.phone, data.city, data.password)
    if error:
        return validation_error(error)

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (full_name, email, phone, city, password)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data.full_name.strip(),
            data.email.strip().lower(),
            data.phone.strip(),
            data.city.strip(),
            hash_password(data.password),
        ))
        conn.commit()
        conn.close()
        return {"success": True, "message": "Account created successfully", "role": "user"}
    except sqlite3.IntegrityError:
        return validation_error("Email already exists.")


@app.post("/signup/lawyer")
def signup_lawyer(data: LawyerSignup):
    error = validate_common(data.lawyer_name, data.email, data.phone, data.city, data.password)
    if error:
        return validation_error(error)
    if not valid_dba(data.dba_number):
        return validation_error("DBA number should contain only letters, numbers, slash, or dash.")
    if len(data.specialization.strip()) < 3:
        return validation_error("Enter a valid specialization.")

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO lawyers (
                lawyer_name, email, phone, city, dba_number, specialization, password, verification_status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        """, (
            data.lawyer_name.strip(),
            data.email.strip().lower(),
            data.phone.strip(),
            data.city.strip(),
            data.dba_number.strip().upper(),
            data.specialization.strip(),
            hash_password(data.password),
        ))
        conn.commit()
        conn.close()
        return {
            "success": True,
            "message": "Lawyer account submitted for admin verification.",
            "role": "lawyer",
            "verification_status": "pending",
        }
    except sqlite3.IntegrityError:
        return validation_error("Email already exists.")


@app.post("/login")
def login(data: LoginData):
    if data.email.strip().lower() == ADMIN_EMAIL.lower() and data.password == ADMIN_PASSWORD:
        return {"success": True, "role": "admin", "name": "Admin"}

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id, full_name FROM users WHERE email=? AND password=?",
        (data.email.strip().lower(), hash_password(data.password)),
    )
    user = cursor.fetchone()
    if user:
        conn.close()
        return {"success": True, "role": "user", "name": user["full_name"]}

    cursor.execute(
        "SELECT id, lawyer_name, verification_status FROM lawyers WHERE email=? AND password=?",
        (data.email.strip().lower(), hash_password(data.password)),
    )
    lawyer = cursor.fetchone()
    if lawyer:
        conn.close()
        return {
            "success": True,
            "role": "lawyer",
            "name": lawyer["lawyer_name"],
            "verification_status": lawyer["verification_status"],
        }

    conn.close()
    return {"success": False, "message": "Invalid email or password."}


@app.post("/forgot-password")
def forgot_password(data: ForgotPasswordData):
    if not valid_email(data.email):
        return validation_error("Enter a valid email address.")
    if len(data.password or "") < 6:
        return validation_error("Password must be at least 6 characters.")

    conn = get_connection()
    cursor = conn.cursor()

    email = data.email.strip().lower()
    hashed = hash_password(data.password)

    cursor.execute("UPDATE users SET password=? WHERE email=?", (hashed, email))
    user_changed = cursor.rowcount
    cursor.execute("UPDATE lawyers SET password=? WHERE email=?", (hashed, email))
    lawyer_changed = cursor.rowcount
    conn.commit()
    conn.close()

    if not user_changed and not lawyer_changed:
        return validation_error("No account found for that email.")
    return {"success": True, "message": "Password updated successfully."}


def lawyer_dict(row):
    return {
        "id": row["id"],
        "name": row["lawyer_name"],
        "email": row["email"],
        "phone": row["phone"],
        "city": row["city"],
        "dba_number": row["dba_number"],
        "specialization": row["specialization"],
        "verification_status": row["verification_status"],
    }


@app.get("/lawyers")
def get_lawyers():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, lawyer_name, email, phone, city, dba_number, specialization, verification_status
        FROM lawyers
        WHERE verification_status='approved'
        ORDER BY lawyer_name
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"lawyers": [lawyer_dict(row) for row in rows]}


@app.get("/admin/summary")
def admin_summary():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS count FROM users")
    users = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) AS count FROM lawyers")
    lawyers = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) AS count FROM lawyers WHERE verification_status='pending'")
    pending = cursor.fetchone()["count"]
    cursor.execute("SELECT COUNT(*) AS count FROM lawyers WHERE verification_status='approved'")
    approved = cursor.fetchone()["count"]
    conn.close()
    return {
        "users": users,
        "lawyers": lawyers,
        "pending_lawyers": pending,
        "approved_lawyers": approved,
    }


@app.get("/admin/lawyers")
def admin_lawyers():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, lawyer_name, email, phone, city, dba_number, specialization, verification_status
        FROM lawyers
        ORDER BY created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return {"lawyers": [lawyer_dict(row) for row in rows]}


@app.patch("/admin/lawyers/{lawyer_id}/status")
def update_lawyer_status(lawyer_id: int, data: StatusUpdate):
    if data.status not in {"pending", "approved", "rejected"}:
        return validation_error("Invalid status.")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE lawyers SET verification_status=? WHERE id=?",
        (data.status, lawyer_id),
    )
    conn.commit()
    changed = cursor.rowcount
    conn.close()

    if not changed:
        return validation_error("Lawyer not found.")
    return {"success": True, "message": f"Lawyer status updated to {data.status}."}


@app.post("/ask")
async def ask_question(body: Question):
    if not GROQ_API_KEY:
        return {"answer": fallback_answer(body.question)}

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in body.history:
        messages.append(msg)
    messages.append({"role": "user", "content": body.question})
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 700,
                },
                timeout=30.0,
            )

        data = response.json()
        if response.status_code != 200 or "choices" not in data:
            return {"answer": fallback_answer(body.question)}
        return {"answer": data["choices"][0]["message"]["content"]}
    except (httpx.HTTPError, ValueError, KeyError):
        return {"answer": fallback_answer(body.question)}


@app.get("/")
def home():
    return {"status": "CaseMind backend is running"}
