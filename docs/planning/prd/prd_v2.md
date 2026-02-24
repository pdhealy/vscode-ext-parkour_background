# Product Requirements Document (PRD)
## "Background Image" VSCode Extension

| Field       | Value                          |
|-------------|--------------------------------|
| Version     | 2.0                            |
| Status      | Draft                          |
| Date        | 2026-02-24                     |
| Predecessor | prd_v1.md                      |

---

## Table of Contents

1. [Overview & Purpose](#1-overview--purpose)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Target Audience](#3-target-audience)
4. [Feature Summary](#4-feature-summary)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Technical Specifications](#8-technical-specifications)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Edge Cases & Error Handling](#10-edge-cases--error-handling)
11. [Development Roadmap](#11-development-roadmap)
12. [Testing Strategy](#12-testing-strategy)
13. [Installation & Usage Guide](#13-installation--usage-guide)
14. [Troubleshooting](#14-troubleshooting)
15. [Support & Feedback](#15-support--feedback)

---

## 1. Overview & Purpose

**Background Image** is a Visual Studio Code extension that renders a semi-transparent cat image as the background of the active code editor window. It personalises the developer workspace by adding a subtle, visually appealing backdrop without interfering with code readability or editor functionality.

The extension is designed to be simple to install, trivial to toggle on/off, and completely non-intrusive — it must have no measurable impact on editor performance or workflow.

---

## 2. Goals & Non-Goals

### Goals
- Display a cat image at 70% transparency as the background of the active code editor window.
- Allow the user to enable and disable the background image through three interaction points: extension settings, Command Palette, and editor context menu.
- Restrict the background image to the code editor surface only (not the sidebar, terminal, panel, status bar, or any other VSCode UI area).
- Keep the extension lightweight: minimal resource usage and fast activation.
- Publish the extension on the Visual Studio Code Marketplace.
- Provide complete documentation: installation, usage, configuration, testing, and troubleshooting.

### Non-Goals
- Applying a background image to any VSCode UI area other than the code editor window.
- Supporting user-supplied or custom images in v1.0 (may be considered for a future release).
- Supporting background video or animated backgrounds.
- Modifying editor syntax highlighting, themes, or fonts.
- Supporting editors other than Visual Studio Code (e.g., VS Codium is stretch-goal only).

---

## 3. Target Audience

| Persona | Description |
|---------|-------------|
| Individual Developer | A developer who uses VSCode daily and wants to personalise their workspace for fun or aesthetic reasons. |
| Streamer / Content Creator | A developer who live-streams or records coding sessions and wants a visually distinctive workspace. |
| Workshop Instructor | An instructor who wants a distinctive-looking editor to make their screen easier for students to identify. |

**Primary persona:** Individual Developer seeking a lightweight, fun workspace personalisation with zero friction.

---

## 4. Feature Summary

| # | Feature | Priority |
|---|---------|----------|
| F-01 | Display cat background image in active editor | Must Have |
| F-02 | 70% image transparency (30% opacity) | Must Have |
| F-03 | Toggle via Command Palette | Must Have |
| F-04 | Toggle via extension settings | Must Have |
| F-05 | Toggle via editor context menu | Must Have |
| F-06 | Restrict image to editor window only | Must Have |
| F-07 | Persist toggle state across sessions | Should Have |
| F-08 | Graceful error handling (missing asset, unsupported API) | Must Have |
| F-09 | Marketplace publication with README and changelog | Must Have |
| F-10 | Support for light and dark VSCode themes | Should Have |

---

## 5. User Stories

### US-01 — Enable Background Image
> **As a** developer,  
> **I want to** enable a cat background image in my code editor,  
> **so that** I can personalise my workspace and add visual flair to my coding environment.

### US-02 — Disable Background Image
> **As a** developer,  
> **I want to** disable the cat background image with a single action,  
> **so that** I can quickly return to a clean, distraction-free editor when I need to focus.

### US-03 — Toggle via Command Palette
> **As a** developer,  
> **I want to** toggle the background image using the Command Palette,  
> **so that** I can control the extension without leaving my keyboard or navigating menus.

### US-04 — Toggle via Settings
> **As a** developer,  
> **I want to** enable or disable the background image through VSCode's extension settings panel,  
> **so that** I have a familiar, GUI-based control point consistent with how I manage other extensions.

### US-05 — Toggle via Context Menu
> **As a** developer,  
> **I want to** right-click in the editor to toggle the background image,  
> **so that** I can control it quickly with my mouse without opening any palettes or settings panels.

### US-06 — Editor-Only Background
> **As a** developer,  
> **I want the** background image to appear only in the code editor window,  
> **so that** my sidebar, terminal, and other VSCode panels remain visually clean and unaffected.

### US-07 — Persistent State
> **As a** developer,  
> **I want** my enabled/disabled preference to be remembered across VSCode sessions,  
> **so that** I don't have to re-configure the extension every time I open VSCode.

### US-08 — Performance Transparency
> **As a** developer,  
> **I want** the extension to have no noticeable impact on editor startup time or scrolling performance,  
> **so that** my coding experience is not degraded by enabling the extension.

---

## 6. Functional Requirements

### 6.1 Background Image Display (F-01, F-02)

- **FR-1.1** The extension SHALL display the bundled cat image as the background of the active code editor window.
- **FR-1.2** The image SHALL be rendered at 30% opacity (70% transparent), ensuring code text remains fully legible.
- **FR-1.3** The image SHALL be centred and cover the full editor content area (CSS `background-size: cover` or equivalent).
- **FR-1.4** The image SHALL be applied only when the extension is in the "enabled" state.
- **FR-1.5** The image SHALL update immediately (no reload required) when the toggle state changes.

### 6.2 Scope Restriction (F-06)

- **FR-2.1** The background image SHALL only appear in the code editor surface (`.monaco-editor` area).
- **FR-2.2** The background image SHALL NOT appear in: the Activity Bar, Primary Sidebar, Panel (terminal/output), Status Bar, editor tabs, breadcrumbs, minimap, or any overlay/modal.
- **FR-2.3** When a new editor tab is focused, the background SHALL apply to that editor; when an editor tab loses focus it SHALL retain or hide the background based on the active-window requirement.

### 6.3 Toggle — Command Palette (F-03)

- **FR-3.1** The extension SHALL register a command `backgroundImage.toggle` accessible from the Command Palette.
- **FR-3.2** The command label SHALL be `"Background Image: Toggle"`.
- **FR-3.3** Invoking the command SHALL switch the background between enabled and disabled states.
- **FR-3.4** A status notification (information message) SHALL be displayed confirming the new state (e.g., "Background image enabled." / "Background image disabled.").

### 6.4 Toggle — Extension Settings (F-04)

- **FR-4.1** The extension SHALL expose a boolean configuration property `backgroundImage.enabled` (default: `false`).
- **FR-4.2** Changing this setting in the Settings UI or `settings.json` SHALL immediately apply or remove the background image without requiring a reload.
- **FR-4.3** The setting SHALL support both User-scope and Workspace-scope configuration.

### 6.5 Toggle — Context Menu (F-05)

- **FR-5.1** The extension SHALL register a context menu item in the editor context menu (right-click).
- **FR-5.2** The menu item label SHALL dynamically reflect current state: `"Enable Background Image"` when disabled, `"Disable Background Image"` when enabled.
- **FR-5.3** Clicking the menu item SHALL toggle the state identically to the Command Palette command.

### 6.6 State Persistence (F-07)

- **FR-6.1** The enabled/disabled state SHALL be persisted using the `backgroundImage.enabled` workspace/user setting so it survives VSCode restarts.
- **FR-6.2** On extension activation, the stored state SHALL be read and applied before the first editor render where possible.

### 6.7 Asset Management (F-01)

- **FR-7.1** The cat image SHALL be bundled within the extension package (located at `assets/image.png` relative to the extension root).
- **FR-7.2** The extension SHALL NOT fetch any image from an external URL.
- **FR-7.3** The image path used at runtime SHALL be resolved using `vscode.Uri` / `context.extensionUri` to ensure correctness across all installation paths.

---

## 7. Non-Functional Requirements

### 7.1 Performance

- **NFR-1.1** Extension activation time SHALL be under 200 ms on a modern machine (measured from activation event to background applied).
- **NFR-1.2** Enabling/disabling the background image SHALL complete within 100 ms (perceived).
- **NFR-1.3** The extension SHALL not introduce visible frame drops during editor scrolling or typing.
- **NFR-1.4** Memory overhead introduced by the extension SHALL be less than 10 MB resident memory.

### 7.2 Compatibility

- **NFR-2.1** The extension SHALL target VSCode engine version `^1.85.0` or later.
- **NFR-2.2** The extension SHALL function correctly on Windows 10+, macOS 12+, and Ubuntu 20.04+.
- **NFR-2.3** The extension SHALL function with both light and dark built-in VSCode themes.
- **NFR-2.4** The extension SHALL not break when VSCode's custom CSS/JS injection (`vscode-custom-css`) is also active.

### 7.3 Accessibility

- **NFR-3.1** The background image SHALL not reduce the contrast of editor text below WCAG AA standards (contrast ratio ≥ 4.5:1 for normal text) given the 70% transparency level.
- **NFR-3.2** The extension SHALL not interfere with screen reader functionality.

### 7.4 Reliability

- **NFR-4.1** The extension SHALL handle a missing or corrupt asset file gracefully (see Section 10).
- **NFR-4.2** The extension SHALL not cause VSCode to crash or show error popups under any normal operating condition.

### 7.5 Security

- **NFR-5.1** The extension SHALL not request any permissions beyond those required to inject CSS into the editor webview.
- **NFR-5.2** No user data or telemetry SHALL be collected or transmitted.

---

## 8. Technical Specifications

### 8.1 Technology Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.x |
| Runtime | Node.js (VSCode bundled) |
| Extension API | VSCode Extension API (`vscode` npm package) |
| Bundler | `esbuild` or `webpack` (standard VSCode extension tooling) |
| Package Manager | npm |
| Test Framework | Mocha + `@vscode/test-electron` |

### 8.2 Extension Manifest (`package.json`) Key Fields

```json
{
  "name": "editor-background-image",
  "displayName": "Background Image",
  "description": "Adds a semi-transparent cat image as the background of your code editor.",
  "version": "0.1.0",
  "engines": { "vscode": "^1.85.0" },
  "activationEvents": ["onStartupFinished"],
  "contributes": {
    "commands": [
      {
        "command": "backgroundImage.toggle",
        "title": "Background Image: Toggle"
      }
    ],
    "configuration": {
      "title": "Background Image",
      "properties": {
        "backgroundImage.enabled": {
          "type": "boolean",
          "default": false,
          "description": "Enable or disable the cat background image in the code editor."
        }
      }
    },
    "menus": {
      "editor/context": [
        {
          "command": "backgroundImage.toggle",
          "group": "navigation"
        }
      ]
    }
  }
}
```

### 8.3 Asset Details

| Property | Value |
|----------|-------|
| File | `assets/image.png` |
| Location | Extension root: `<extensionUri>/assets/image.png` |
| Opacity applied | 30% (CSS: `opacity: 0.3`) |
| Background sizing | `cover`, centred |
| Format | PNG (supports transparency channel) |

### 8.4 Implementation Approach

The recommended implementation approach uses VSCode's `Webview` decoration or CSS injection mechanism:

1. **Activation:** On `onStartupFinished`, read `backgroundImage.enabled` from configuration.
2. **CSS injection:** Inject a `<style>` block into the editor DOM targeting `.monaco-editor .overflow-guard` or equivalent selector to set the `background-image` CSS property.
3. **Toggle:** On command/setting change, update or remove the injected style block.
4. **Asset URI:** Resolve the image as a `vscode.Uri` with `asWebviewUri` (if using webview) or as a local file URI for direct CSS injection.

> **Note:** CSS injection into VSCode's editor DOM may require use of the `vscode-custom-css` API or a similar workaround. The implementation team should evaluate whether VSCode's Extension API provides a supported injection point or whether the editor's underlying Electron/Chromium layer must be targeted. This decision should be documented in a separate Architecture Decision Record (ADR).

---

## 9. Acceptance Criteria

### AC-01: Background Image Displayed
- **Given** the extension is enabled  
- **When** a code file is open in the editor  
- **Then** the cat image is visible as the editor background at 30% opacity  
- **And** all code text remains fully legible

### AC-02: Background Image Hidden
- **Given** the extension is disabled  
- **When** a code file is open in the editor  
- **Then** no background image is visible and the editor appears as stock VSCode

### AC-03: Command Palette Toggle — Enable
- **Given** the extension is disabled  
- **When** the user opens the Command Palette and runs "Background Image: Toggle"  
- **Then** the background image appears immediately  
- **And** a notification reads "Background image enabled."

### AC-04: Command Palette Toggle — Disable
- **Given** the extension is enabled  
- **When** the user opens the Command Palette and runs "Background Image: Toggle"  
- **Then** the background image disappears immediately  
- **And** a notification reads "Background image disabled."

### AC-05: Settings Toggle
- **Given** the user opens Settings and searches for "Background Image"  
- **When** the user toggles `backgroundImage.enabled` to `true`  
- **Then** the background image is applied without reloading the window  
- **And** setting it back to `false` removes the background without reloading

### AC-06: Context Menu Toggle
- **Given** the user has a code editor open  
- **When** the user right-clicks in the editor  
- **Then** the context menu contains the appropriate "Enable/Disable Background Image" option  
- **And** clicking it toggles the state with the same effect as the Command Palette command

### AC-07: Editor-Only Scope
- **Given** the extension is enabled  
- **When** the user inspects the Activity Bar, Sidebar, Terminal, and Status Bar  
- **Then** none of those areas display the background image

### AC-08: State Persistence
- **Given** the user has enabled the background image  
- **When** the user closes and reopens VSCode  
- **Then** the background image is automatically applied on startup without user intervention

### AC-09: Performance
- **Given** the extension is installed and enabled  
- **When** the user opens a large file (>5,000 lines) and scrolls rapidly  
- **Then** no visible frame rate degradation is observed compared to a clean VSCode instance

---

## 10. Edge Cases & Error Handling

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| EC-01 | `assets/image.png` is missing from the installation | Extension logs a warning; background is silently skipped; a one-time error notification is shown: "Background Image: Asset not found. Please reinstall the extension." |
| EC-02 | `assets/image.png` is corrupt or unreadable | Same as EC-01 |
| EC-03 | VSCode API version does not support the injection mechanism | Extension activates but background is not applied; a one-time warning is shown: "Background Image: Not supported on this version of VSCode (requires ≥1.85.0)." |
| EC-04 | Multiple editor windows open simultaneously | Background is applied to the active editor only; other editors reflect their own state according to the shared setting |
| EC-05 | User switches between light and dark themes | Background image remains visible and opacity is preserved; no visual artefacts |
| EC-06 | Extension is disabled from the Extensions panel (not via toggle) | VSCode deactivates the extension; background is removed as part of the deactivation lifecycle |
| EC-07 | `backgroundImage.enabled` is set in both User and Workspace settings | Workspace setting takes precedence (standard VSCode settings resolution order) |
| EC-08 | VSCode is running in a Remote (SSH/Dev Container/WSL) context | Extension activates; asset URI is resolved relative to extension host; behaviour is identical to local |
| EC-09 | Editor is opened with no file (e.g., Untitled tab) | Background image is applied to untitled editors the same as named files |
| EC-10 | User resizes the VSCode window | Background image scales correctly; no distortion or tiling artefacts |

---

## 11. Development Roadmap

### Phase 1 — Foundation (v0.1.0)
- Project scaffolding with `yo code` (TypeScript template)
- Bundle cat image asset at `assets/image.png`
- Implement CSS injection mechanism targeting the editor background
- Implement `backgroundImage.toggle` command (Command Palette)
- Implement `backgroundImage.enabled` configuration setting
- Basic activation/deactivation lifecycle

### Phase 2 — Full Feature Parity (v0.2.0)
- Implement editor context menu entry with dynamic label
- Implement state persistence via settings read/write
- Implement change listener for `backgroundImage.enabled` (live update on settings change)
- Confirm editor-only scope (no bleed into sidebar/terminal)
- Handle all edge cases defined in Section 10

### Phase 3 — Quality & Polish (v0.3.0)
- Write unit and integration tests (Mocha + `@vscode/test-electron`)
- Performance profiling and optimisation
- Verify WCAG AA contrast compliance at 30% opacity
- Cross-platform testing (Windows, macOS, Linux)
- Complete README, CHANGELOG, and Marketplace assets (icon, banner)

### Phase 4 — Marketplace Release (v1.0.0)
- Final review and sign-off
- Publish to Visual Studio Code Marketplace via `vsce publish`
- Tag v1.0.0 release in version control

### Future Considerations (Post v1.0.0)
- Allow users to supply a custom background image
- Support multiple images with a rotation/slideshow mode
- Add opacity control slider in settings
- Consider VS Codium compatibility

---

## 12. Testing Strategy

### 12.1 Development Environment Setup

1. Clone the extension repository to your local machine.
2. Open the repository root folder in Visual Studio Code.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Compile the TypeScript source:
   ```bash
   npm run compile
   ```
5. Press `F5` (or run **Run > Start Debugging**) to launch the **Extension Development Host** — a new VSCode window with the extension loaded.

### 12.2 Manual Test Cases

| TC | Action | Expected Result | Pass/Fail |
|----|--------|-----------------|-----------|
| TC-01 | Open Command Palette → run "Background Image: Toggle" (extension starts disabled) | Cat image appears as editor background at ~30% opacity | |
| TC-02 | Run "Background Image: Toggle" again | Background image disappears | |
| TC-03 | Open Settings, set `backgroundImage.enabled` to `true` | Background image appears without window reload | |
| TC-04 | Set `backgroundImage.enabled` to `false` | Background image disappears without window reload | |
| TC-05 | Right-click in editor (extension disabled) | Context menu shows "Enable Background Image" | |
| TC-06 | Click "Enable Background Image" in context menu | Background image appears; menu item label changes | |
| TC-07 | Inspect Activity Bar, Sidebar, Terminal, Status Bar with extension enabled | No background image visible in any of those areas | |
| TC-08 | Enable background, close VSCode, reopen VSCode | Background image is applied automatically on startup | |
| TC-09 | Remove `assets/image.png`, enable extension | Error notification shown; editor remains functional | |
| TC-10 | Open a large file (5,000+ lines), scroll rapidly | No perceptible performance degradation | |
| TC-11 | Switch VSCode theme (light ↔ dark) with extension enabled | Background image persists correctly with no visual glitches | |
| TC-12 | Open multiple editor tabs, switch between them | Background applies to the active editor as expected | |

### 12.3 Automated Tests

Automated tests SHALL be placed in `src/test/` and run via:
```bash
npm test
```

Minimum automated test coverage:
- Extension activates without errors
- `backgroundImage.toggle` command is registered
- `backgroundImage.enabled` configuration property exists with correct default
- Toggling the command updates the setting state
- Context menu item is registered

---

## 13. Installation & Usage Guide

### 13.1 Installing from the Marketplace

1. Open Visual Studio Code.
2. Go to the **Extensions** view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **"Background Image"**.
4. Click **Install** on the extension by the listed publisher.
5. The extension is ready to use immediately — no reload required.

### 13.2 Enabling the Background Image

**Option A — Command Palette:**
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Type `Background Image: Toggle` and press `Enter`.

**Option B — Settings:**
1. Open Settings (`Ctrl+,` / `Cmd+,`).
2. Search for `Background Image`.
3. Check the **Background Image: Enabled** checkbox.

**Option C — Context Menu:**
1. Right-click anywhere in an open code editor.
2. Select **Enable Background Image** from the context menu.

### 13.3 Disabling the Background Image

Use any of the three methods above. The Command Palette command and context menu item act as toggles; the Settings checkbox can be unchecked directly.

### 13.4 Configuration Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `backgroundImage.enabled` | `boolean` | `false` | Enables or disables the cat background image in the code editor. |

---

## 14. Troubleshooting

### Background image does not appear after enabling
- Ensure the extension is installed and not disabled in the Extensions panel.
- Check the **Output** panel (View → Output → select "Background Image") for error messages.
- Verify that `assets/image.png` exists in the extension installation directory.
- Try reloading the window (`Ctrl+Shift+P` → "Developer: Reload Window").

### Background image appears in areas other than the editor
- This is a known limitation if the injection selector is too broad. Report it via the issue tracker (see Section 15).

### Extension causes VSCode to feel slow
- Disable the extension and check if performance improves.
- Report the issue with your machine specs and VSCode version (see Section 15).

### Context menu item missing
- Ensure VSCode is up to date (version ≥ 1.85.0).
- Right-click must be performed inside the editor text area (not on the tab bar or scrollbar).

### Error: "Background Image: Asset not found"
- Reinstall the extension from the Marketplace.
- If the issue persists, file a bug report (see Section 15).

### Setting change does not apply immediately
- Confirm you are editing the correct scope (User vs. Workspace).
- If the setting is overridden at Workspace scope, ensure there is no conflicting value in `.vscode/settings.json`.

---

## 15. Support & Feedback

| Channel | Details |
|---------|---------|
| Bug Reports | Open an issue on the extension's GitHub repository issue tracker |
| Feature Requests | Open a GitHub issue with the label `enhancement` |
| Marketplace Reviews | Leave a review on the Visual Studio Code Marketplace extension page |
| General Questions | Use the GitHub Discussions tab on the repository |

When filing a bug report, please include:
- VSCode version (`Help → About`)
- Operating system and version
- Extension version
- Steps to reproduce the issue
- Expected vs. actual behaviour
- Any relevant output from the **Output** panel or **Developer Tools** console (`Help → Toggle Developer Tools`)

---

*End of Document*
