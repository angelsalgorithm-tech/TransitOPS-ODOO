# TransitOps — Smart Transport Operations Platform

Stack: HTML/CSS/JS (frontend) + FastAPI (backend) + MongoDB (database)

---

## 1. Project structure

```
transitops/
├── backend/            FastAPI app
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── schemas.py
│       ├── auth.py
│       ├── dependencies.py
│       └── routers/     auth, vehicles, drivers, trips, maintenance, fuel_expenses, reports
└── frontend/            plain HTML/CSS/JS
    ├── index.html        login + signup
    ├── dashboard.html
    ├── vehicles.html
    ├── drivers.html
    ├── trips.html
    ├── maintenance.html
    ├── reports.html
    ├── css/styles.css
    └── js/                api.js + one file per page
```

---

## 2. Set up MongoDB Atlas (5 min)

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account.
2. Create a **free M0 cluster** (any region close to you).
3. Under **Database Access**, create a user with a password.
4. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere — fine for a hackathon, tighten later).
5. Click **Connect → Drivers → Python**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Atlas clusters are replica sets by default, which is required — the Trips and Maintenance routes use multi-document transactions to keep Vehicle/Driver/Trip statuses in sync.

---

## 3. Run the backend locally

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# open .env and paste your real MONGO_URI + a random JWT_SECRET

uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` — FastAPI's auto-generated Swagger UI. Use it to sanity-check endpoints before wiring up the frontend.

---

## 4. Run the frontend locally

The frontend is static files — no build step. Two options:

**Option A — VS Code Live Server extension** (easiest): right-click `frontend/index.html` → "Open with Live Server".

**Option B — Python's built-in server:**
```bash
cd frontend
python3 -m http.server 5500
```
Then open `http://localhost:5500`.

`frontend/js/api.js` has `const API_BASE = "http://localhost:8000";` — this is already pointed at your local backend. Change it once you deploy (Step 6).

---

## 5. Test the core flow end-to-end

1. Open the login page → click **Create one** → sign up as a `fleet_manager`.
2. Go to **Vehicles** → register a vehicle (e.g. reg `KA-01-AB-1234`, max load `500`).
3. Sign up a second account as `safety_officer` (or just add a driver directly — driver creation is allowed for `fleet_manager` too) → go to **Drivers** → add a driver with a future license expiry date.
4. Sign up a third account as `dispatcher` → go to **Trips** → create a trip with the vehicle/driver you just made, cargo weight under the max load.
5. Click **Dispatch** — vehicle and driver both flip to "On Trip" (check the Vehicles/Drivers pages).
6. Click **Complete**, enter final odometer + fuel used — both flip back to "Available".
7. Try creating a maintenance record on that vehicle — status flips to "In Shop" and it disappears from the Trips vehicle dropdown.
8. Check **Reports** for fuel efficiency/cost once you've logged a fuel entry via the `/fuel-logs` endpoint (no dedicated UI form yet — use `/docs` to POST one, or ask me to build that screen).

---

## 6. Deploy

**Database** — already hosted (MongoDB Atlas from Step 2). Nothing else to do.

**Backend → Railway** (or Render):
1. Push this repo to GitHub.
2. On Railway: New Project → Deploy from GitHub → select the repo, set root directory to `backend`.
3. Add environment variables from your `.env`: `MONGO_URI`, `DB_NAME`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`.
4. Set the start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Railway gives you a public URL like `https://transitops-backend.up.railway.app`.

**Frontend → Vercel or Netlify:**
1. In `frontend/js/api.js`, change `API_BASE` to your Railway backend URL.
2. Drag-and-drop the `frontend` folder into Netlify, or `vercel deploy` from inside `frontend/` with Vercel CLI.
3. You'll get a public URL for the app itself.

**Lock down CORS** in `backend/app/main.py` — replace `allow_origins=["*"]` with your deployed frontend URL before final submission.

---

## 7. What's left to build

- Fuel log / expense entry forms in the UI (backend routes already exist: `POST /fuel-logs`, `POST /expenses`)
- Notification/reminder system for expiring licenses (data is already queryable via `/reports/expiring-licenses`)
- Charts on the Reports page (consider Chart.js via CDN — no build step needed)
- Filters on Dashboard (by vehicle type/status/region)
- Dark mode toggle, PDF export — both listed as bonus/optional in the problem statement

---

## 8. Team split suggestion

- **Person A:** Backend — Trips + Maintenance logic (the transactional, rule-heavy routes)
- **Person B:** Backend — Vehicles + Drivers + Reports aggregations
- **Person C:** Frontend — Login/Dashboard/Vehicles pages
- **Person D:** Frontend — Trips/Maintenance/Reports pages + CSV/chart polish

Everyone can work in parallel once `main.py`, `database.py`, and `api.js` exist, since those are the only shared contract points.

