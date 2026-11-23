#!/usr/bin/env bash
# Enable only torbat.digiral.ir. Preserve other vhosts and process managers.
set -euo pipefail
base=/opt/torbat-man
available=/etc/nginx/sites-available/torbat.digiral.ir.conf
enabled=/etc/nginx/sites-enabled/torbat.digiral.ir.conf
test -L "$base/current"
test ! -e "$available" && test ! -L "$available" || exit 1
test ! -e "$enabled" && test ! -L "$enabled" || exit 1
test ! -e "$base/shared/nginx.htpasswd"
test ! -e "$base/shared/demo-access.txt"
exec 9>"$base/shared/update.lock"
flock -n 9
nginx_config="$(nginx -T 2>/dev/null)"
if grep -Eq '^[[:space:]]*server_name[[:space:]]+([^;]*[[:space:]])?torbat\.digiral\.ir([[:space:]]|;)' <<< "$nginx_config"; then
    echo 'An existing configuration already serves torbat.digiral.ir.' >&2
    exit 1
fi
curl -fsS http://127.0.0.1:4180/health >/dev/null
curl -fsS http://127.0.0.1:5000/api/health >/dev/null
mkdir -p "$base/shared/acme/.well-known/acme-challenge" "$base/shared/public-baseline"
old_env="$base/shared/public-baseline/api.env.before-https"
env_saved=false
rollback_on_error() {
    result=$?
    trap - EXIT
    if [ "$result" -ne 0 ]; then
        echo 'Activation failed; restoring the previous private setup.' >&2
        rm -f -- "$enabled" "$available" "$base/shared/nginx.htpasswd" "$base/shared/demo-access.txt"
        if [ "$env_saved" = true ]; then
            install -m 0600 "$old_env" "$base/shared/api.env"
            systemctl restart torbat-man-api || true
        fi
        if nginx -t; then systemctl reload nginx; fi
    fi
    exit "$result"
}
trap rollback_on_error EXIT
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
install -m 0600 "$base/shared/api.env" "$old_env"
env_saved=true
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
    auth_basic "Torbat Man - demo login";
    auth_basic_user_file /opt/torbat-man/shared/nginx.htpasswd;
    client_max_body_size 6m;
    add_header Strict-Transport-Security "max-age=86400" always;
    add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header Authorization "";
    proxy_read_timeout 35s;
    proxy_send_timeout 35s;
    proxy_buffering off;

    # Public browsing is open. Demo OTP and any new private routes retain the entry gate.
    location ~ "^/(?:|index\.html|services(?:/[^/]+)?(?:/[^/]+)?|categories/[^/]+|catalog(?:/[^/]+)?|welcome|search|city-map|city-news|shahrbin(?:/(?:map|guide|new))?|assistant|support|health|app-icon\.svg|logo-mark\.png|manifest\.webmanifest|registerSW\.js|sw\.js|workbox-[a-z0-9]+\.js|v1/(?:services(?:/[^/]+)?|announcements|ai/assistant))$" {
        auth_basic off;
        proxy_pass http://127.0.0.1:4180;
    }
    location = /v1/me {
        auth_basic off;
        limit_except GET { auth_basic "Torbat Man - demo login"; }
        proxy_pass http://127.0.0.1:4180;
    }
    location ^~ /assets/ {
        auth_basic off;
        proxy_pass http://127.0.0.1:4180;
    }
    location / {
        proxy_pass http://127.0.0.1:4180;
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
test "$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' --resolve torbat.digiral.ir:443:127.0.0.1 https://torbat.digiral.ir/health)" = 200
test "$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' --resolve torbat.digiral.ir:443:127.0.0.1 https://torbat.digiral.ir/admin)" = 401
python3 - <<'PY'
from pathlib import Path
import subprocess
password = next(line.split(': ', 1)[1] for line in Path('/opt/torbat-man/shared/demo-access.txt').read_text().splitlines() if line.startswith('Password: '))
subprocess.run(['curl', '-fsS', '--max-time', '10', '--resolve', 'torbat.digiral.ir:443:127.0.0.1', '--config', '-', 'https://torbat.digiral.ir/health'], input=f'user = "torbat:{password}"\n', text=True, check=True)
PY
trap - EXIT
echo 'Torbat Man HTTPS browsing enabled. Demo login remains protected.'
