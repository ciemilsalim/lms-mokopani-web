import React from 'react';
import {
    Link as LinkIcon, Upload, Trash2, Globe, FolderOpen, Plus, X
} from 'lucide-react';

interface NewResource {
    id: number;
    type: 'file' | 'link';
    value: string;
    file: File | null;
    title: string;
}

interface ExistingResource {
    id: number;
    type: string;
    title: string | null;
    path: string;
    file_type: string | null;
}

interface MaterialResourceEditorProps {
    newResources: NewResource[];
    onAddResource: (type: 'file' | 'link') => void;
    onUpdateResource: (id: number, field: string, value: any) => void;
    onRemoveNewResource: (id: number) => void;
    // Edit mode
    existingResources?: ExistingResource[];
    deletedResourceIds?: number[];
    onRemoveExistingResource?: (id: number) => void;
}

export function MaterialResourceEditor({
    newResources,
    onAddResource,
    onUpdateResource,
    onRemoveNewResource,
    existingResources = [],
    deletedResourceIds = [],
    onRemoveExistingResource,
}: MaterialResourceEditorProps) {
    const visibleExisting = existingResources.filter(r => !deletedResourceIds.includes(r.id));
    const hasContent = visibleExisting.length > 0 || newResources.length > 0;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">
                    Sumber Belajar Tambahan
                </label>
                <div className="flex gap-1.5">
                    <button
                        type="button"
                        onClick={() => onAddResource('link')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/15 transition min-h-[36px]"
                    >
                        <LinkIcon className="h-3 w-3" />
                        Link
                    </button>
                    <button
                        type="button"
                        onClick={() => onAddResource('file')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/15 transition min-h-[36px]"
                    >
                        <Upload className="h-3 w-3" />
                        File
                    </button>
                </div>
            </div>

            {/* Resource List */}
            <div className="space-y-2.5">
                {/* Existing Resources (Edit Mode) */}
                {visibleExisting.map((res) => (
                    <div key={`existing-${res.id}`} className="p-3.5 rounded-xl bg-card border border-border space-y-2.5 group relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg flex items-center justify-center bg-muted/50 text-muted-foreground">
                                    {res.type === 'link' ? <Globe className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                                </div>
                                <span className="text-xs font-bold text-foreground truncate max-w-[180px]">
                                    {res.title || 'Sumber Tersimpan'}
                                </span>
                            </div>
                            {onRemoveExistingResource && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveExistingResource(res.id)}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                                    title="Hapus Sumber"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate pl-9">
                            {res.type === 'link' ? res.path : res.path.split('/').pop()}
                        </div>
                    </div>
                ))}

                {/* New Resources */}
                {newResources.map((res) => (
                    <div key={`new-${res.id}`} className="p-3.5 rounded-xl bg-card border border-primary/20 space-y-3 group relative">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                                    res.type === 'link' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    {res.type === 'link' ? <Globe className="h-3.5 w-3.5" /> : <FolderOpen className="h-3.5 w-3.5" />}
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    {res.type === 'link' ? 'Link Baru' : 'File Baru'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemoveNewResource(res.id)}
                                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="Judul sumber (opsional)"
                            value={res.title}
                            onChange={(e) => onUpdateResource(res.id, 'title', e.target.value)}
                            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition min-h-[40px]"
                        />

                        {res.type === 'link' ? (
                            <div className="relative">
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                                </div>
                                <input
                                    type="url"
                                    placeholder="https://..."
                                    value={res.value}
                                    onChange={(e) => onUpdateResource(res.id, 'value', e.target.value)}
                                    className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-xs text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition min-h-[40px]"
                                />
                            </div>
                        ) : (
                            <div className="relative">
                                <div className={`flex items-center gap-3 rounded-xl border-2 border-dashed p-3 transition min-h-[48px] ${
                                    res.file ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-muted/20 hover:border-primary/30'
                                }`}>
                                    <Upload className={`h-4 w-4 shrink-0 ${res.file ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'}`} />
                                    <span className="text-xs font-medium text-muted-foreground truncate">
                                        {res.file ? res.file.name : 'Pilih file (PDF, PPT, Video)'}
                                    </span>
                                </div>
                                <input
                                    type="file"
                                    onChange={(e) => onUpdateResource(res.id, 'file', e.target.files?.[0] || null)}
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                />
                            </div>
                        )}
                    </div>
                ))}

                {/* Empty State */}
                {!hasContent && (
                    <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/10">
                        <p className="text-xs text-muted-foreground/50 font-bold">Belum ada sumber belajar tambahan</p>
                        <p className="text-[10px] text-muted-foreground/40 mt-1">Tambahkan link atau file di atas</p>
                    </div>
                )}
            </div>
        </div>
    );
}
