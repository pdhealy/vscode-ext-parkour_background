# Parkour Background

Enhance your coding environment with immersive **Parkour gameplay visuals**. This extension adds a semi-transparent Minecraft or Subway Surfers background to your VS Code editor—providing a modern, high-energy aesthetic while maintaining full code legibility.

![Parkour Background screenshot](https://raw.githubusercontent.com/pdhealy/vscode-ext-parkour_background/main/docs/screenshots/image.png)

## Overview

Parkour Background is designed for developers who enjoy the "vibes" of parkour gameplay clips. It intelligently patches the VS Code workbench to inject high-quality WebP visuals behind your code, creating a unique and personalized workspace.

## Features

- **Dynamic Themes:** Choose between curated **Minecraft** or **Subway Surfers** gameplay visuals.
- **Randomized Experience:** A new visual is randomly selected from a diverse pool each time a theme is enabled.
- **Optimized Legibility:** Visuals are rendered at low opacity behind the editor text, ensuring your code remains the primary focus.
- **One-Click Control:** Toggle visuals instantly via the **Command Palette** or the **Editor Context Menu**.
- **Granular Opacity:** Fine-tune the intensity (5%, 10%, 15%, or 25%) using the `Parkour Background: Set Opacity` command.
- **Persistent State:** Your chosen visual and opacity settings persist across VS Code restarts.

## Requirements

- **Visual Studio Code:** Version 1.85.0 or later.
- **System Permissions:** The extension requires write access to VS Code's internal files to inject the visuals. See [Security & Permissions](#security--permissions) for details.

## Installation

1. Install **Parkour Background** from the [VS Code Marketplace](https://marketplace.visualstudio.com).
2. Open the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Search for `Parkour Background: On` or `Parkour Background: Off` to activate or deactivate the background.

## Usage

### Toggling Visuals
You can enable or disable the visuals using two methods:
1. **Command Palette:** Search for the "Parkour Background: On" or "Parkour Background: Off" commands.
2. **Editor Context Menu:** Right-click anywhere inside the editor text area and select the "Enable/Disable" options.

*Note: VS Code will automatically reload to apply the changes after toggling.*

### Customizing Opacity
Adjust the visual intensity to suit your lighting environment:
1. Open the **Command Palette**.
2. Select `Parkour Background: Set Opacity`.
3. Choose from the available presets (Subtle to High).

## Uninstallation (Recommended Method)

To ensure that all workbench modifications are correctly reverted and the integrity checksums are restored, we **strongly recommend** using the built-in uninstall command rather than the standard Extensions GUI.

1. Open the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Type and select `Parkour Background: Uninstall`.
3. Confirm the uninstallation when prompted.

**Why use this command?** VS Code requires a window reload to fully disable the workbench patches. This command automates the cleanup, uninstalls the extension, and reloads the window in one seamless operation.

## Security & Permissions

This extension patches VS Code's `workbench.html` file to inject the required CSS.
- **Windows:** You may need to run VS Code as Administrator the first time you enable a visual.
- **macOS/Linux:** You may be prompted for your system password to authorize the file modification.
- **Integrity Checksum:** The extension automatically updates VS Code's internal checksums to prevent "Installation appears corrupt" warnings.

## Troubleshooting

- **Visuals not appearing:** Ensure you have reloaded the window. If the auto-reload fails, run `Developer: Reload Window` from the Command Palette.
- **Permission Errors:** If the extension fails to apply changes, verify that your user account has write permissions to the VS Code installation directory.
- **Checksum Warnings:** If you see an integrity warning, it indicates a permission failure during the checksum update. Follow the [Security & Permissions](#security--permissions) guidelines.

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `backgroundImage.activeTheme` | `string` | `"none"` | The currently active theme (`none`, `minecraft`, or `subwaysurfers`). |
| `backgroundImage.opacity` | `number` | `0.1` | The visual opacity level (0.05 to 0.25). |

---

**Enjoy your immersive parkour-powered coding environment! 🎮**
