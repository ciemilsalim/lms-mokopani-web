import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// Auto-reload page when 419 Page Expired occurs (CSRF Token timeout)
import { router } from '@inertiajs/react';
router.on('invalid', (event) => {
    if (event.detail.response.status === 419) {
        event.preventDefault();
        window.location.reload();
    }
});

// This will set light / dark mode on load...
initializeTheme();
