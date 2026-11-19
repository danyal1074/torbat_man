#!/usr/bin/env bash
# First install only. Source and build are prepared locally. Never touches existing apps/nginx.
set -euo pipefail
revision="${1:?Pass the full source commit SHA}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
base=/opt/torbat-man
release="$base/releases/$revision"
test -f "$release/release.json"
test ! -e "$base/current"
! getent passwd torbat-man >/dev/null
! docker container inspect torbat-man-postgres >/dev/null 2>&1
! docker volume inspect torbat-man-postgres-data >/dev/null 2>&1
! docker network inspect torbat-man >/dev/null 2>&1
for port in 4180 4181 5441; do
 if ss -H -ltn "sport = :$port" | grep -q .; then echo "Port $port is already occupied" >&2; exit 1; fi
done
image='postgres:16-alpine@sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139'
docker image inspect "$image" >/dev/null
mkdir -p "$base/shared/uploads" "$base/shared/baseline"
python3 - <<'PY'
import subprocess,json,pathlib,hashlib,secrets,os
base=pathlib.Path('/opt/torbat-man/shared')
configs={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in pathlib.Path('/etc/nginx/sites-enabled').iterdir()}
processes=[{'name':p['name'],'pid':p.get('pid'),'status':p['pm2_env']['status'],'restarts':p['pm2_env']['restart_time']} for p in json.loads(subprocess.check_output(['pm2','jlist']))]
(base/'baseline/nginx.json').write_text(json.dumps(configs))
(base/'baseline/pm2.json').write_text(json.dumps(processes))
password=secrets.token_urlsafe(36)
pg=f'POSTGRES_USER=torbat\nPOSTGRES_DB=torbat\nPOSTGRES_PASSWORD={password}\n'
api=f'NODE_ENV=production\nAPP_ENV=demo\nHOST=127.0.0.1\nPORT=4181\nLOG_LEVEL=warn\nDATABASE_URL=postgresql://torbat:{password}@127.0.0.1:5441/torbat\nSESSION_SECRET={secrets.token_hex(32)}\nFILE_SIGNING_SECRET={secrets.token_hex(32)}\nCOOKIE_SECURE=false\nOTP_DEV_ECHO=true\nAPP_ORIGINS=http://localhost:4180,http://127.0.0.1:4180\nSTORAGE_DIR=/opt/torbat-man/shared/uploads\n'
for name,data in [('postgres.env',pg),('api.env',api)]:
 p=base/name
 with p.open('x') as f:f.write(data)
 os.chmod(p,0o600)
PY
useradd --system --home-dir "$base" --shell /usr/sbin/nologin torbat-man
chown torbat-man:torbat-man "$base/shared/uploads"
docker network create --label project=torbat-man torbat-man >/dev/null
docker volume create --label project=torbat-man torbat-man-postgres-data >/dev/null
docker run -d --pull never --name torbat-man-postgres --label project=torbat-man \
 --network torbat-man --restart unless-stopped --cpus .25 --memory 256m --memory-swap 256m --pids-limit 128 \
 --env-file "$base/shared/postgres.env" -p 127.0.0.1:5441:5432 \
 -v torbat-man-postgres-data:/var/lib/postgresql/data \
 --health-cmd 'pg_isready -U torbat -d torbat' --health-interval 5s --health-retries 12 \
 "$image" -c shared_buffers=64MB -c max_connections=30 >/dev/null
for attempt in $(seq 1 30); do
 if docker exec torbat-man-postgres pg_isready -U torbat -d torbat >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec torbat-man-postgres pg_isready -U torbat -d torbat
cd "$release/api"
nice -n 15 env NODE_OPTIONS=--max-old-space-size=384 npm ci --omit=dev --ignore-scripts --no-audit --no-fund --maxsockets=4
set -a
source "$base/shared/api.env"
set +a
/usr/bin/node dist/seed/seed-cli.js
ln -s "$release" "$base/current"
cat > /etc/systemd/system/torbat-man-api.service <<'UNIT'
[Unit]
Description=Torbat Man isolated demo API
After=network.target docker.service
Requires=docker.service
[Service]
User=torbat-man
Group=torbat-man
WorkingDirectory=/opt/torbat-man/current/api
EnvironmentFile=/opt/torbat-man/shared/api.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/torbat-man/shared/uploads
MemoryMax=384M
CPUQuota=50%
TasksMax=128
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/torbat-man-web.service <<'UNIT'
[Unit]
Description=Torbat Man isolated private demo web
After=torbat-man-api.service
Requires=torbat-man-api.service
[Service]
User=torbat-man
Group=torbat-man
WorkingDirectory=/opt/torbat-man/current/infra
Environment=PORT=4180
Environment=API_TARGET=http://127.0.0.1:4181
Environment=STATIC_DIR=/opt/torbat-man/current/web
ExecStart=/usr/bin/node web-server.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
MemoryMax=128M
CPUQuota=20%
TasksMax=64
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now torbat-man-api.service torbat-man-web.service
for attempt in $(seq 1 30); do
 if curl -fsS http://127.0.0.1:4180/health >/dev/null; then break; fi
 sleep 1
done
curl -fsS http://127.0.0.1:4180/health
python3 - <<'PY'
import subprocess,json,pathlib,hashlib
base=pathlib.Path('/opt/torbat-man/shared/baseline')
for name,digest in json.loads((base/'nginx.json').read_text()).items():
 assert hashlib.sha256(pathlib.Path(name).read_bytes()).hexdigest()==digest,name
before=json.loads((base/'pm2.json').read_text())
after=[{'name':p['name'],'pid':p.get('pid'),'status':p['pm2_env']['status'],'restarts':p['pm2_env']['restart_time']} for p in json.loads(subprocess.check_output(['pm2','jlist']))]
assert before==after,'Existing PM2 processes changed during deployment'
print('Verified: existing nginx configurations and PM2 processes unchanged.')
PY
curl -fsS http://127.0.0.1:5000/api/health >/dev/null
echo 'Private demo ready on 127.0.0.1:4180; access through SSH forwarding.'
