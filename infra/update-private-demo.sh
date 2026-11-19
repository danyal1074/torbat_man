#!/usr/bin/env bash
# Update an existing private deployment from a verified, extracted release.
set -euo pipefail
revision="${1:?Pass the full source commit SHA}"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 2
base=/opt/torbat-man
release="$base/releases/$revision"
previous="$(readlink -f "$base/current")"
[[ "$previous" =~ ^/opt/torbat-man/releases/[a-f0-9]{40}$ ]]
test "$previous" != "$release"
test "$(realpath "$release")" = "$release"
test -d "$previous/api"
cd "$release/api"
node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const manifest = JSON.parse(readFileSync("../release.json", "utf8"));
  if (manifest.commit !== process.argv[1] || manifest.environment !== "private-demo") process.exit(2);
' "$revision"

exec 9>"$base/shared/update.lock"
flock -n 9
grep -Fxq 'APP_ENV=demo' "$base/shared/api.env"
nice -n 15 env NODE_OPTIONS=--max-old-space-size=384 npm ci --omit=dev --ignore-scripts --no-audit --no-fund --maxsockets=4
node --input-type=module -e 'import sharp from "sharp"; await sharp({create:{width:2,height:2,channels:3,background:"#fff"}}).webp().toBuffer();'

umask 077
backup_root="$base/shared/backups"
install -d -m 0700 "$backup_root"
backup="$(mktemp -d "$backup_root/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXXXX")"
switch_to() {
  ln -s "$1" "$base/.current-update-$$"
  mv -Tf "$base/.current-update-$$" "$base/current"
}
recover_on_error() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    echo 'Update failed; restarting the previous application release.' >&2
    if [ "$(readlink -f "$base/current")" != "$previous" ]; then switch_to "$previous"; fi
    systemctl restart torbat-man-api.service torbat-man-web.service
  fi
  exit "$result"
}
trap recover_on_error EXIT

systemctl stop torbat-man-web.service torbat-man-api.service
docker exec torbat-man-postgres pg_dump -U torbat -d torbat -Fc > "$backup/database.dump"
docker exec -i torbat-man-postgres pg_restore --list < "$backup/database.dump" > "$backup/database.contents"
tar -C "$base/shared" -czf "$backup/uploads.tar.gz" uploads
tar -tzf "$backup/uploads.tar.gz" >/dev/null
(cd "$backup" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
printf '%s\n' "$previous" > "$backup/release"
printf 'Verified backup: %s\n' "$backup"

(
  set -a
  source "$base/shared/api.env"
  set +a
  /usr/bin/node dist/db/migrate-cli.js
  /usr/bin/node dist/seed/seed-cli.js
)
switch_to "$release"
systemctl start torbat-man-api.service torbat-man-web.service
for attempt in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:4180/health >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS --max-time 5 http://127.0.0.1:4180/health
curl -fsS --max-time 5 http://127.0.0.1:4180/v1/services >/dev/null
trap - EXIT
printf '\nPrivate release active: %s\n' "$revision"
