import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface MaterialFormSectionProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export function MaterialFormSection({
    icon: Icon,
    title,
    description,
    children,
    className = '',
}: MaterialFormSectionProps) {
    return (
        <section className={`space-y-5 ${className}`}>
            {/* Section Header */}
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5 pt-0.5">
                    <h3 className="text-sm font-bold text-foreground">{title}</h3>
                    {description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                    )}
                </div>
            </div>

            {/* Section Content */}
            <div className="space-y-4 pl-0 sm:pl-12">
                {children}
            </div>
        </section>
    );
}
