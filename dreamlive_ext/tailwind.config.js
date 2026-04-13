/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{ts,tsx,html}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Rubik', 'system-ui', 'sans-serif'],
            },
            colors: {
                bg: { main: '#F8F9FAE8', card: 'rgb(238, 236, 236)' },
                primary: { DEFAULT: '#1a1d29', hover: '#2a2d39' },
                accent: { DEFAULT: '#147374', hover: '#0e5455' },
                text: { main: '#1f2937', soft: '#6b7280' },
                border: '#e5e7eb',
                danger: '#ef4444',
                success: '#22c55e',
            },
            backgroundImage: {
                'brand-gradient': 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #22c55e 100%)',
            },
            boxShadow: {
                'card': '0 2px 8px rgba(15,23,42,0.08)',
                'card-hover': '0 4px 12px rgba(15,23,42,0.12)',
            }
        },
    },
    plugins: [],
}