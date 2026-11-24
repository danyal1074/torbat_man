#!/usr/bin/env bash
# Install the public sandbox beside the existing private demo.
set -euo pipefail
umask 022
revision="${1:?Pass the full source commit SHA}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
base=/opt/torbat-man/public-demo
release="/opt/torbat-man/releases/$revision"
project=torbat-man-public
database=torbat_public_demo
domain=torbat.digiral.ir
vhost="/etc/nginx/sites-available/$domain.conf"

test "$(id -u)" = 0
test -f "$release/release.json"
test "$(readlink -f "/etc/nginx/sites-enabled/$domain.conf")" = "$vhost"
grep -Fq 'auth_basic off;' "$vhost"
test "$(grep -Fc 'proxy_pass http://127.0.0.1:4180;' "$vhost")" = 1
test ! -e "$base"
if getent passwd "$project" >/dev/null || docker container inspect "$project-postgres" >/dev/null 2>&1 ||
   docker network inspect "$project" >/dev/null 2>&1 || docker volume inspect "$project-postgres-data" >/dev/null 2>&1; then
    echo 'Public demo resources already exist. Review the prior installation before continuing.' >&2
    exit 1
fi
for unit in "$project-api" "$project-web"; do
    test ! -e "/etc/systemd/system/$unit.service"
done
for port in 4182 4183 5442; do
    if [[ -n "$(ss -H -ltn "sport = :$port")" ]]; then
        echo "Port $port is already occupied" >&2
        exit 1
    fi
done
image="$(docker inspect --format '{{.Image}}' torbat-man-postgres)"
docker image inspect "$image" >/dev/null
curl -fsS http://127.0.0.1:5000/api/health >/dev/null

cd "$release/api"
nice -n 15 env NODE_OPTIONS=--max-old-space-size=384 npm ci --omit=dev --ignore-scripts --no-audit --no-fund --maxsockets=4

install -d -m 0755 "$base"
useradd --system --home-dir "$base" --shell /usr/sbin/nologin "$project"
install -d -m 0700 -o "$project" -g "$project" "$base/uploads"
python3 - "$base" "$database" "$domain" <<'PY'
import os
from pathlib import Path
import secrets
import sys

base, database, domain = sys.argv[1:]
password = secrets.token_urlsafe(36)
configs = {
    'postgres.env': {
        'POSTGRES_USER': database,
        'POSTGRES_DB': database,
        'POSTGRES_PASSWORD': password,
    },
    'api.env': {
        'NODE_ENV': 'production',
        'APP_ENV': 'demo',
        'PUBLIC_DEMO': 'true',
        'HOST': '127.0.0.1',
        'PORT': '4183',
        'LOG_LEVEL': 'warn',
        'DATABASE_URL': f'postgresql://{database}:{password}@127.0.0.1:5442/{database}',
        'SESSION_SECRET': secrets.token_hex(32),
        'FILE_SIGNING_SECRET': secrets.token_hex(32),
        'COOKIE_SECURE': 'true',
        'OTP_DEV_ECHO': 'false',
        'APP_ORIGINS': f'https://{domain}',
        'STORAGE_DIR': f'{base}/uploads',
    },
}
os.umask(0o077)
for name, entries in configs.items():
    with (Path(base) / name).open('x') as file:
        file.writelines(f'{key}={value}\n' for key, value in entries.items())
PY

docker network create --label "project=$project" "$project" >/dev/null
docker volume create --label "project=$project" "$project-postgres-data" >/dev/null
docker run -d --pull never --name "$project-postgres" --label "project=$project" \
    --network "$project" --restart unless-stopped --cpus .25 --memory 256m --memory-swap 256m --pids-limit 128 \
    --env-file "$base/postgres.env" -p 127.0.0.1:5442:5432 \
    -v "$project-postgres-data:/var/lib/postgresql/data" \
    --health-cmd "pg_isready -h 127.0.0.1 -U $database -d $database" --health-interval 5s --health-retries 12 \
    "$image" -c shared_buffers=64MB -c max_connections=30 >/dev/null
