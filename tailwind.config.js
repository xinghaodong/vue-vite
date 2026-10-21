/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--app-font-family)'],
                mono: ['var(--app-font-family-mono)'],
            },
        },
    },
    plugins: [],
};
