# Team Board Linux Deployment Guide

This project has:

- React + Vite frontend
- Django REST backend
- PostgreSQL database
- Session-based login
- Role-based access for Admin, Manager, and Member

Recommended production layout:

```text
Browser
  -> Nginx on port 80/443
      -> / serves frontend/dist
      -> /api proxies to Gunicorn/Django on 127.0.0.1:8000
      -> /admin proxies to Django admin
  -> PostgreSQL
```

## 1. Server Requirements

Use Ubuntu 22.04/24.04 or Debian 12.

Install packages:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx postgresql postgresql-contrib git rsync curl
```

Install Node.js. For simple server builds, Node 24 is fine:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

## 2. Create Server Directory

```bash
sudo mkdir -p /var/www/teamboard
sudo chown -R $USER:www-data /var/www/teamboard
```

Clone or upload the project:

```bash
cd /var/www/teamboard
git clone YOUR_REPO_URL .
```

## 3. PostgreSQL Setup

Create a database and user:

```bash
sudo -u postgres psql
```

Inside PostgreSQL:

```sql
CREATE DATABASE teamboard;
CREATE USER teamboard_user WITH PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';
ALTER ROLE teamboard_user SET client_encoding TO 'utf8';
ALTER ROLE teamboard_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE teamboard_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE teamboard TO teamboard_user;
\q
```

## 4. Production Environment File

Create `/var/www/teamboard/.env`:

```bash
sudo nano /var/www/teamboard/.env
```

Example:

```env
DJANGO_SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=example.com,www.example.com,127.0.0.1,localhost

POSTGRES_DB=teamboard
POSTGRES_USER=teamboard_user
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432

CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_SSL_REDIRECT=True
```

For first HTTP-only testing before SSL, temporarily use:

```env
CORS_ALLOWED_ORIGINS=http://example.com,http://www.example.com
CSRF_TRUSTED_ORIGINS=http://example.com,http://www.example.com
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False
SECURE_SSL_REDIRECT=False
```

Switch back to HTTPS settings after Certbot is installed.

## 5. Backend Setup

```bash
cd /var/www/teamboard
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
```

Create admin user:

```bash
python manage.py createsuperuser
```

## 6. Frontend Build

```bash
cd /var/www/teamboard/frontend
npm ci
VITE_API_BASE=/api npm run build
```

`VITE_API_BASE=/api` is important because Nginx will proxy `/api` to Django.

## 7. Gunicorn systemd Service

Copy the service template:

```bash
sudo cp /var/www/teamboard/deployment/systemd/teamboard.service /etc/systemd/system/teamboard.service
```

Edit it if your path or user is different:

```bash
sudo nano /etc/systemd/system/teamboard.service
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable teamboard
sudo systemctl start teamboard
sudo systemctl status teamboard
```

Check logs:

```bash
sudo journalctl -u teamboard -f
```

## 8. Nginx Setup

Copy config:

```bash
sudo cp /var/www/teamboard/deployment/nginx/teamboard.conf /etc/nginx/sites-available/teamboard
```

Edit `server_name`:

```bash
sudo nano /etc/nginx/sites-available/teamboard
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/teamboard /etc/nginx/sites-enabled/teamboard
sudo nginx -t
sudo systemctl reload nginx
```

Open:

```text
http://example.com
```

## 9. HTTPS With Certbot

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Generate certificate:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Then update `/var/www/teamboard/.env` to HTTPS values:

```env
CORS_ALLOWED_ORIGINS=https://example.com,https://www.example.com
CSRF_TRUSTED_ORIGINS=https://example.com,https://www.example.com
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_SSL_REDIRECT=True
```

Restart:

```bash
sudo systemctl restart teamboard
sudo systemctl reload nginx
```

## 10. GitHub Actions Pipeline

This repo includes:

```text
.github/workflows/deploy.yml
```

It does:

1. Checkout code
2. Build React frontend
3. Install backend dependencies
4. Upload files to server with `rsync`
5. Install Python dependencies on server
6. Run migrations
7. Run collectstatic
8. Restart Gunicorn service
9. Reload Nginx

Add these GitHub repository secrets:

```text
SERVER_HOST=your.server.ip.or.domain
SERVER_USER=deploy
SERVER_PATH=/var/www/teamboard
SERVER_SSH_KEY=private SSH key for deploy user
```

The server user must be able to run:

```bash
sudo systemctl restart teamboard
sudo nginx -t
sudo systemctl reload nginx
```

Recommended sudoers rule:

```bash
sudo visudo
```

Add:

```text
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart teamboard, /bin/systemctl reload nginx, /usr/sbin/nginx -t
```

Adjust paths if your system uses different binary locations:

```bash
which systemctl
which nginx
```

## 11. Deployment Checklist

Before first deploy:

- Domain DNS points to server IP
- PostgreSQL database exists
- `/var/www/teamboard/.env` exists on server
- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY` is strong and private
- Nginx config has correct domain
- systemd service path is correct
- GitHub secrets are configured

After deploy:

```bash
sudo systemctl status teamboard
sudo nginx -t
curl -I http://example.com
curl -I http://example.com/api/auth/session/
```

## 12. Common Problems

### Login works locally but fails on server

Check:

```env
CSRF_TRUSTED_ORIGINS=https://example.com
CORS_ALLOWED_ORIGINS=https://example.com
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
```

Also make sure frontend uses:

```bash
VITE_API_BASE=/api npm run build
```

### 502 Bad Gateway

Check Gunicorn:

```bash
sudo systemctl status teamboard
sudo journalctl -u teamboard -n 100
```

### Static/admin CSS missing

Run:

```bash
cd /var/www/teamboard/backend
/var/www/teamboard/.venv/bin/python manage.py collectstatic --noinput
sudo systemctl reload nginx
```

### Database connection failed

Check:

```bash
sudo systemctl status postgresql
psql -h 127.0.0.1 -U teamboard_user -d teamboard
```

