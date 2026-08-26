import React from 'react';
import { Link } from '@inertiajs/react';
import { type LucideIcon, Plus, BookOpen, ClipboardList, CalendarCheck, FileText } from 'lucide-react';

export interface QuickActionItem {
    id: string;
    title: string;
    description?: string;
    href: string;
    icon: LucideIcon;
    variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
    isExternal?: boolean;
}

export interface QuickActionGridProps {
    /** Custom array of quick actions, defaults to Teacher 4 Primary Actions */
    actions?: QuickActionItem[];
    className?: string;
}

const defaultTeacherActions: QuickActionItem[] = [
    {
        id: 'create-material',
        title: 'Tambah Materi',
        description: 'Bahan ajar & media',
        href: '/materials/create',
        icon: BookOpen,
        variant: 'primary',
    },
    {
        id: 'create-assessment',
        title: 'Buat Asesmen',
        description: 'Tugas, kuis & tes',
        href: '/assignments/create',
        icon: ClipboardList,
        variant: 'destructive',
    },
    {
        id: 'presensi-kelas',
        title: 'Presensi Kelas',
        description: 'Absensi harian guru',
        href: '/sso/presensi',
        icon: CalendarCheck,
        variant: 'info',
        isExternal: true,
    },
    {
        id: 'modul-ajar',
        title: 'Modul Ajar / RPP',
        description: 'RPP PPA & AI Wizard',
        href: '/lesson-plans',
        icon: FileText,
        variant: 'success',
    },
];

const actionStyles = {
    primary: {
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-100 dark:border-indigo-900/40',
        active: 'active:bg-indigo-50/50',
    },
    destructive: {
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
        border: 'border-rose-100 dark:border-rose-900/40',
        active: 'active:bg-rose-50/50',
    },
    info: {
        badgeBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
        border: 'border-sky-100 dark:border-sky-900/40',
        active: 'active:bg-sky-50/50',
    },
    success: {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-100 dark:border-emerald-900/40',
        active: 'active:bg-emerald-50/50',
    },
    warning: {
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
        border: 'border-amber-100 dark:border-amber-900/40',
        active: 'active:bg-amber-50/50',
    },
};

/**
 * QuickActionGrid & QuickActionCard
 * Reusable Mobile-First 2x2 Grid for primary teacher actions.
 * Minimum interactive height target >= 52px for thumb friendliness.
 */
export function QuickActionGrid({
    actions = defaultTeacherActions,
    className = '',
}: QuickActionGridProps) {
    return (
        <div className={`grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 ${className}`}>
            {actions.map((act) => {
                const Icon = act.icon;
                const style = actionStyles[act.variant || 'primary'];

                const content = (
                    <div className={`group flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border ${style.border} bg-card hover:bg-muted/40 transition-all shadow-2xs h-full min-h-[56px]`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.badgeBg} shadow-2xs`}>
                            <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
                                {act.title}
                            </h3>
                            {act.description && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                    {act.description}
                                </p>
                            )}
                        </div>
                    </div>
                );

                if (act.isExternal) {
                    return (
                        <a
                            key={act.id}
                            href={act.href}
                            className="block h-full active:scale-97 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-2xl"
                        >
                            {content}
                        </a>
                    );
                }

                return (
                    <Link
                        key={act.id}
                        href={act.href}
                        className="block h-full active:scale-97 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-2xl"
                    >
                        {content}
                    </Link>
                );
            })}
        </div>
    );
}
