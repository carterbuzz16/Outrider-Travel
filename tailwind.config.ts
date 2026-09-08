import type { Config } from "tailwindcss";

/**
 * Tailwind is a thin surface over the tokens in app/globals.css — every value
 * here points at a CSS variable rather than restating a hex or a rem. That
 * means `bg-surface text-secondary border-rule` inside a `.scheme-forest`
 * section recolours itself with no dark: variants and no props.
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand — reach for these only when a colour is the point (the logo,
        // a deliberate teal panel). Everything else uses the semantic set.
        teal: {
          DEFAULT: "var(--color-teal)",
          deep: "var(--color-teal-deep)",
          ink: "var(--color-teal-ink)",
          tint: "var(--color-teal-tint)",
        },
        sage: "var(--color-sage)",
        ember: "var(--color-burnt-orange)",
        forest: "var(--color-forest)",
        sky: "var(--color-sky)",
        cream: "var(--color-cream)",
        charcoal: "var(--color-charcoal)",
        paper: "var(--color-paper)",
        bone: "var(--color-bone)",

        // Semantic — scheme-aware.
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          inset: "var(--surface-inset)",
          inverse: "var(--surface-inverse)",
        },
        ink: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          solid: "var(--accent-solid)",
          contrast: "var(--accent-contrast)",
        },
        flag: {
          DEFAULT: "var(--flag)",
          ink: "var(--flag-ink)",
        },

        // Kept so the existing coming-soon page keeps resolving.
        background: "var(--background)",
        foreground: "var(--foreground)",
      },

      borderColor: {
        DEFAULT: "var(--rule)",
        rule: "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        "rule-faint": "var(--rule-faint)",
      },

      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },

      fontSize: {
        "display-xl": ["var(--step-display-xl)", { lineHeight: "var(--leading-display)" }],
        "display-l": ["var(--step-display-l)", { lineHeight: "var(--leading-title)" }],
        "display-m": ["var(--step-display-m)", { lineHeight: "var(--leading-title)" }],
        "display-s": ["var(--step-display-s)", { lineHeight: "1.3" }],
        lede: ["var(--step-body-l)", { lineHeight: "var(--leading-loose)" }],
        body: ["var(--step-body)", { lineHeight: "var(--leading-body)" }],
        "body-s": ["var(--step-body-s)", { lineHeight: "var(--leading-body)" }],
        label: ["var(--step-label)", { lineHeight: "1" }],
        micro: ["var(--step-micro)", { lineHeight: "1.4" }],
      },

      letterSpacing: {
        display: "var(--tracking-display)",
        title: "var(--tracking-title)",
        label: "var(--tracking-label)",
        stamp: "var(--tracking-stamp)",
      },

      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },

      maxWidth: {
        shell: "var(--shell)",
        narrow: "var(--shell-narrow)",
        measure: "var(--measure)",
        "measure-tight": "var(--measure-tight)",
      },

      spacing: {
        gutter: "var(--gutter)",
      },

      transitionTimingFunction: {
        DEFAULT: "var(--ease)",
        out: "var(--ease-out)",
      },

      transitionDuration: {
        DEFAULT: "var(--dur)",
        fast: "var(--dur-fast)",
        slow: "var(--dur-slow)",
      },

      keyframes: {
        // The only two animations in the system. Both are a fade with a few
        // pixels of travel; nothing overshoots.
        rise: {
          from: { opacity: "0", transform: "translateY(var(--lift))" },
          to: { opacity: "1", transform: "none" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "stamp-rotate": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },

      animation: {
        rise: "rise var(--dur-slow) var(--ease-out) both",
        fade: "fade var(--dur) var(--ease) both",
        "stamp-rotate": "stamp-rotate 32s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
