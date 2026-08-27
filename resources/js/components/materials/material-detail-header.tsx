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
    teacherName,
    createdAt,
    accessStatus = 'auto',
    isTeacher = false,
    onDelete,
    backUrl = '/materials',
}: MaterialDetailHeaderProps) {
    const toggleLock = (e: React.MouseEvent) => {
        e.preventDefault();
        const next = accessStatus === 'auto' ? 'open' : (accessStatus === 'open' ? 'locked' : 'auto');
        router.post(route('materials.toggle-lock', id), { status: next }, { preserveScroll: true });
    };

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-card p-5 sm:p-6 border border-primary/20 shadow-xs space-y-3">
            {/* Contextual Back Link & Teacher Management Bar */}
            <div className="flex items-center justify-between gap-3">
                <Link
                    href={backUrl}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-background/80 hover:bg-background border border-border/60 text-xs font-bold text-foreground transition active:scale-95 min-h-[44px]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Kembali</span>
                </Link>

                {isTeacher && (
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={toggleLock}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition active:scale-95 border min-h-[38px] ${
                                accessStatus === 'open'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                                    : accessStatus === 'locked'
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
                                    : 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400'
                            }`}
                        >
                            {accessStatus === 'open' && <Unlock className="h-3.5 w-3.5" />}
                            {accessStatus === 'locked' && <Lock className="h-3.5 w-3.5" />}
                            {accessStatus === 'auto' && <Sparkles className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">
                                {accessStatus === 'open' ? 'Terbuka' : accessStatus === 'locked' ? 'Terkunci' : 'Otomatis (AI)'}
                            </span>
                        </button>

                        <Link
                            href={route('materials.edit', id)}
                            className="p-2.5 rounded-xl bg-background/80 hover:bg-background border border-border/60 text-foreground hover:text-primary transition min-h-[38px] flex items-center justify-center"
                            title="Edit Materi"
                        >
                            <Edit className="h-4 w-4" />
                        </Link>

                        {onDelete && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 transition min-h-[38px] flex items-center justify-center"
                                title="Hapus Materi"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Badges & Meta */}
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs font-black px-2.5 py-0.5 rounded-lg">
                    {subjectName}
                </Badge>
                {className && (
                    <Badge variant="outline" className="bg-muted text-foreground border-border/60 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                        Kelas {className}
                    </Badge>
                )}
                {tpCode && tpCode !== '-' && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                        TP: {tpCode}
                    </Badge>
                )}
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                {title}
            </h1>

            {/* Sub-meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium pt-1">
                {teacherName && (
                    <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>Dibuat oleh <span className="font-bold text-foreground">{teacherName}</span></span>
                    </span>
                )}
                <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{createdAt}</span>
                </span>
            </div>
        </div>
    );
}
