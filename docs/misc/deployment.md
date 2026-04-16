# VS Code Marketplace — Deployment Guide

Extension: **Parkour Background** (`vscode-ext-parkour-background`)
Publisher: `paulhealydev`

---

## Pre-Publish Checklist

### package.json — Required Fields
- [x] `name` — unique, lowercase, hyphenated (no spaces)
- [x] `displayName` — human-readable name shown on marketplace
- [x] `description` — short summary (appears in search results)
- [x] `version` — semantic versioning (`MAJOR.MINOR.PATCH`)
- [x] `publisher` — must **exactly match** your marketplace publisher account ID (alphanumeric + hyphens only, **no dots**)
- [x] `engines.vscode` — minimum VS Code version supported
- [x] `categories` — e.g. `"Themes"`, `"Other"`
- [x] `keywords` — improves discoverability in marketplace search
- [x] `repository` — GitHub repo URL
- [x] `license` — e.g. `"MIT"`
- [x] `homepage` — links to README on GitHub
- [x] `bugs.url` — links to GitHub Issues
- [x] `galleryBanner` — marketplace page banner (`color` + `"dark"` or `"light"` theme)
- [x] `author.name` / `author.url` — display name and website
- [ ] `icon` — 128×128 PNG, referenced as a relative path (e.g. `"assets/icon.png"`) — **not yet added**

### package.json — Publisher ID Note
> The `publisher` field must match your registered publisher ID at
> https://marketplace.visualstudio.com/manage.
> Publisher IDs only allow **alphanumeric characters and hyphens** — dots are not valid.
> This extension uses `paulhealydev` (not `paulhealy.dev`).

### Files & Assets
- [x] `LICENSE` file present in repo root
- [x] `README.md` — clear overview, features, usage, settings, troubleshooting, screenshot
- [x] `CHANGELOG.md` — version history in Keep-a-Changelog format
- [x] Screenshot referenced in README via GitHub raw URL (survives `.vscodeignore`)
- [x] `assets/tmp/` excluded from package via `.vscodeignore`
- [x] `out/test/` should be added to `.vscodeignore` before marketplace publish (test output not needed in package)
- [x] `docs/` excluded from package via `.vscodeignore`
- [x] `src/` excluded from package via `.vscodeignore`
- [x] `node_modules/` excluded from package via `.vscodeignore`

### Code Quality
- [x] No debug `console.log` statements in production code
- [x] No unused variables (removed `_context` module-level variable)
- [x] TypeScript compiles cleanly with `npm run compile`
- [x] Tests pass with `npm test`

---

## Step-by-Step Publishing Process

### 1. Create a Publisher Account
1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with a Microsoft account
3. Create a publisher with ID **`paulhealydev`**

### 2. Create a Personal Access Token (PAT)
1. Go to https://dev.azure.com → your organisation → **User Settings → Personal Access Tokens**
2. Create a new token:
   - **Organisation:** All accessible organisations
   - **Scope:** Marketplace → **Manage**
3. Copy and save the token securely — it is shown only once

### 3. Install vsce
```bash
# Already installed as a dev dependency — use npx or the local bin path:
npx vsce --version
# equivalent: npx vsce --version

# To install globally instead (requires sudo / admin):
npm install -g @vscode/vsce
# Then plain `vsce` commands work from anywhere
```

> **Note:** `vsce` is a local dev dependency in this project. Use `npx vsce <cmd>` rather than
> plain `vsce <cmd>` to avoid "command not found".

### 4. Log in to vsce
```bash
npx vsce login paulhealydev
# Paste your PAT when prompted
```

### 5. Build the .vsix Package (local test / dry run)
```bash
npx vsce package
# Produces: vscode-ext-parkour-background-0.3.0.vsix
```

#### Example Output
```markdown
$ npx vsce package
Executing prepublish script 'npm run vscode:prepublish'...

> vscode-ext-parkour-background@0.3.0 vscode:prepublish
> npm run compile


> vscode-ext-parkour-background@0.3.0 compile
> node node_modules/typescript/bin/tsc -p ./

 INFO  Files included in the VSIX:
vscode-ext-parkour-background-0.3.0.vsix
├─ [Content_Types].xml 
├─ extension.vsixmanifest 
└─ extension/
   ├─ .gitignore [0.31 KB]
   ├─ LICENSE.txt [1.04 KB]
   ├─ changelog.md 
   ├─ package.json [3.67 KB]
   ├─ readme.md 
   ├─ tsconfig.json [0.35 KB]
   ├─ assets/
   │  ├─ minecraft/
   │  │  ├─ 000.webp [2.79 MB]
   │  │  ├─ 001.webp [3.59 MB]
   │  │  ├─ 002.webp [2.51 MB]
   │  │  ├─ 003.webp [4.12 MB]
   │  │  ├─ 004.webp [3.69 MB]
   │  │  ├─ 005.webp [2.3 MB]
   │  │  └─ 006.webp [3.7 MB]
   │  └─ subwaysurfers/
   │     ├─ 000.webp [2.79 MB]
   │     └─ 002.webp [36.47 KB]
   └─ out/
      ├─ extension.js [11.63 KB]
      └─ extension.js.map [8.5 KB]

DONE  Packaged: /home/dev/Shared/Developer/Private/dev_projects/vscode/extensions/editor_background_image/vscode-ext-parkour-background-0.3.0.vsix (19 files, 25.41 MB)
```

### 6. Install Locally for Final Testing
```bash
code --install-extension vscode-ext-parkour-background-0.3.0.vsix
# Or: Command Palette → Extensions: Install from VSIX...
```

### 7. Publish to Marketplace
```bash
npx vsce publish
```
Or publish a specific `.vsix`:
```bash
npx vsce publish --packagePath vscode-ext-parkour-background-0.3.0.vsix
```

### 8. Verify on Marketplace
- Visit: https://marketplace.visualstudio.com/items?itemName=paulhealydev.vscode-ext-parkour-background
- Check listing appearance, icon, README rendering, and screenshots

---

## Versioning

Follow [Semantic Versioning](https://semver.org):

| Change type | Version bump | Example |
|-------------|-------------|---------|
| Bug fixes | PATCH | `0.3.0` → `0.3.1` |
| New features (backwards-compatible) | MINOR | `0.3.0` → `0.4.0` |
| Breaking changes | MAJOR | `0.3.0` → `1.0.0` |

Always update `CHANGELOG.md` and bump `version` in `package.json` before publishing.

To publish with an automatic version bump:
```bash
npx vsce publish patch   # 0.3.0 → 0.3.1
npx vsce publish minor   # 0.3.0 → 0.4.0
npx vsce publish major   # 0.3.0 → 1.0.0
```

---

## Outstanding Before First Publish

| # | Item | Notes |
|---|------|-------|
| 1 | **Add extension icon** | 128×128 PNG at `assets/icon.png`; add `"icon": "assets/icon.png"` to `package.json` |
| 2 | **Exclude test output** | Add `out/test/` to `.vscodeignore` |
| 3 | **Create publisher account** | Register `paulhealydev` at marketplace.visualstudio.com |
| 4 | **Create PAT** | Scoped to Marketplace → Manage in Azure DevOps |
| 5 | **Run `npx vsce package` dry run** | Verify file list and total size before publishing |
| 6 | **Test the .vsix locally** | Install and smoke-test all three commands + opacity picker |
