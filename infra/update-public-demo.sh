#!/usr/bin/env bash
# Update only the existing public Torbatino application.
set -euo pipefail
revision="${1:?Pass the full source commit SHA}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
base=/opt/torbat-man/public-demo
release="/opt/torbat-man/releases/$revision"
previous="$(readlink -f "$base/current")"
[[ "$previous" =~ ^/opt/torbat-man/releases/[a-f0-9]{40}$ ]]
test "$previous" != "$release"
test -f "$release/release.json"
grep -Fxq 'PUBLIC_DEMO=true' "$base/api.env"
grep -Fxq 'APP_ENV=demo' "$base/api.env"
exec 9>"$base/update.lock"
flock -n 9
cd "$release/api"
/usr/bin/node --input-type=module -e 'import {readFileSync} from "node:fs"; if(JSON.parse(readFileSync("../release.json")).commit!==process.argv[1])process.exit(2)' "$revision"
curl -fsS http://127.0.0.1:5000/api/health >/dev/null
configs="$(find /etc/nginx/sites-enabled -maxdepth 1 \( -type f -o -type l \) -print0 | sort -z | xargs -0 -r sha256sum)"
nice -n 15 env NODE_OPTIONS=--max-old-space-size=384 npm ci --omit=dev --ignore-scripts --no-audit --no-fund --maxsockets=4
umask 077
install -d -m 0700 "$base/backups"
backup="$(mktemp -d "$base/backups/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXXXX")"
switch_to() {
    ln -s "$1" "$base/current.next-$$"
    mv -Tf "$base/current.next-$$" "$base/current"
}
recover() {
    result=$?
    trap - EXIT
    if (( result != 0 )); then
        if [[ "$(readlink -f "$base/current")" != "$previous" ]]; then switch_to "$previous"; fi
        systemctl start torbat-man-public-api.service torbat-man-public-web.service
        echo 'Update failed. Previous release restored. Additive database schema retained.' >&2
    fi
    exit "$result"
}
trap recover EXIT
systemctl stop torbat-man-public-web.service torbat-man-public-api.service
docker exec torbat-man-public-postgres pg_dump -U torbat_public_demo -d torbat_public_demo -Fc > "$backup/database.dump"
docker exec -i torbat-man-public-postgres pg_restore --list < "$backup/database.dump" > "$backup/database.contents"
tar -C "$base" -czf "$backup/uploads.tar.gz" uploads
tar -tzf "$backup/uploads.tar.gz" >/dev/null
(cd "$backup" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
printf '%s\n' "$previous" > "$backup/release"
echo 'Database and uploads backup verified.'
(
    set -a
    source "$base/api.env"
    set +a
    /usr/bin/node dist/db/migrate-cli.js
    /usr/bin/node dist/seed/seed-cli.js
)
switch_to "$release"
systemctl start torbat-man-public-api.service torbat-man-public-web.service
for attempt in $(seq 1 30); do
    if curl -fsS --max-time 2 http://127.0.0.1:4182/health >/dev/null 2>&1; then break; fi
    sleep 1
done
curl -fsS --max-time 5 http://127.0.0.1:4182/health |
    /usr/bin/node -e 'if(JSON.parse(require("fs").readFileSync(0)).publicDemo!==true)process.exit(1)'
curl -fsS --max-time 10 http://127.0.0.1:4182/v1/nobatino/businesses >/dev/null
curl -fsS --max-time 5 http://127.0.0.1:4182/v1/services >/dev/null
test "$(find /etc/nginx/sites-enabled -maxdepth 1 \( -type f -o -type l \) -print0 | sort -z | xargs -0 -r sha256sum)" = "$configs"
curl -fsS http://127.0.0.1:5000/api/health >/dev/null
trap - EXIT
printf 'Public release active: %s\n' "$revision"
