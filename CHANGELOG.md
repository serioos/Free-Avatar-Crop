# Changelog

## 1.1.0
- Settings now saved in SillyTavern's own extension settings (falls back to localStorage on older builds).
- Only overrides croppers that use the default 2:3 avatar ratio, leaving other crop popups alone.
- Retries loading if Cropper.js isn't ready yet instead of failing silently.
- Validates saved settings, adds accessible label/ID wiring to the toolbar.
- Added README, LICENSE and `auto_update` in the manifest.

## 1.0.0
- Initial release: aspect ratio selector and "keep full resolution" option in the avatar crop popup.
