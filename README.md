# Team Board

A minimal Django + React workspace for task tracking, blocker visibility, role-based access, and team chat.

## Run locally

1. Start PostgreSQL:
   `sudo docker compose up -d`
2. Create backend environment:
   `python3.12 -m venv .venv`
   `. .venv/bin/activate`
   `python --version  # verify 3.12.x`
   `pip install -r backend/requirements.txt`
3. Apply migrations:
   `cd backend && python manage.py migrate`
4. Start Django API:
   `python manage.py runserver 8000`
5. Start React frontend:
   `cd frontend && npm run dev -- --host 0.0.0.0 --port 5173`

The dashboard uses the Django session API for login, signup, and chat. The local `.env` file is configured for your external PostgreSQL server at `103.89.45.75` using database `task`, user `postgres`, and the provided password. Adjust those values in `.env` if you want to point to a different PostgreSQL server.
