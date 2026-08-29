import React from 'react';
import { Link } from '@inertiajs/react';
import { type LucideIcon, BookOpen, ClipboardList, CalendarCheck, FileText } from 'lucide-react';

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
    actions?: QuickActionItem[];
    className?: string;
}

const defaultTeacherActions: QuickActionItem[] = [
    {
        id: 'create-material',
        title: 'Materi',
        description: 'Bahan ajar & media',
        href: '/materials/create',
        icon: BookOpen,
        variant: 'primary',
    },
    {
        id: 'create-assessment',
        title: 'Asesmen',
        description: 'Tugas, kuis & tes',
        href: '/assignments/create',
        icon: ClipboardList,
        variant: 'destructive',
    },
    {
        id: 'presensi-kelas',
        title: 'Presensi',
        description: 'Absensi harian guru',
        href: '/sso/presensi',
        icon: CalendarCheck,
        variant: 'info',
        isExternal: true,
    },
    {
        id: 'modul-ajar',
        title: 'Modul Ajar',
        description: 'RPP & AI Wizard',
        href: '/lesson-plans',
        icon: FileText,
        variant: 'success',
    },
];

const actionStyles = {
    primary: {
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
        border: 'border-indigo-100 dark:border-indigo-900/40',
    },
    destructive: {
        badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
        border: 'border-rose-100 dark:border-rose-900/40',
    },
    info: {
        badgeBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400',
        border: 'border-sky-100 dark:border-sky-900/40',
    },
    success: {
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-100 dark:border-emerald-900/40',
    },
    warning: {
        badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
        border: 'border-amber-100 dark:border-amber-900/40',
    },
};

/**
 * QuickActionGrid (Aksi Cepat Guru)
 * Exact spec:
 * 2 columns, gap: 8px, card height: 72-76px, radius: 16px, icon container: 36x36px, icon: 20px,
 * title: 13px/700, subtitle: hidden on <=360px, 10-11px on >360px.
 */
export function QuickActionGrid({
    actions = defaultTeacherActions,
    className = '',
}: QuickActionGridProps) {
    return (
        <div className={`grid grid-cols-2 gap-2 w-full min-w-0 ${className}`}>
            {actions.map((act) => {
                const Icon = act.icon;
                const style = actionStyles[act.variant || 'primary'];

                const cardContent = (
                    <div className={`flex items-center gap-2.5 p-3 rounded-2xl border ${style.border} bg-card hover:bg-muted/40 transition-all shadow-xs h-[74px] sm:h-[76px] w-full min-w-0 box-border`}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.badgeBg} shadow-2xs`}>
                            <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-bold text-foreground truncate leading-tight">
                                {act.title}
                            </h3>
                            {act.description && (
                                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden xs:block mt-0.5 leading-tight">
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
                            className="block min-w-0 w-full focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl active:scale-97 transition-transform"
                        >
                            {cardContent}
                        </a>
                    );
                }

                return (
                    <Link
                        key={act.id}
                        href={act.href}
                        className="block min-w-0 w-full focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-2xl active:scale-97 transition-transform"
                    >
                        {cardContent}
                    </Link>
                );
            })}
        </div>
    );
}
