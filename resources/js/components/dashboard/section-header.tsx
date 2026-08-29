import React from 'react';
import { Link } from '@inertiajs/react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

export interface SectionHeaderProps {
    /** Title text of the section */
    title: string;
    /** Optional subtitle or descriptive caption */
    subtitle?: string;
    /** Optional Lucide icon element to display beside title */
    icon?: LucideIcon;
    /** Optional URL for the header's right-side CTA link */
    actionHref?: string;
    /** Optional label for the CTA link (default: "Lihat Semua") */
    actionLabel?: string;
    /** Additional custom container styling */
    className?: string;
}

/**
 * SectionHeader
 * Reusable Section Header following exact mobile specs:
 * 32x32px icon container (radius 10px), 16px/700 title, 11-12px subtitle, 8px gap.
 */
export function SectionHeader({
    title,
    subtitle,
    icon: Icon,
    actionHref,
    actionLabel = 'Lihat semua',
    className = '',
}: SectionHeaderProps) {
    return (
        <div className={`flex items-center justify-between gap-2 mb-2 sm:mb-2.5 w-full min-w-0 ${className}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {Icon && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold text-foreground truncate leading-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate leading-tight">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actionHref && (
                <Link
                    href={actionHref}
                    className="inline-flex items-center gap-0.5 min-h-[44px] px-2 py-1 text-xs font-bold text-primary hover:underline transition-colors shrink-0"
                >
                    <span className="truncate max-w-[90px] sm:max-w-none">{actionLabel}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
            )}
        </div>
    );
}
