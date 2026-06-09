# JIVO Gate — Deployment (embedded under teamboard.jivo.in/gate/)

The gate app is shown inside Team Board via an iframe pointing at `/gate/` on the
**same domain**. Nginx proxies `/gate/` to a Gunicorn process; Django runs with
`SCRIPT_PREFIX=/gate` so its API and static URLs are prefixed.

Run these **once** on the server (the CI pipeline handles code, venv, migrate,
collectstatic and `systemctl restart gate` on every push).

## 1. Server `.env`

Create `/var/www/teamboard/click/.env` (never committed):

```env
DJANGO_SECRET_KEY=CHANGE_ME_LONG_RANDOM
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=teamboard.jivo.in,127.0.0.1,localhost
SCRIPT_PREFIX=/gate

POSTGRES_DB=task
POSTGRES_USER=teamboard_user
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
```

`SCRIPT_PREFIX=/gate` is required — without it the app serves at root and the
iframe paths break.

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
