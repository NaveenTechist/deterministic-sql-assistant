# Start Backend (FastAPI) in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn main:app --reload --port 8000"

# Start Frontend (React/Vite) in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "🚀 SQL Bot servers are starting in separate windows!" -ForegroundColor Cyan
Write-Host "  Backend: http://localhost:8000"
Write-Host "  Frontend: http://localhost:5173"
