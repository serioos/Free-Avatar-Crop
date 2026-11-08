/**
 * Free Avatar Crop - SillyTavern extension
 * https://github.com/serioos/Free-Avatar-Crop
 *
 * Unlocks the avatar crop popup (characters, personas, groups) from its fixed
 * 2:3 aspect ratio. Adds an aspect ratio selector and an option to keep the
 * cropped image at full resolution instead of resizing it.
 */
(function () {
    'use strict';

    const LOG = '[Free Avatar Crop]';
    const SETTINGS_KEY = 'freeAvatarCrop';
    const LEGACY_STORAGE_KEY = 'free_avatar_crop_settings';
    const DEFAULT_RATIO = 2 / 3;
    const RATIO_TOLERANCE = 0.01;
    const MAX_INSTALL_WAIT_MS = 15000;

    const DEFAULTS = Object.freeze({ ratio: 'original', keepFull: true });

    const RATIOS = [
        { id: 'original', label: 'Original (full image)' },
        { id: 'free', label: 'Free' },
        { id: '2:3', label: '2:3 (default)', value: 2 / 3 },
        { id: '9:16', label: '9:16', value: 9 / 16 },
        { id: '3:4', label: '3:4', value: 3 / 4 },
        { id: '1:1', label: '1:1', value: 1 },
        { id: '4:3', label: '4:3', value: 4 / 3 },
        { id: '16:9', label: '16:9', value: 16 / 9 },
    ];
    const VALID_IDS = new Set(RATIOS.map(r => r.id));

    let uid = 0;

    // ---------------------------------------------------------------- settings

    function getContext() {
        try {
            const ctx = window.SillyTavern?.getContext?.();
            return ctx && ctx.extensionSettings ? ctx : null;
        } catch {
            return null;
        }
    }

    function sanitize(raw) {
        const s = raw && typeof raw === 'object' ? raw : {};
        return {
            ratio: VALID_IDS.has(s.ratio) ? s.ratio : DEFAULTS.ratio,
            keepFull: typeof s.keepFull === 'boolean' ? s.keepFull : DEFAULTS.keepFull,
        };
    }

    function loadSettings() {
        const ctx = getContext();
        if (ctx) {
            return sanitize(ctx.extensionSettings[SETTINGS_KEY]);
        }
        try {
            return sanitize(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || '{}'));
        } catch {
            return { ...DEFAULTS };
        }
    }

    function saveSettings(settings) {
        const ctx = getContext();
        if (ctx) {
            ctx.extensionSettings[SETTINGS_KEY] = { ratio: settings.ratio, keepFull: settings.keepFull };
            if (typeof ctx.saveSettingsDebounced === 'function') ctx.saveSettingsDebounced();
            return;
        }
        try {
            localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(settings));
        } catch { /* storage unavailable, ignore */ }
    }

    // ------------------------------------------------------------------ helpers

    /** Returns a numeric ratio, or NaN for "free" (Cropper.js treats NaN as unrestricted). */
    function resolveRatio(id, img) {
        if (id === 'free') return NaN;
        if (id === 'original') {
            return img && img.naturalWidth > 0 && img.naturalHeight > 0
                ? img.naturalWidth / img.naturalHeight
                : NaN;
        }
        const entry = RATIOS.find(r => r.id === id);
        return entry && typeof entry.value === 'number' ? entry.value : NaN;
    }

    /** Only take over croppers that use SillyTavern's default avatar ratio. */
    function isDefaultAvatarCropper(options) {
        const ar = options.aspectRatio;
        if (ar === undefined || ar === null) return true;
        return typeof ar === 'number' && Math.abs(ar - DEFAULT_RATIO) < RATIO_TOLERANCE;
    }

    function buildToolbar(img, settings) {
        const scope = img.closest('dialog') || document;
        scope.querySelectorAll('.favc-toolbar').forEach(el => el.remove());

        const id = `favc-${++uid}`;
        const bar = document.createElement('div');
        bar.className = 'favc-toolbar';

        const ratioLabel = document.createElement('label');
        ratioLabel.htmlFor = `${id}-ratio`;
        ratioLabel.textContent = 'Aspect ratio:';

        const select = document.createElement('select');
        select.id = `${id}-ratio`;
        select.className = 'text_pole';
        for (const r of RATIOS) {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = r.label;
            opt.selected = r.id === settings.ratio;
            select.appendChild(opt);
        }

        const keepLabel = document.createElement('label');
        keepLabel.title = 'Skip SillyTavern\'s resize step so the avatar keeps its cropped resolution.';
        const keep = document.createElement('input');
        keep.type = 'checkbox';
        keep.checked = settings.keepFull;
        keepLabel.append(keep, document.createTextNode('Keep full resolution (no resize)'));

        const $img = window.jQuery(img);

        select.addEventListener('change', () => {
            settings.ratio = select.value;
            saveSettings(settings);
            try {
                $img.cropper('setAspectRatio', resolveRatio(settings.ratio, img));
            } catch (e) {
                console.error(LOG, 'Failed to change aspect ratio:', e);
            }
        });

        keep.addEventListener('change', () => {
            settings.keepFull = keep.checked;
            saveSettings(settings);
            // Re-emit a crop event so the popup's stored crop data picks up the new flag.
            try {
                $img.cropper('setData', $img.cropper('getData'));
            } catch { /* ignore */ }
        });

        bar.append(ratioLabel, select, keepLabel);

        const anchor = img.closest('.popup-crop-wrap') || img.parentElement;
        if (anchor) anchor.insertAdjacentElement('beforebegin', bar);
    }

    // ------------------------------------------------------------------- patch

    function install() {
        const $ = window.jQuery;
        if (!$ || !$.fn || typeof $.fn.cropper !== 'function') return false;
        if ($.fn.cropper.__favcPatched) return true;

        const original = $.fn.cropper;

        function patched(options, ...rest) {
            const isInit = options && typeof options === 'object' && !Array.isArray(options);
            if (!isInit || !isDefaultAvatarCropper(options)) {
                return original.call(this, options, ...rest);
            }

            const img = this[0];
            const settings = loadSettings();
            const opts = { ...options };
            const origReady = opts.ready;
            const origCrop = opts.crop;

            opts.aspectRatio = NaN; // start unrestricted, the chosen ratio is applied once the image is ready
            opts.autoCropArea = 1;

            opts.ready = function (...args) {
                if (typeof origReady === 'function') origReady.apply(this, args);
                try {
                    buildToolbar(img, settings);
                    $(img).cropper('setAspectRatio', resolveRatio(settings.ratio, img));
                } catch (e) {
                    console.error(LOG, 'Setup failed:', e);
                }
            };

            opts.crop = function (event, ...args) {
                if (typeof origCrop === 'function') origCrop.call(this, event, ...args);
                // The popup keeps event.detail as its crop data, so this flag is what gets sent to the server.
                if (settings.keepFull && event && event.detail) {
                    event.detail.want_resize = false;
                }
            };

            return original.call(this, opts, ...rest);
        }

        Object.assign(patched, original);
        patched.__favcPatched = true;
        $.fn.cropper = patched;
        console.log(LOG, 'Loaded.');
        return true;
    }

    // Extensions normally load after the libraries, but retry briefly just in case.
    if (!install()) {
        const started = Date.now();
        const timer = setInterval(() => {
            if (install()) {
                clearInterval(timer);
            } else if (Date.now() - started > MAX_INSTALL_WAIT_MS) {
                clearInterval(timer);
                console.warn(LOG, 'Cropper.js was not found; extension inactive.');
            }
        }, 250);
    }
})();
