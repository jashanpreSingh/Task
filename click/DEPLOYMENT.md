# JIVO Gate — Deployment (embedded under teamboard.jivo.in/gate/)

The gate app is shown inside Team Board via an iframe pointing at `/gate/` on the
**same domain**. Nginx proxies `/gate/` to a Gunicorn process; Django runs with
`SCRIPT_PREFIX=/gate` so its API and static URLs are prefixed.

Run these **once** on the server (the CI pipeline handles code, venv, migrate,
collectstatic and `systemctl restart gate` on every push).

## 1. Environment / database

No separate secrets file is required. The gate app reads the Team Board project
`.env` (`/var/www/teamboard/.env`) as a fallback, so it reuses the same Postgres
credentials and database (`task`). `SCRIPT_PREFIX=/gate` is set by the systemd
unit (step 2), so the app mounts correctly under `/gate/`.

Only create `/var/www/teamboard/click/.env` if you want the gate app to use a
**different** database or settings than Team Board, e.g.:

```env
POSTGRES_DB=gate
DJANGO_ALLOWED_HOSTS=teamboard.jivo.in,127.0.0.1,localhost
```

Values in `click/.env` override the Team Board `.env` fallback.

## 2. systemd service

```bash
sudo cp /var/www/teamboard/click/deployment/systemd/gate.service /etc/systemd/system/gate.service
sudo systemctl daemon-reload
sudo systemctl enable gate
sudo systemctl start gate
sudo systemctl status gate
```

Allow the deploy user to restart it (add to the existing sudoers rule):

```text
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart teamboard, /bin/systemctl restart gate, /bin/systemctl reload nginx, /usr/sbin/nginx -t
```

## 3. Nginx

The `/gate/` and `/gate/static/` location blocks are already in
`deployment/nginx/teamboard.conf`. After deploying that config:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Verify

```bash
curl -I https://teamboard.jivo.in/gate/            # 200, serves the gate UI
curl -s https://teamboard.jivo.in/gate/api/structure   # gate JSON
```

Then open Team Board, log in as an Admin, and click **Gate** — it loads in the
embedded view. No new tab, no separate domain.
