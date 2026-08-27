import React from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Users, Calendar, User, Lock, Unlock, Sparkles, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MaterialDetailHeaderProps {
    id: number;
    title: string;
    subjectName: string;
    className?: string | null;
    tpCode?: string | null;
    teacherName?: string | null;
    createdAt: string;
    accessStatus?: 'auto' | 'open' | 'locked';
    isTeacher?: boolean;
    onDelete?: () => void;
    backUrl?: string;
}

export function MaterialDetailHeader({
    id,
    title,
    subjectName,
    className,
    tpCode,
    tpDesc,
    teacherName,
    createdAt,
    commentsCount = 0,
    accessStatus = 'auto',
    isTeacher = false,
    onDelete,
    backUrl = '/materials',
}: MaterialDetailHeaderProps & { tpDesc?: string | null; commentsCount?: number }) {
    const toggleLock = (e: React.MouseEvent) => {
        e.preventDefault();
        const next = accessStatus === 'auto' ? 'open' : (accessStatus === 'open' ? 'locked' : 'auto');
        router.post(route('materials.toggle-lock', id), { status: next }, { preserveScroll: true });
    };

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-card p-4 sm:p-6 border border-primary/20 shadow-xs space-y-3 w-full min-w-0">
            {/* Top Row: Meta Badges & Teacher Controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-black px-2.5 py-0.5 rounded-lg">
                        {subjectName}
                    </Badge>
                    {className && (
                        <Badge variant="outline" className="bg-muted text-foreground border-border/60 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                            {className}
                        </Badge>
                    )}
                    {tpCode && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold px-2 py-0.5 rounded-lg">
                            TP {tpCode}
                        </Badge>
                    )}
                </div>

                {isTeacher && (
                    <div className="flex items-center gap-1.5 ml-auto">
                        <button
                            type="button"
                            onClick={toggleLock}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold transition active:scale-95 border min-h-[34px] ${
                                accessStatus === 'open'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                                    : accessStatus === 'locked'
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
                                    : 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400'
                            }`}
                        >
                            {accessStatus === 'open' && <Unlock className="h-3 w-3" />}
                            {accessStatus === 'locked' && <Lock className="h-3 w-3" />}
                            {accessStatus === 'auto' && <Sparkles className="h-3 w-3" />}
                            <span className="text-[11px]">
                                {accessStatus === 'open' ? 'Terbuka' : accessStatus === 'locked' ? 'Terkunci' : 'Otomatis'}
                            </span>
                        </button>

                        <Link
                            href={route('materials.edit', id)}
                            className="p-2 rounded-xl bg-background/80 hover:bg-background border border-border/60 text-foreground hover:text-primary transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                            title="Edit Materi"
                        >
                            <Edit className="h-3.5 w-3.5" />
                        </Link>

                        {onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                                title="Hapus Materi"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Title */}
            <div className="space-y-1">
                <h1 className="text-lg sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                    {title}
                </h1>

                {/* Subtitle / Author & Date */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
                    {teacherName && (
                        <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="font-semibold text-foreground/80">{teacherName}</span>
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Diperbarui {createdAt}</span>
                    </span>

                    {/* Quick Discussion Link */}
                    <a
                        href="#diskusi"
                        className="inline-flex items-center gap-1 font-bold text-primary hover:underline ml-auto"
                    >
                        <span>💬 Diskusi</span>
                        {commentsCount > 0 && <span className="bg-primary/15 text-primary px-1.5 py-0.2 rounded-md text-[10px]">{commentsCount}</span>}
                    </a>
                </div>
            </div>
        </div>
    );
}
