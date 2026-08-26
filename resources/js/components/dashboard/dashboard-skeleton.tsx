import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export interface DashboardSkeletonProps {
    className?: string;
}

/**
 * DashboardSkeleton
 * Mobile-First loading state skeleton matching exact layout wireframe.
 * Avoids large full-screen spinners by providing smooth layout placeholders.
 */
export function DashboardSkeleton({ className = '' }: DashboardSkeletonProps) {
    return (
        <div className={`space-y-4 sm:space-y-6 animate-pulse ${className}`}>
            {/* Welcome Banner Skeleton */}
            <div className="h-40 sm:h-44 w-full rounded-2xl md:rounded-3xl bg-muted/70" />

            {/* Quick Action Grid Skeleton (2x2 on Mobile) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 w-full rounded-2xl bg-muted/60" />
                ))}
            </div>

            {/* Summary Cards Skeleton (6 cards) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="rounded-2xl border border-border/50 bg-card p-4">
                        <CardContent className="p-0 space-y-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-3 w-16 rounded" />
                                <Skeleton className="h-9 w-9 rounded-xl" />
                            </div>
                            <Skeleton className="h-7 w-12 rounded-lg" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Sections Skeleton */}
            <div className="grid gap-4 sm:gap-6 xl:grid-cols-2">
                <Card className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                    <Skeleton className="h-5 w-40 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </Card>

                <Card className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                    <Skeleton className="h-5 w-40 rounded" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                </Card>
            </div>
        </div>
    );
}
