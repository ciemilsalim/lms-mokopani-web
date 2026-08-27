import React from 'react';
import { Link } from '@inertiajs/react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export type SemanticVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'info';

export interface SummaryCardProps {
    /** Label text (e.g., "Siswa", "Materi") */
    label: string;
    /** Numeric or text value to display prominently */
    value: number | string;
    /** Lucide icon component */
    icon: LucideIcon;
    /** Semantic color variant */
    variant?: SemanticVariant;
    /** Optional navigation URL on tap */
    href?: string;
    /** Optional trend or secondary description */
    description?: string;
    /** Additional CSS classes */
    className?: string;
}

const variantStyles: Record<SemanticVariant, { bg: string; text: string; border: string }> = {
    primary: {
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        text: 'text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-100 dark:border-indigo-900/50',
    },
    success: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-100 dark:border-emerald-900/50',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-100 dark:border-amber-900/50',
    },
    destructive: {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        text: 'text-rose-600 dark:text-rose-400',
        border: 'border-rose-100 dark:border-rose-900/50',
    },
    info: {
        bg: 'bg-sky-50 dark:bg-sky-950/40',
        text: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-100 dark:border-sky-900/50',
    },
};

/**
 * SummaryCard (Stat Card)
 * Reusable Mobile-First summary statistic card.
 * Complies with 48px touch target guidelines when wrapped in a link.
 */
export function SummaryCard({
    label,
    value,
    icon: Icon,
    variant = 'primary',
    href,
    description,
    className = '',
}: SummaryCardProps) {
    const style = variantStyles[variant] || variantStyles.primary;

    const cardNode = (
        <Card className={`rounded-2xl border border-border/70 shadow-xs hover:shadow-md transition-all duration-200 bg-card overflow-hidden h-full ${className}`}>
            <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full min-h-[96px]">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                        {label}
                    </p>
                    <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl ${style.bg} shrink-0 shadow-2xs`}>
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${style.text}`} strokeWidth={2.5} />
                    </div>
                </div>

                <div className="mt-2">
                    <div className="text-2xl sm:text-3xl font-black text-foreground leading-none tracking-tight">
                        {value}
                    </div>
                    {description && (
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">
                            {description}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full min-w-0 min-h-[48px] active:scale-97 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl">
                {cardNode}
            </Link>
        );
    }

    return cardNode;
}
