import type {
  Config
} from "tailwindcss";

const config: Config = {
  darkMode: [
    "class"
  ],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl":
          "1400px"
      }
    },
    extend: {
      colors: {
        border:
          "hsl(var(--border))",
        input:
          "hsl(var(--input))",
        ring:
          "hsl(var(--ring))",
        background:
          "hsl(var(--background))",
        foreground:
          "hsl(var(--foreground))",
        primary: {
          DEFAULT:
            "hsl(var(--primary))",
          foreground:
            "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT:
            "hsl(var(--secondary))",
          foreground:
            "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT:
            "hsl(var(--destructive))",
          foreground:
            "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT:
            "hsl(var(--muted))",
          foreground:
            "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT:
            "hsl(var(--accent))",
          foreground:
            "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT:
            "hsl(var(--popover))",
          foreground:
            "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT:
            "hsl(var(--card))",
          foreground:
            "hsl(var(--card-foreground))"
        },
        success: {
          DEFAULT:
            "#3aaa35",
          foreground:
            "#ffffff"
        },
        brand: {
          blue:
            "hsl(var(--brand-blue))",
          green:
            "hsl(var(--brand-accent))",
          accent:
            "hsl(var(--brand-accent))",
          orange:
            "hsl(var(--brand-accent))",
          navy:
            "hsl(var(--brand-navy))",
          surface:
            "hsl(var(--brand-surface))",
          background:
            "hsl(var(--brand-background))",
          ink:
            "hsl(var(--brand-ink))",
          muted:
            "hsl(var(--brand-muted))",
          border:
            "hsl(var(--brand-border))",
          gray:
            "hsl(var(--brand-gray))"
        }
      },
      borderRadius: {
        lg:
          "var(--radius)",
        md:
          "calc(var(--radius) - 2px)",
        sm:
          "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        soft:
          "0 20px 45px -28px hsl(var(--primary) / 0.38)",
        card:
          "0 18px 40px -30px hsl(var(--brand-ink) / 0.45)"
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0"
          },
          to: {
            height:
              "var(--radix-accordion-content-height)"
          }
        },
        "accordion-up": {
          from: {
            height:
              "var(--radix-accordion-content-height)"
          },
          to: {
            height: "0"
          }
        }
      },
      animation: {
        "accordion-down":
          "accordion-down 0.2s ease-out",
        "accordion-up":
          "accordion-up 0.2s ease-out"
      }
    }
  },
  plugins: [
    require(
      "tailwindcss-animate"
    )
  ]
};

export default config;
