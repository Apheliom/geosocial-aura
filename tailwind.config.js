/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./*.js"],
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
              "tertiary-container": "#dddad9",
              "secondary-fixed": "#ffd7f5",
              "outline-variant": "#3a494b",
              "on-surface": "#e5e2e1",
              "inverse-on-surface": "#313030",
              "on-secondary-fixed": "#380038",
              "on-secondary": "#5b005b",
              "primary-fixed-dim": "#00dbe7",
              "primary-container": "#00f2ff",
              "inverse-primary": "#00696f",
              "on-primary": "#00363a",
              "primary-fixed": "#74f5ff",
              "on-primary-fixed": "#002022",
              "on-tertiary-fixed": "#1c1b1b",
              "secondary-fixed-dim": "#ffabf3",
              "surface-tint": "#00dbe7",
              "on-error": "#690005",
              "error-container": "#93000a",
              "inverse-surface": "#e5e2e1",
              "surface-container-high": "#2a2a2a",
              "on-tertiary-container": "#615f5f",
              "tertiary": "#faf6f6",
              "surface-dim": "#131313",
              "on-background": "#e5e2e1",
              "error": "#ffb4ab",
              "secondary-container": "#fe00fe",
              "primary": "#e1fdff",
              "outline": "#849495",
              "surface-container-lowest": "#0e0e0e",
              "on-primary-fixed-variant": "#004f54",
              "surface-container-low": "#1c1b1b",
              "on-secondary-fixed-variant": "#810081",
              "on-primary-container": "#006a71",
              "surface-variant": "#353535",
              "on-secondary-container": "#500050",
              "tertiary-fixed": "#e5e2e1",
              "on-tertiary-fixed-variant": "#474646",
              "background": "#131313",
              "on-error-container": "#ffdad6",
              "surface": "#131313",
              "surface-bright": "#393939",
              "tertiary-fixed-dim": "#c9c6c5",
              "surface-container": "#20201f",
              "secondary": "#ffabf3",
              "on-tertiary": "#313030",
              "on-surface-variant": "#b9cacb",
              "surface-container-highest": "#353535"
      },
      "borderRadius": {
              "DEFAULT": "0.25rem",
              "lg": "0.5rem",
              "xl": "0.75rem",
              "full": "9999px"
      },
      "spacing": {
              "unit": "4px",
              "margin-mobile": "16px",
              "margin-desktop": "32px",
              "thread-indent": "24px",
              "gutter": "16px"
      },
      "fontFamily": {
              "label-caps": [
                      "JetBrains Mono"
              ],
              "display-lg": [
                      "Space Grotesk"
              ],
              "headline-lg-mobile": [
                      "Space Grotesk"
              ],
              "headline-lg": [
                      "Space Grotesk"
              ],
              "body-md": [
                      "Geist"
              ],
              "status-code": [
                      "JetBrains Mono"
              ]
      },
      "fontSize": {
              "label-caps": [
                      "12px",
                      {
                              "lineHeight": "1",
                              "letterSpacing": "0.1em",
                              "fontWeight": "500"
                      }
              ],
              "display-lg": [
                      "48px",
                      {
                              "lineHeight": "1.1",
                              "letterSpacing": "-0.02em",
                              "fontWeight": "700"
                      }
              ],
              "headline-lg-mobile": [
                      "24px",
                      {
                              "lineHeight": "1.2",
                              "fontWeight": "600"
                      }
              ],
              "headline-lg": [
                      "32px",
                      {
                              "lineHeight": "1.2",
                              "fontWeight": "600"
                      }
              ],
              "body-md": [
                      "16px",
                      {
                              "lineHeight": "1.6",
                              "fontWeight": "400"
                      }
              ],
              "status-code": [
                      "14px",
                      {
                              "lineHeight": "1.4",
                              "fontWeight": "700"
                      }
              ]
      }
    }
  }
}
