# Changelog

All notable changes to the "Background Image" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-27

### Added
- MIT LICENSE file
- Marketplace metadata: `license`, `homepage`, `bugs`, and `galleryBanner` fields in `package.json`

### Changed
- Screenshot added to README for marketplace listing

### Removed
- Debug `console.log` statements removed from extension activation
- Unused module-level `_context` variable removed
- `assets/tmp/` (development scratch files) excluded from published package via `.vscodeignore`

## [0.2.0] - 2026-02-24

### Added
- Editor context menu entry with dynamic label ("Enable / Disable Background Image")
- State persistence via `backgroundImage.enabled` setting (survives VS Code restarts)
- Live configuration change listener — toggling the setting applies immediately without requiring manual reload
- `extensionDependencies` declaration: VS Code now automatically installs the required "Custom CSS and JS Loader" extension
- Informational message on toggle explaining the expected "corrupt installation" warning

### Fixed
- CSS background opacity now correctly applies only to the background image (via `::before` pseudo-element), not to editor text
- CSS is now injected by patching VSCode's workbench HTML directly (no third-party extension required)
- The background image is embedded as a base64 data URI, avoiding file URI and CSP issues

## [0.1.0] - Initial Release

### Added
- Cat background image displayed at 30% opacity in the active code editor window
- Toggle via Command Palette (`Background Image: Toggle`)
- Toggle via VS Code Settings (`backgroundImage.enabled`)
- Background scoped to `.monaco-editor .overflow-guard` — sidebar, terminal, and status bar are unaffected
- Asset bundled at `assets/image.png`
- Missing asset error handling
- Deactivation cleanup (removes CSS import on extension disable)
