
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['Source Code Pro', 'monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: '#1B48A3', 
          foreground: '#FFFFFF',
          50: '#e6eef9',
          100: '#ccddf3',
          200: '#99bbe7',
          300: '#6699db',
          400: '#3377cf',
          500: '#1b48a3',
          600: '#013193',
          700: '#012f8d',
          800: '#002c83',
          900: '#001a4f',
        },
        secondary: {
          DEFAULT: '#2579C8',
          foreground: '#FFFFFF',
          50: '#e8f2fb',
          100: '#d0e5f7',
          200: '#a1cbef',
          300: '#72b1e7',
          400: '#4397df',
          500: '#2579c8',
          600: '#1d61a0',
          700: '#164978',
          800: '#0e3050',
          900: '#071828',
        },
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B',
        },
        accent: {
          DEFAULT: '#ECFEFF',
          foreground: '#1B48A3',
        },
        destructive: {
          DEFAULT: '#E11D48',
          foreground: '#FFFFFF',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        sidebar: {
          DEFAULT: '#FFFFFF',
          foreground: '#212529',
          primary: '#1B48A3',
          'primary-foreground': '#FFFFFF',
          accent: '#F8F9FA',
          'accent-foreground': '#1B48A3',
          border: '#DEE2E6',
          ring: '#1B48A3',
        },
      },
      fontSize: {
        'xs-dense': '0.75rem',
        'sm-dense': '0.8125rem',
        'base-dense': '0.875rem',
        'lg-dense': '1rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
