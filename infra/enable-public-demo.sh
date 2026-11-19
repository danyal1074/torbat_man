#!/usr/bin/env bash
# Enable only torbat.digiral.ir. Preserve other vhosts and process managers.
set -euo pipefail
base=/opt/torbat-man
available=/etc/nginx/sites-available/torbat.digiral.ir.conf
enabled=/etc/nginx/sites-enabled/torbat.digiral.ir.conf
test -L "$base/current"
test ! -e "$available"
test ! -e "$enabled"
test ! -e "$base/shared/nginx.htpasswd"
curl -fsS http://127.0.0.1:4180/health >/dev/null
mkdir -p "$base/shared/acme/.well-known/acme-challenge" "$base/shared/public-baseline"
python3 - <<'PY'
import pathlib,hashlib,json,subprocess,secrets,os,grp
base=pathlib.Path('/opt/torbat-man/shared')
configs={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in pathlib.Path('/etc/nginx/sites-enabled').iterdir()}
(base/'public-baseline/nginx.json').write_text(json.dumps(configs))
processes=[{'name':p['name'],'pid':p.get('pid'),'status':p['pm2_env']['status'],'restarts':p['pm2_env']['restart_time']} for p in json.loads(subprocess.check_output(['pm2','jlist']))]
(base/'public-baseline/pm2.json').write_text(json.dumps(processes))
password=secrets.token_urlsafe(24)
hashed=subprocess.run(['openssl','passwd','-6','-stdin'],input=password+'\n',text=True,capture_output=True,check=True).stdout.strip()
p=base/'nginx.htpasswd'
with p.open('x') as f:f.write('torbat:'+hashed+'\n')
os.chown(p,0,grp.getgrnam('www-data').gr_gid);os.chmod(p,0o640)
p=base/'demo-access.txt'
with p.open('x') as f:f.write('URL: https://torbat.digiral.ir\nUsername: torbat\nPassword: '+password+'\n\nPrivate preview only. OTP and organizations are demo.\n')
os.chmod(p,0o600)
PY
cat > "$available" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name torbat.digiral.ir;
    location ^~ /.well-known/acme-challenge/ {
        root /opt/torbat-man/shared/acme;
        default_type text/plain;
        try_files $uri =404;
    }
    location / { return 503; }
}
NGINX
ln -s "$available" "$enabled"
if ! nginx -t; then unlink "$enabled"; exit 1; fi
systemctl reload nginx
certbot certonly --webroot -w "$base/shared/acme" -d torbat.digiral.ir \
 --non-interactive --agree-tos --register-unsafely-without-email \
 --deploy-hook 'nginx -t && systemctl reload nginx'
test -s /etc/letsencrypt/live/torbat.digiral.ir/fullchain.pem
cp "$base/shared/api.env" "$base/shared/public-baseline/api.env.before-https"
python3 - <<'PY'
from pathlib import Path
p=Path('/opt/torbat-man/shared/api.env')
data=p.read_text().replace('COOKIE_SECURE=false','COOKIE_SECURE=true')
lines=data.splitlines()
for i,line in enumerate(lines):
 if line.startswith('APP_ORIGINS='):
  values=line.split('=',1)[1].split(',')
  if 'https://torbat.digiral.ir' not in values:values.append('https://torbat.digiral.ir')
  lines[i]='APP_ORIGINS='+','.join(values)
p.write_text('\n'.join(lines)+'\n')
PY
systemctl restart torbat-man-api
for attempt in $(seq 1 30); do
 if curl -fsS http://127.0.0.1:4181/health >/dev/null; then break; fi
 sleep 1
done
curl -fsS http://127.0.0.1:4181/health >/dev/null
cat > "$available" <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name torbat.digiral.ir;
    location ^~ /.well-known/acme-challenge/ {
        root /opt/torbat-man/shared/acme;
        default_type text/plain;
        try_files $uri =404;
    }
    location / { return 301 https://torbat.digiral.ir$request_uri; }
}
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name torbat.digiral.ir;
    ssl_certificate /etc/letsencrypt/live/torbat.digiral.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/torbat.digiral.ir/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    auth_basic "Torbat Man - private demo";
    auth_basic_user_file /opt/torbat-man/shared/nginx.htpasswd;
    client_max_body_size 6m;
    add_header Strict-Transport-Security "max-age=86400" always;
    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
    location / {
        proxy_pass http://127.0.0.1:4180;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Authorization "";
        proxy_read_timeout 35s;
        proxy_send_timeout 35s;
        proxy_buffering off;
    }
}
NGINX
nginx -t
systemctl reload nginx
python3 - <<'PY'
import subprocess,json,pathlib,hashlib
base=pathlib.Path('/opt/torbat-man/shared/public-baseline')
for name,digest in json.loads((base/'nginx.json').read_text()).items():
 assert hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest()==digest,name
before=json.loads((base/'pm2.json').read_text())
after=[{'name':p['name'],'pid':p.get('pid'),'status':p['pm2_env']['status'],'restarts':p['pm2_env']['restart_time']} for p in json.loads(subprocess.check_output(['pm2','jlist']))]
assert before==after,'An existing PM2 process changed during setup'
print('Verified: all pre-existing vhost files and PM2 processes unchanged.')
PY
curl -fsS http://127.0.0.1:5000/api/health >/dev/null
echo 'Torbat Man HTTPS preview enabled behind a private access password.'
