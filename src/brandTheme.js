// Fetches Canvas brand_variables from the LTI server (which proxies it from
// `${CANVAS_URL}/api/v1/brand_variables` using `CANVAS_KEY`) and applies the
// resulting theme to the LTI frontend.
//
// Two things happen:
//   1. Every `ic-brand-*` key is set as a CSS custom property on `:root`
//      (the same convention Canvas itself uses), so plain CSS / 3rd party
//      components can consume `var(--ic-brand-primary)` etc.
//   2. The most relevant brand colors are returned as an @instructure/ui
//      `canvas` theme override object so InstUISettingsProvider can re-skin
//      InstUI components.

import { canvas } from "@instructure/ui";

export async function loadBrandVariables() {
    try {
        const resp = await fetch("/brand_variables", {
            credentials: "same-origin"
        });
        if (!resp.ok) {
            console.warn(
                `brand_variables request failed: ${resp.status} ${resp.statusText}`
            );
            return null;
        }
        return await resp.json();
    } catch (e) {
        console.warn("brand_variables fetch error:", e);
        return null;
    }
}

// Inject every brand var as a CSS custom property on :root so that
// `var(--ic-brand-primary)` etc. work app-wide.
export function applyBrandCssVariables(brand) {
    if (!brand) return;
    const root = document.documentElement;
    Object.entries(brand).forEach(([key, value]) => {
        if (value == null) return;
        root.style.setProperty(`--${key}`, String(value));
    });

    // Favicon swap, if Canvas provides one
    if (brand["ic-brand-favicon"]) {
        let link = document.querySelector("link[rel='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }
        link.href = brand["ic-brand-favicon"];
    }
}

// Build an @instructure/ui canvas theme with brand-color overrides.
export function buildCanvasTheme(brand) {
    if (!brand) return canvas;

    const primary = brand["ic-brand-primary"];
    const linkColor = brand["ic-link-color"];
    const fontColorDark = brand["ic-brand-font-color-dark"];
    const buttonPrimaryBgd = brand["ic-brand-button--primary-bgd"];
    const buttonPrimaryText = brand["ic-brand-button--primary-text"];
    const buttonSecondaryBgd = brand["ic-brand-button--secondary-bgd"];
    const buttonSecondaryText = brand["ic-brand-button--secondary-text"];

    return {
        ...canvas,
        themeOverrides: {
            canvas: {
                colors: {
                    ...(primary && { brand: primary }),
                    ...(linkColor && { link: linkColor }),
                    ...(fontColorDark && { textDarkest: fontColorDark })
                },
                ...(primary && {
                    typography: {},
                    borders: {}
                })
            }
        },
        // Used downstream by components reading theme.brand
        brand: {
            primary,
            linkColor,
            buttonPrimaryBgd,
            buttonPrimaryText,
            buttonSecondaryBgd,
            buttonSecondaryText
        }
    };
}
