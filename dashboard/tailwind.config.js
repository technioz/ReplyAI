/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Quirkly Premium Brand Colors (light theme)
        bg: '#FFFFFF',
        surface: '#F8FAFC',
        card: '#FFFFFF',
        ink: '#1E293B',
        'ink-mute': '#64748B',
        stroke: '#E2E8F0',
        accent: '#6D5EF8',
        'accent-cyan': '#22D3EE',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Legacy colors for compatibility
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
      },
      fontSize: {
        'hero': 'clamp(2.5rem, 5vw, 4rem)',
        'subhero': 'clamp(1.25rem, 3vw, 1.75rem)',
        'body': 'clamp(1rem, 2vw, 1.125rem)',
      },
      lineHeight: {
        'editorial': '1.5',
        'tight': '1.6',
      },
      borderRadius: {
        'card': '12px',
        'button': '16px',
        'modal': '24px',
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'layered': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'accent-glow': '0 0 0 2px rgba(109, 94, 248, 0.35)',
      },
      spacing: {
        'section': '64px',
        'section-lg': '120px',
      },
      animation: {
        'fade-scale': 'fadeScale 200ms ease-out',
        'spring-snap': 'springSnap 160ms ease-out',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        springSnap: {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'quirkly-grad': 'linear-gradient(135deg, #6D5EF8 0%, #22D3EE 55%, #F472B6 100%)',
        'grain': 'url("/textures/grain.png")',
      },
    },
  },
  plugins: [],
}
