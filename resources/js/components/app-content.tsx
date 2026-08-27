import * as React from 'react';

interface AppContentProps extends React.ComponentProps<'div'> {
    variant?: 'header' | 'sidebar';
}

export function AppContent({ variant = 'header', children, className, ...props }: AppContentProps) {
    if (variant === 'sidebar') {
        return (
            <div className={`content-wrapper flex flex-1 flex-col min-w-0 max-w-full w-full p-3.5 sm:p-6 ${className || ''}`} {...props}>
                {children}
            </div>
        );
    }

    return (
        <main className={`mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl min-w-0 ${className || ''}`} {...props}>
            {children}
        </main>
    );
}
