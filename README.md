# SQL Bot - Deterministic Retrieval Assistant

This project is a high-accuracy, secure retrieval system that combines a modern React frontend with a deterministic SQL-generation backend.

## 📁 Project Structure

- **`deterministic-sql-assistant/`**: The enterprise-grade backend built with FastAPI and `asyncpg`.
- **`frontend/`**: The React-based user interface.

## 🚀 Getting Started

### Backend
1. `cd deterministic-sql-assistant`
2. Configure `.env` with your PostgreSQL credentials.
3. Run: `..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload`

### Frontend
1. `cd frontend`
2. Run: `npm install` (if first time)
3. Run: `npm run dev`

## 🛡️ Security
- **Parameterized Queries**: Zero risk of SQL injection.
- **Strict Table Enforcement**: Backend is locked to the `ccod_bal` table.
- **Read-Only Access**: Uses a read-only database user.