for attempt in $(seq 1 30); do
    if docker exec "$project-postgres" pg_isready -h 127.0.0.1 -U "$database" -d "$database" >/dev/null 2>&1; then break; fi
    sleep 1
done
docker exec "$project-postgres" pg_isready -h 127.0.0.1 -U "$database" -d "$database"
(
    set -a
    source "$base/api.env"
    set +a
    /usr/bin/node dist/db/migrate-cli.js
    /usr/bin/node dist/seed/seed-cli.js
)
ln -s "$release" "$base/current"

cat > "/etc/systemd/system/$project-api.service" <<'UNIT'
[Unit]
Description=Torbatino public sandbox API
After=network.target docker.service
Requires=docker.service
[Service]
User=torbat-man-public
Group=torbat-man-public
WorkingDirectory=/opt/torbat-man/public-demo/current/api
EnvironmentFile=/opt/torbat-man/public-demo/api.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
InaccessiblePaths=/opt/torbat-man/shared
ReadWritePaths=/opt/torbat-man/public-demo/uploads
MemoryMax=384M
CPUQuota=50%
TasksMax=128
[Install]
WantedBy=multi-user.target
UNIT
cat > "/etc/systemd/system/$project-web.service" <<'UNIT'
[Unit]
Description=Torbatino public sandbox web
After=torbat-man-public-api.service
Requires=torbat-man-public-api.service
[Service]
User=torbat-man-public
Group=torbat-man-public
WorkingDirectory=/opt/torbat-man/public-demo/current/infra
Environment=PORT=4182
Environment=API_TARGET=http://127.0.0.1:4183
Environment=STATIC_DIR=/opt/torbat-man/public-demo/current/web
ExecStart=/usr/bin/node web-server.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
InaccessiblePaths=/opt/torbat-man/shared
MemoryMax=128M
CPUQuota=20%
TasksMax=64
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now "$project-api.service" "$project-web.service"
for attempt in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:4182/health >/dev/null 2>&1; then break; fi
    sleep 1
done
check_mode() {
    /usr/bin/node -e 'const health = JSON.parse(require("fs").readFileSync(0)); if (health.publicDemo !== true) process.exit(1)'
}
curl -fsS http://127.0.0.1:4182/health | check_mode
curl -fsS http://127.0.0.1:4182/v1/demo/accounts |
    /usr/bin/node -e 'const {data} = JSON.parse(require("fs").readFileSync(0)); if (!data.some(a => a.kind === "staff") || !data.some(a => a.kind === "citizen")) process.exit(1)'

# Roll back only this site's upstream if routing or the health check fails.
install -m 0600 "$vhost" "$base/vhost.before"
snapshot_other_configs() {
    find /etc/nginx/sites-enabled -maxdepth 1 ! -name "$domain.conf" \( -type f -o -type l \) -print0 |
        sort -z | xargs -0 -r sha256sum
}
other_configs="$(snapshot_other_configs)"
rollback() {
    status=$?
    if (( status != 0 )); then
        cat "$base/vhost.before" > "$vhost"
        nginx -t && systemctl reload nginx
    fi
}
trap rollback EXIT
python3 - "$vhost" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
config = path.read_text()
start, end = config.index('    # Demo codes'), config.index('    location / {\n        proxy_pass')
config = config[:start] + config[end:]
path.write_text(config.replace('proxy_pass http://127.0.0.1:4180;', 'proxy_pass http://127.0.0.1:4182;'))
PY
nginx -t
systemctl reload nginx
for attempt in $(seq 1 15); do
    if curl -fsS --resolve "$domain:443:127.0.0.1" "https://$domain/health" | check_mode 2>/dev/null; then break; fi
    sleep 1
done
curl -fsS --resolve "$domain:443:127.0.0.1" "https://$domain/health" | check_mode
test "$(snapshot_other_configs)" = "$other_configs"
curl -fsS http://127.0.0.1:5000/api/health >/dev/null
trap - EXIT
echo 'Public demo deployed. Other site configurations are unchanged.'
