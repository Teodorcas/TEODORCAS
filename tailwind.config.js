/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1A56DB',
        'primary-dark': '#1240A8',
        'primary-light': '#EBF2FF',
        accent: '#F97316',
        'accent-dark': '#C45D0A',
        'accent-light': '#FFF3E8',
        'slate-dark': '#334155',
        brand: {
          bg: '#F5F6FA',
          surface: '#FFFFFF',
          'surface-secondary': '#EEF0F8',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Noto Sans', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
        btn: '10px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.07)',
        nav: '0 -2px 10px rgba(0,0,0,0.06)',
        topbar: '0 2px 6px rgba(0,0,0,0.05)',
      },
      keyframes: {
        dot1: {
          '0%, 20%': { opacity: '0' },
          '40%': { opacity: '1' },
          '60%, 100%': { opacity: '0' },
        },
        dot2: {
          '0%, 40%': { opacity: '0' },
          '60%': { opacity: '1' },
          '80%, 100%': { opacity: '0' },
        },
        dot3: {
          '0%, 60%': { opacity: '0' },
          '80%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
