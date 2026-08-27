import React from 'react';
import { Link, router } from '@inertiajs/react';
import {
    FileText, FileImage, FileVideo, FileArchive, FileCode,
    Lock, Unlock, ExternalLink, Trash2, Edit, Sparkles, BookOpen, Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface MaterialItemProps {
    id: number;
    title: string;
    subject_name: string;
    teacher_name?: string;
    file_type: string | null;
    created_at: string;
    is_accessible?: boolean;
    access_status?: 'auto' | 'open' | 'locked';
    tp_code?: string;
    class_name?: string;
}

interface MaterialCardProps {
    material: MaterialItemProps;
    isTeacher?: boolean;
    onDelete?: (id: number) => void;
}

const getFileIcon = (type: string | null) => {
    if (!type) return FileText;
    const t = type.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(t)) return FileText;
    if (['jpg', 'jpeg', 'png', 'svg'].includes(t)) return FileImage;
    if (['mp4', 'mov', 'avi'].includes(t)) return FileVideo;
    if (['zip', 'rar', '7z'].includes(t)) return FileArchive;
    return FileCode;
};

const getFileTypeBadge = (type: string | null) => {
    if (!type) return { bg: 'bg-muted text-foreground border-border/60', label: 'DOKUMEN' };
    const t = type.toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(t)) {
        return { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', label: t.toUpperCase() };
    }
    if (['jpg', 'jpeg', 'png', 'svg'].includes(t)) {
        return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', label: 'GAMBAR' };
    }
    if (['mp4', 'mov', 'avi'].includes(t)) {
        return { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', label: 'VIDEO' };
    }
    if (['zip', 'rar', '7z'].includes(t)) {
        return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', label: 'ARSIP' };
    }
    return { bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20', label: t.toUpperCase() };
};

export function MaterialCard({ material, isTeacher = false, onDelete }: MaterialCardProps) {
    const Icon = getFileIcon(material.file_type);
    const isAccessible = material.is_accessible !== false;
    const typeBadge = getFileTypeBadge(material.file_type);

    const toggleLock = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const current = material.access_status || 'auto';
        const next = current === 'auto' ? 'open' : (current === 'open' ? 'locked' : 'auto');
        router.post(route('materials.toggle-lock', material.id), { status: next }, { preserveScroll: true });
    };

    return (
        <div
            className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs hover:shadow-md transition-all active:scale-[0.98] min-h-[160px] ${
                !isAccessible ? 'opacity-70 grayscale-[20%]' : ''
            }`}
        >
            <div>
                {/* Top Bar: Subject Badge, File Badge & Actions */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-black text-primary truncate max-w-[140px]">
                            {material.subject_name}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${typeBadge.bg}`}>
                            {typeBadge.label}
                        </span>

                        {isTeacher && (
                            <div className="flex items-center gap-1">
                                <Link
                                    href={route('materials.edit', material.id)}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
                                    title="Edit Materi"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                </Link>
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(material.id)}
                                        className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition"
                                        title="Hapus Materi"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Title & Context Details */}
                <div className="space-y-1 mb-3">
                    <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {material.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-medium">
                        {material.class_name && (
                            <span className="font-semibold text-foreground/80">{material.class_name}</span>
                        )}
                        {material.class_name && material.tp_code && <span>•</span>}
                        {material.tp_code && material.tp_code !== '-' && (
                            <span className="text-primary font-bold">TP: {material.tp_code}</span>
                        )}
                        {material.teacher_name && (
                            <>
                                <span>•</span>
                                <span className="truncate max-w-[120px]">{material.teacher_name}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Actions & Status Row */}
            <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                {/* Teacher Access Status Toggle */}
                {isTeacher ? (
                    <button
                        type="button"
                        onClick={toggleLock}
                        title="Klik untuk mengubah akses siswa"
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wide transition active:scale-95 border min-h-[32px] ${
                            material.access_status === 'open'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                                : material.access_status === 'locked'
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
                                : 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400'
                        }`}
                    >
                        {material.access_status === 'open' && (
                            <>
                                <Unlock className="h-3 w-3 shrink-0 text-emerald-600" />
                                <span>Terbuka</span>
                            </>
                        )}
                        {material.access_status === 'locked' && (
                            <>
                                <Lock className="h-3 w-3 shrink-0 text-rose-600" />
                                <span>Terkunci</span>
                            </>
                        )}
                        {(!material.access_status || material.access_status === 'auto') && (
                            <>
                                <Sparkles className="h-3 w-3 shrink-0 text-sky-600" />
                                <span>Otomatis (AI)</span>
                            </>
                        )}
                    </button>
                ) : (
                    <span className="text-[11px] text-muted-foreground font-medium">
                        {material.created_at}
                    </span>
                )}

                {/* Open Material Link */}
                {isAccessible ? (
                    <Link
                        href={route('materials.show', material.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground font-bold text-xs transition active:scale-95 min-h-[36px]"
                    >
                        <span>Buka</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted text-muted-foreground font-bold text-[11px]">
                        <Lock className="h-3 w-3" />
                        Terkunci
                    </span>
                )}
            </div>
        </div>
    );
}
