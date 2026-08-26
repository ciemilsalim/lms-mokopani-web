import React from 'react';
import { type LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
    /** Main icon to display */
    icon?: LucideIcon;
    /** Short primary headline */
    title: string;
    /** Secondary description */
    description?: string;
    /** Action button text */
    actionLabel?: string;
    /** Action click handler */
    onAction?: () => void;
    /** Custom container styling */
    className?: string;
}

/**
 * EmptyState
 * Reusable Mobile-First empty state fallback UI.
 * Provides clear messaging and optional call to action.
 */
export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center p-6 sm:p-8 ${className}`}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/60 mb-3 shadow-2xs">
                <Icon className="h-6 w-6" />
            </div>

            <h3 className="text-sm sm:text-base font-bold text-foreground max-w-xs">
                {title}
            </h3>

            {description && (
                <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                    {description}
                </p>
            )}

            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    variant="outline"
                    size="sm"
                    className="mt-4 rounded-xl min-h-[44px] px-4 font-bold"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
