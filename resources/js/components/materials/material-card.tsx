import React from 'react';
import { Link, router } from '@inertiajs/react';
import {
    FileText, FileImage, FileVideo, FileArchive, FileCode,
    Lock, Unlock, ArrowRight, Trash2, Edit, Sparkles, MoreVertical, ExternalLink
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

export function MaterialCard({ material, isTeacher = false, onDelete }: MaterialCardProps) {
    const Icon = getFileIcon(material.file_type);
    const isAccessible = material.is_accessible !== false;

    const toggleLock = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const current = material.access_status || 'auto';
        const next = current === 'auto' ? 'open' : (current === 'open' ? 'locked' : 'auto');
        router.post(route('materials.toggle-lock', material.id), { status: next }, { preserveScroll: true });
    };

    // Format class summary (e.g. "8A, 8B, 8C")
    const formattedClassName = material.class_name
        ? material.class_name.replace(/Kelas /g, '')
        : null;

    return (
        <div
            onClick={() => router.visit(route('materials.show', material.id))}
            className={`group relative flex flex-col justify-between p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer min-h-[140px] w-full min-w-0 ${
                !isAccessible ? 'opacity-70 grayscale-[20%]' : ''
            }`}
        >
            <div className="space-y-2">
                {/* Top Row: Icon + Subject Name (Left) and Status Badge + Menu (Right) */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-black text-primary truncate max-w-[150px]">
                            {material.subject_name}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Status Badge */}
                        {material.access_status === 'open' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Diterbitkan
                            </span>
                        )}
                        {material.access_status === 'locked' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-extrabold">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                                Terkunci
                            </span>
                        )}
                        {(!material.access_status || material.access_status === 'auto') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-extrabold">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                                Otomatis
                            </span>
                        )}

                        {/* Teacher Dropdown Action Menu */}
                        {isTeacher && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition min-h-[30px] min-w-[30px] flex items-center justify-center"
                                        title="Menu Kelola"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.visit(route('materials.edit', material.id));
                                        }}
                                        className="cursor-pointer text-xs font-bold gap-2"
                                    >
                                        <Edit className="h-3.5 w-3.5" />
                                        <span>Edit Materi</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={toggleLock}
                                        className="cursor-pointer text-xs font-bold gap-2"
                                    >
                                        {material.access_status === 'open' ? (
                                            <>
                                                <Lock className="h-3.5 w-3.5 text-rose-500" />
                                                <span>Kunci Materi</span>
                                            </>
                                        ) : (
                                            <>
                                                <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                                                <span>Buka Akses</span>
                                            </>
                                        )}
                                    </DropdownMenuItem>
                                    {onDelete && (
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(material.id);
                                            }}
                                            className="cursor-pointer text-xs font-bold gap-2 text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span>Hapus Materi</span>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Title (Max 2 Lines) */}
                <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {material.title}
                </h3>
            </div>

            {/* Context Line & Bottom Action */}
            <div className="pt-2.5 mt-2 border-t border-border/40 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate">
                    {formattedClassName && (
                        <span className="font-semibold text-foreground/85 truncate">
                            Kelas {formattedClassName}
                        </span>
                    )}
                    {formattedClassName && material.tp_code && <span>•</span>}
                    {material.tp_code && material.tp_code !== '-' && (
                        <span className="font-bold text-primary shrink-0">
                            TP {material.tp_code}
                        </span>
                    )}
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary group-hover:translate-x-0.5 transition-transform shrink-0 ml-auto">
                    <span>Buka</span>
                    <ArrowRight className="h-3 w-3" />
                </span>
            </div>
        </div>
    );
}
