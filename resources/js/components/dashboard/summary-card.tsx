import React from 'react';
import { Link } from '@inertiajs/react';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export type SemanticVariant = 'primary' | 'success' | 'warning' | 'destructive' | 'info';

export interface SummaryCardProps {
    /** Label text (e.g., "SISWA", "MATERI", "ASESMEN", "PERLU DINILAI") */
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
 * Exact spec:
 * Height: ~100px, padding: 14px (p-3.5), label: 11px/700, number: 28px/700.
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
        <Card className={`rounded-2xl border border-border/80 shadow-xs hover:shadow-md transition-all duration-200 bg-card overflow-hidden h-[98px] sm:h-[104px] w-full min-w-0 box-border ${className}`}>
            <CardContent className="p-3.5 flex flex-col justify-between h-full w-full min-w-0 box-border">
                <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                        {label}
                    </p>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.bg} shrink-0 shadow-2xs`}>
                        <Icon className={`h-4 w-4 ${style.text}`} strokeWidth={2.5} />
                    </div>
                </div>

                <div className="mt-1">
                    <div className="text-[26px] sm:text-[28px] font-bold text-foreground leading-none tracking-tight">
                        {value}
                    </div>
                    {description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate leading-tight">
                            {description}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full min-w-0 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl active:scale-97 transition-transform">
                {cardNode}
            </Link>
        );
    }

    return cardNode;
}
