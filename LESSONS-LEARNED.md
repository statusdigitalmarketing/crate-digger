# Lessons Learned: Crate Digger

> This file is READ at the start of every session and APPENDED TO whenever a mistake is made or a non-obvious pattern is discovered.
> It accumulates institutional knowledge across sessions. Never delete entries, only mark outdated ones.

---

<!-- New lessons are appended below this line -->

### Dependencies - 2026-11-18
- **MISTAKE**: `better-sqlite3@11` has no prebuilt binary for Node 26, so `npm ci` fell back to node-gyp and failed. Anyone downloading the app would have hit the same wall.
- **FIX**: Use Node's built-in `node:sqlite` (`DatabaseSync`), which has the same prepare/run/get/all/exec API. Requires Node 22.13+ (declared in `engines`). Do not reintroduce a native module into a distributed build.
- **CONTEXT**: Native addons break every time a user is on a Node version newer than the addon's prebuilds.
- **DETECTION**: `node -e "const p=require('./package.json');console.log(Object.keys({...p.dependencies}))"` and check each for `binding.gyp` in node_modules.

### Build - 2026-11-18
- **MISTAKE**: `src/classifier/spectral-mood.ts` loaded meyda and node-wav with `createRequire(import.meta.url)`. esbuild cannot see those, so the single-file bundle crashed with `Cannot find module 'meyda'`, but only when run outside the repo (tsc and all tests passed).
- **FIX**: Static `import` for every dependency, and always smoke-test the zip from an empty folder (`scripts/package-release.sh`, then unzip elsewhere and run an MCP handshake; CI does this).
- **CONTEXT**: Any `createRequire` or dynamic `require(variable)` is invisible to the bundler. `src/db/index.ts` keeps one only for the builtin `node:sqlite`.
- **DETECTION**: `grep -rn "createRequire\|require(" src | grep -v "node:sqlite"`

### API - 2026-11-18
- **MISTAKE**: Shipped 2.0.0 telling users to get a "free Musixmatch key". Musixmatch's developer signup is disabled ("Signup disabled"); the SIGNUP link goes to paid Pro API plans (from $49/mo). The claim came from third-party web pages, not from trying the signup. Genius alone gave no lyrics either: its API search works but its lyrics pages return a Cloudflare 403 to scripts.
- **FIX**: 2.1.0 tries LRCLIB first (https://lrclib.net, free, no key, full lyrics). Before telling users to sign up for anything, open the actual signup page.
- **CONTEXT**: The release had no working free lyrics path, which surfaced only when we tried to create keys for a user.
- **DETECTION**: Live check with no keys set: classify a known song and confirm `source.lyrics_found` is true.

### Process - 2026-11-18
- **MISTAKE**: Ran `npm test ...; git commit ...; git push` joined with `;`, so a failing test still got committed, pushed and sent to Codex review (LRCLIB 'Little Feat feat. Bonnie Raitt' case).
- **FIX**: Chain verification and shipping with `&&` (`npm run check && npm test && git commit ... && git push`) so a failure stops the push.
- **CONTEXT**: Every push here triggers a paid Codex review and CI.
- **DETECTION**: Before any push command, check that it is joined to the test run with `&&`.
