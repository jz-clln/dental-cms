import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Headlines, the mascot's name, anything that should feel human and considered
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
        // Body copy, labels, inputs, buttons
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Verification codes, appointment refs
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        display: '-0.015em', // Fraunces sits tighter than default tracking at display sizes
      },
      colors: {
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Warm off-white backgrounds — porcelain, not paper-white
        porcelain: {
          50: '#fefdfb',
          100: '#faf8f4',
          200: '#f3f0e9',
          300: '#e8e3d8',
        },
        // Warm near-black for text — avoids the flat #111 "AI default"
        ink: {
          500: '#4a453f',
          600: '#332f2a',
          700: '#26221e',
          800: '#1c1916',
          900: '#151210',
        },
      },
      boxShadow: {
        // Soft, teal-tinted lift for the auth card — not the generic grey SaaS shadow
        card: '0 1px 2px rgba(19, 78, 74, 0.04), 0 12px 32px -8px rgba(19, 78, 74, 0.12)',
        'card-hover': '0 1px 2px rgba(19, 78, 74, 0.06), 0 20px 40px -10px rgba(19, 78, 74, 0.18)',
        'focus-glow': '0 0 0 4px rgba(20, 184, 166, 0.12)',
      },
      transitionTimingFunction: {
        // A gentle overshoot, not a linear or generic ease-out — this is what makes
        // the entrance feel considered rather than default
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'out-quint': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      keyframes: {
        // The ONE orchestrated moment on page load — the card settling into place,
        // with a touch of overshoot rather than a flat linear slide-up
        settle: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Idle animation for the mascot/avatar — a slow, near-imperceptible breathing
        // motion that signals "the assistant is present" without being distracting
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.035)' },
        },
        // Button press: quick compress, then an asymmetric spring release —
        // more tactile than a plain scale transition
        press: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(0.965)' },
          '100%': { transform: 'scale(1)' },
        },
        // Focus state on inputs: a soft radial pulse instead of an instant ring snap
        'focus-glow': {
          '0%': { boxShadow: '0 0 0 0 rgba(20, 184, 166, 0.20)' },
          '100%': { boxShadow: '0 0 0 4px rgba(20, 184, 166, 0.12)' },
        },
        // "AI thinking" shimmer — a diagonal sweep for use on response-loading states,
        // distinct from a standard horizontal skeleton shimmer
        thinking: {
          '0%': { backgroundPosition: '-120% 0' },
          '100%': { backgroundPosition: '220% 0' },
        },
      },
      animation: {
        settle: 'settle 0.5s cubic-bezier(0.23, 1, 0.32, 1) both',
        breathe: 'breathe 4.5s ease-in-out infinite',
        press: 'press 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'focus-glow': 'focus-glow 0.45s ease-out forwards',
        thinking: 'thinking 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;