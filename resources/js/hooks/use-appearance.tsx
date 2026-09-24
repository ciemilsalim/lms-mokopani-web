import { useEffect, useState } from 'react';

export type Appearance = 'light';

const applyTheme = () => {
    if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('dark');
    }
};

export function initializeTheme() {
    if (typeof window === 'undefined') return;

    localStorage.setItem('appearance', 'light');
    applyTheme();
}

export function useAppearance() {
    const [appearance] = useState<Appearance>('light');

    const updateAppearance = () => {
        localStorage.setItem('appearance', 'light');
        applyTheme();
    };

    useEffect(() => {
        applyTheme();
    }, []);

    return { appearance, updateAppearance };
}

