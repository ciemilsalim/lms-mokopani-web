import React from 'react';
import { Link } from '@inertiajs/react';
import { Plus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileFabProps {
    href?: string;
    onClick?: () => void;
    label?: string;
    icon?: LucideIcon;
    className?: string;
}

export function MobileFab({
    href,
    onClick,
    label,
    icon: Icon = Plus,
    className
}: MobileFabProps) {
    const content = (
        <>
            <Icon className="h-5 w-5 shrink-0" />
            {label && (
                <span className="text-xs font-bold tracking-tight pr-1">
                    {label}
                </span>
            )}
        </>
    );

    const baseClasses = cn(
        "md:hidden print:hidden fixed right-4 bottom-20 z-30 flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-bold shadow-[0_10px_25px_-4px_rgba(94,106,210,0.5)] active:scale-95 transition-all p-3.5",
        label ? "px-4 py-3" : "h-13 w-13",
        className
    );

    if (href) {
        return (
            <Link href={href} className={baseClasses} aria-label={label || 'Aksi Cepat'}>
                {content}
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={baseClasses}
            aria-label={label || 'Aksi Cepat'}
        >
            {content}
        </button>
    );
}
