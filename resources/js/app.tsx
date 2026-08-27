import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

// Safely guard window.history.state against null values to prevent Inertia.js scrollRegions TypeError
if (typeof window !== 'undefined' && window.history) {
    try {
        const originalStateDescriptor = Object.getOwnPropertyDescriptor(History.prototype, 'state');
        const originalGetter = originalStateDescriptor?.get;

        if (originalGetter) {
            Object.defineProperty(window.history, 'state', {
                get() {
                    try {
                        const currentState = originalGetter.call(this);
                        if (currentState === null || currentState === undefined) {
                            return { scrollRegions: [] };
                        }
                        if (typeof currentState === 'object' && !('scrollRegions' in currentState)) {
                            return { ...currentState, scrollRegions: [] };
                        }
                        return currentState;
                    } catch {
                        return { scrollRegions: [] };
                    }
                },
                configurable: true,
                enumerable: true,
            });
        }
    } catch {
        // Fallback popstate event guard
        window.addEventListener('popstate', () => {
            if (window.history && window.history.state === null) {
                try {
                    window.history.replaceState({ scrollRegions: [] }, '');
                } catch {
                    // Ignore
                }
            }
        }, { capture: true });
    }
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
