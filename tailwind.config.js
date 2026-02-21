/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Permite usar dark mode via atributo data-theme
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Mapeia as variáveis CSS do Orbis como tokens do Tailwind
      colors: {
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        purple: 'var(--purple)',
        bg: {
          DEFAULT: 'var(--bg)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-card-hover)',
          secondary: 'var(--bg-secondary)',
          input: 'var(--bg-input)',
        },
        border: 'var(--border)',
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        system: 'var(--radius)',
      },
      boxShadow: {
        glow: '0 0 30px var(--primary-glow), 0 0 60px rgba(6, 182, 212, 0.1)',
        'glow-sm': '0 0 16px rgba(6, 182, 212, 0.12)',
        card: '0 0 16px rgba(6, 182, 212, 0.06)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #06b6d4, #0891b2)',
        'gradient-text': 'linear-gradient(135deg, #06b6d4, #38bdf8)',
        'gradient-purple': 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 var(--primary-glow)' },
          '70%': { boxShadow: '0 0 0 12px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'system-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'system-pulse': 'system-pulse 2s ease-in-out infinite',
      },
    },
  },
  // Desativa reset do Tailwind para não colidir com o CSS existente
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
