# Parkour Background

Add a semi-transparent Minecraft or Subway Surfers background image to your VS Code editor — a fun, lightweight way to personalise your coding environment.

![Parkour Background screenshot](https://raw.githubusercontent.com/pdhealy/vscode-ext-parkour_background/main/docs/screenshots/image.png)

## Features

- 🎮 Choose between **Minecraft** or **Subway Surfers** background themes
- 🖼️ Background is randomly selected from a pool of images each time you toggle it on
- ✅ Code remains fully legible — background is rendered behind editor text at low opacity
- ⚡ Toggle on/off via **Command Palette** or **editor context menu**
- 🎚️ Adjustable opacity (5% / 10% / 15% / 25%) via `Parkour Background: Set Opacity`
- 🔄 Background persists across VS Code restarts — toggle off and on to pick a new random image

## Requirements

Visual Studio Code version 1.85.0 or later. No additional extensions required.

> **Note:** This extension patches VS Code's workbench HTML file to inject the background image. On first use it may request administrator credentials to update VS Code's integrity checksum (so the install is not flagged as corrupt). On **Windows**, run VS Code as Administrator the first time you enable a background. On **Linux**, you may be prompted for your password to authorize the change.

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

After toggling, VS Code will reload automatically to apply the change. The background persists across restarts.

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
- VS Code reloads automatically after toggling. If it doesn't, run `Ctrl+Shift+P` → **Developer: Reload Window**.
- **macOS:** If you see a permission error, enter your password when prompted, or run `sudo chown -R $(whoami) "/Applications/Visual Studio Code.app"` in Terminal.
- **Windows:** Right-click the VS Code shortcut and select **Run as administrator**, enable the background, then relaunch normally.
- **Linux:** Enter your password when prompted by Polkit or the system authorization dialog.

**"Installation appears corrupt" warning**
- The extension updates VS Code's integrity checksum automatically when patching. If this warning appears, it means the checksum could not be written — follow the platform-specific permission steps above.

**Context menu item is missing**
- Right-click must be performed inside the editor text area, not on the tab bar or scrollbar.
- Ensure VSCode is version 1.85.0 or later.

## Known Limitations

- Per-window background control is not possible — VS Code's workbench HTML is a single shared file, so the background applies to all windows when enabled.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full change history.

---

**Enjoy your parkour-powered coding environment! 🎮**
