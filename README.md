# Free Avatar Crop

A [SillyTavern](https://github.com/SillyTavern/SillyTavern) extension that removes the fixed **2:3** limit from the avatar crop popup, so you can use portrait, square or landscape images (9:16, 1:1, 16:9, ...) at full resolution for **characters, personas and groups**.

## Features
- **Aspect ratio dropdown** in the crop popup: Original (full image), Free, 2:3, 9:16, 3:4, 1:1, 4:3, 16:9.
- **Original** is the default, so the whole image is selected when the popup opens.
- **Keep full resolution (no resize)** option, so SillyTavern doesn't scale your crop down to its standard avatar size.
- Remembers your choices between sessions.
- Leaves any non-avatar crop popups untouched.

<img width="501" height="905" alt="image" src="https://github.com/user-attachments/assets/fef97aa0-97f6-49fc-9d60-f825b4d4121f" />

## Installation

### From inside SillyTavern (recommended)
1. Open the **Extensions** panel (puzzle-piece icon).
2. Click **Install extension**.
3. Paste: `https://github.com/serioos/Free-Avatar-Crop`
4. Click **Install just for me** (or for all users), then reload the page.

### Manual
Copy this folder into `SillyTavern/data/<your-user>/extensions/Free-Avatar-Crop` (usually `data/default-user/extensions/`), then restart SillyTavern.

## Usage
Upload or change an avatar as usual. In the crop popup, pick an aspect ratio from the dropdown above the image and tick or untick **Keep full resolution**.

## Notes and limitations
- Some SillyTavern versions may still force the saved file to 2:3 on the server regardless of the no-resize flag. If that happens, open an issue with your SillyTavern version. Turning on **Never resize avatars** in User Settings can also help.
- Avatars shown in fixed-shape frames (e.g. chat bubbles) may still be visually trimmed. This is display only; the stored file isn't changed.
- Works by wrapping the jQuery Cropper.js plugin that SillyTavern bundles. A future SillyTavern rewrite of the crop popup could require an update.

## License
[MIT](LICENSE)
