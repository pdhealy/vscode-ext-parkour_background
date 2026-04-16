# Useful Commands

## Git

```bash
# Check status and staged changes
git status
git diff --stat

# Stage all changes and commit
git add -A
git commit -m "Your message"

# Push to remote
git push origin main

# Create and push an annotated tag
git tag -a v0.3.0 -m "Release message"
git push origin v0.3.0

# Create and push a lightweight working-state tag
git tag -a v-working -m "Working state snapshot"
git push origin v-working
```

## TypeScript / Build

```bash
# Compile TypeScript
npm run compile

# Watch mode (recompiles on file change)
npm run watch

# Lint source files
npm run lint

# Run full prepublish build (compile only, no tests)
npm run vscode:prepublish
```

## Testing

```bash
# Run extension tests (compiles first)
npm test
```

## Packaging & Publishing (vsce)

```bash
# Install vsce as a dev dependency
npm install --save-dev @vscode/vsce

# Build a .vsix package for local testing or publishing
# vsce is a local dev dependency — use npx (or node node_modules/.bin/vsce)
npx vsce package

# Publish to the VS Code Marketplace (requires a PAT)
npx vsce publish

# Publish with automatic version bump
npx vsce publish patch   # 0.3.0 → 0.3.1
npx vsce publish minor   # 0.3.0 → 0.4.0
npx vsce publish major   # 0.3.0 → 1.0.0

# Log in to vsce (needed before publishing)
npx vsce login paulhealydev
```

## Installing a Local .vsix

```bash
# Install via CLI
code --install-extension vscode-ext-parkour-background-0.3.0.vsix

# Or via Command Palette:
# Extensions: Install from VSIX... → select the .vsix file
```
