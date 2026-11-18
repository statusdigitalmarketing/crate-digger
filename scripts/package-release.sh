#!/usr/bin/env bash
# Builds release/crate-digger.zip: the single-file bundle plus README. No keys, no .env, no node_modules.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf release
npm run bundle
cp README.md release/crate-digger/README.md
if grep -RIl --exclude=README.md -E "(GENIUS|MUSIXMATCH)_API_KEY=[A-Za-z0-9]" release/; then
  echo "refusing to package: something looks like a real key" >&2; exit 1
fi
(cd release && zip -qr crate-digger.zip crate-digger)
unzip -l release/crate-digger.zip
