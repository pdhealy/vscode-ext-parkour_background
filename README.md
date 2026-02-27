# Parkour Background

Add a semi-transparent Minecraft or Subway Surfers background image to your VS Code editor — a fun, lightweight way to personalise your coding environment.

## Features

- 🎮 Choose between **Minecraft** or **Subway Surfers** background themes
- 🖼️ Background is randomly selected from a pool of images each time you toggle it on
- ✅ Code remains fully legible — background is rendered behind editor text at low opacity
- ⚡ Toggle on/off via **Command Palette** or **editor context menu**
- 🎚️ Adjustable opacity (5% / 10% / 15% / 25%) via `Parkour Background: Set Opacity`
- 🔄 Background resets to default on every VSCode restart — re-toggle to apply

## Requirements

Visual Studio Code version 1.85.0 or later. No additional extensions required.

> **Note:** To inject the background image, this extension patches VSCode's workbench HTML file. As a result, VSCode will display an **"installation appears corrupt"** warning badge in the title bar. This is expected, harmless, and can be permanently dismissed by clicking **"Don't Show Again"** on the notification. On Linux and macOS, VSCode may need to be run with elevated permissions the first time the background is enabled (see [Troubleshooting](#troubleshooting)).

## Installation

1. Install **Parkour Background** from the [VS Code Marketplace](https://marketplace.visualstudio.com).
2. Enable a background theme using the Command Palette (see Usage below).

## Usage

### Toggle Background On/Off

**Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`):
- `Parkour Background (Minecraft): Toggle On/Off`
- `Parkour Background (Subway Surfers): Toggle On/Off`

**Editor Context Menu** (right-click inside the editor):
- **Enable / Disable Parkour Background (Minecraft)**
- **Enable / Disable Parkour Background (Subway Surfers)**

After toggling, VSCode will reload automatically to apply the change.

> The background resets to default on every VSCode restart. Toggle it on again after reloading.

### Set Opacity

**Command Palette** → `Parkour Background: Set Opacity`

Choose from:
| Option | Opacity |
|--------|---------|
| 5% — Subtle | Very faint |
| 10% — Low | Barely noticeable |
| 15% — Default | Balanced |
| 25% — High | Clearly visible |

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `backgroundImage.activeTheme` | `string` | `"none"` | Active theme: `"none"`, `"minecraft"`, or `"subwaysurfers"`. |

## Troubleshooting

**Background image does not appear after enabling**
- VSCode reloads automatically after toggling. If it doesn't reload, run `Ctrl+Shift+P` → **Developer: Reload Window**.
- On Linux/macOS, if you see a permission error, try running VSCode with `sudo code --no-sandbox` once to apply the patch, then restart normally.

**"Installation appears corrupt" warning**
- This is expected. The extension injects CSS into VSCode's workbench, which triggers VSCode's integrity check. Click **"Don't Show Again"** to permanently dismiss the notification.

**Context menu item is missing**
- Right-click must be performed inside the editor text area, not on the tab bar or scrollbar.
- Ensure VSCode is version 1.85.0 or later.

## Known Limitations

- The "installation appears corrupt" warning cannot be avoided — it is triggered whenever VSCode's core files are modified.
- The background image resets on every VSCode restart by design.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full change history.

---

**Enjoy your parkour-powered coding environment! 🎮**
