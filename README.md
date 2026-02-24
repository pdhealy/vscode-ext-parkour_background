# Background Image

Add a semi-transparent cat image as the background of your VS Code editor — a fun, lightweight way to personalise your coding environment.

![Background Image preview](assets/image.png)

## Features

- 🐱 Displays a cat image at 30% opacity behind your editor text
- ✅ Code remains fully legible — only the background is faded
- ⚡ Toggle on/off instantly via three methods:
  - **Command Palette** (`Ctrl+Shift+P` → `Background Image: Toggle`)
  - **Settings** (`backgroundImage.enabled`)
  - **Editor context menu** (right-click in the editor)
- 💾 Your preference is remembered across VS Code sessions
- 🎯 Background appears in the code editor only — sidebar, terminal, and status bar are unaffected

## Requirements

Visual Studio Code version 1.85.0 or later. No additional extensions required.

> **Note:** To inject the background image, this extension patches VSCode's workbench HTML file. As a result, VSCode will display an **"installation appears corrupt"** warning badge in the title bar. This is expected, harmless, and can be permanently dismissed by clicking **"Don't Show Again"** on the notification. On Linux and macOS, VSCode may need to be run with elevated permissions the first time the background is enabled (see [Troubleshooting](#troubleshooting)).

## Installation

1. Install **Background Image** from the [VS Code Marketplace](https://marketplace.visualstudio.com).
2. Enable the background image using any of the methods below.

## Usage

### Enable / Disable

**Option A — Command Palette**
1. Press `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
2. Type `Background Image: Toggle` and press `Enter`

**Option B — Settings**
1. Open Settings (`Ctrl+,`)
2. Search for `Background Image`
3. Tick or untick **Background Image: Enabled**

**Option C — Context Menu**
1. Right-click anywhere inside the code editor
2. Select **Enable Background Image** or **Disable Background Image**

After toggling, VS Code will prompt you to **Reload Now** to apply the change.

## Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `backgroundImage.enabled` | `boolean` | `false` | Enable or disable the cat background image in the code editor. |

## Troubleshooting

**Background image does not appear after enabling**
- VS Code reloads automatically after toggling (click **Reload Now** in the notification). If it doesn't reload, run `Ctrl+Shift+P` → **Developer: Reload Window**.
- On Linux/macOS, if you see a permission error, try running VS Code with `sudo code --no-sandbox` once to apply the patch, then restart normally.

**"Installation appears corrupt" warning**
- This is expected. The extension injects CSS into VS Code's editor, which triggers VS Code's integrity check. Click **"Don't Show Again"** to permanently dismiss the notification.
- To fully suppress the warning (optional), run the following once in a terminal with `sudo`:
  ```bash
  sudo python3 -c "
  import hashlib, base64, json
  html = open('/usr/share/code/resources/app/out/vs/code/electron-browser/workbench/workbench.html','rb').read()
  sha = base64.b64encode(hashlib.sha256(html).digest()).decode()
  p = json.load(open('/usr/share/code/resources/app/product.json'))
  p['checksums']['vs/code/electron-browser/workbench/workbench.html'] = sha
  json.dump(p, open('/usr/share/code/resources/app/product.json','w'), indent=chr(9))
  print('Checksum updated.')
  "
  ```

**Context menu item is missing**
- Right-click must be performed inside the editor text area, not on the tab bar or scrollbar.
- Ensure VS Code is version 1.85.0 or later.

**Setting change does not apply immediately**
- Confirm you are not overriding the setting at both User and Workspace scope. Workspace settings take precedence.

## Known Limitations

- The "installation appears corrupt" warning in the title bar cannot be avoided — it is triggered whenever VSCode's core files are modified, which is required for background image injection.
- The background image is the same for all users (custom images are not supported in this version).

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for the full change history.

---

**Enjoy your cat-powered coding environment! 🐱**
