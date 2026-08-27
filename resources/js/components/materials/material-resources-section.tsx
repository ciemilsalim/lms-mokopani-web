import React from 'react';
import { FileText, Youtube, Globe, Download, ExternalLink, Image as ImageIcon, Video } from 'lucide-react';
import { SectionHeader } from '@/components/dashboard';

export interface ResourceItem {
    id: number;
    type: 'file' | 'link' | 'youtube' | 'image' | string;
    title: string | null;
    path: string;
    file_type?: string | null;
}

interface MaterialResourcesSectionProps {
    resources?: ResourceItem[];
    mainFilePath?: string | null;
    mainFileType?: string | null;
    externalLink?: string | null;
}

export function MaterialResourcesSection({
    resources = [],
    mainFilePath,
    mainFileType,
    externalLink,
}: MaterialResourcesSectionProps) {
    const hasResources = resources.length > 0 || mainFilePath || externalLink;
    if (!hasResources) return null;

    return (
        <div className="space-y-3.5 fade-in">
            <SectionHeader
                title="Materi & Berkas Belajar"
                subtitle="Dokumen, video, dan tautan pembelajaran pendukung"
                icon={FileText}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Main File Attachment */}
                {mainFilePath && (
                    <a
                        href={mainFilePath.startsWith('http') ? mainFilePath : `/storage/${mainFilePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs transition-all active:scale-[0.98] min-h-[56px]"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                    Berkas Utama Pembelajaran
                                </h4>
                                <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                                    {mainFileType || 'Dokumen'} • Klik untuk Mengunduh
                                </p>
                            </div>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </a>
                )}

                {/* External Link */}
                {externalLink && (
                    <a
                        href={externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs transition-all active:scale-[0.98] min-h-[56px]"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                    Tautan Referensi Eksternal
                                </h4>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {externalLink}
                                </p>
                            </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </a>
                )}

                {/* Additional Resources */}
                {resources.map((res) => {
                    if (res.type === 'youtube') {
                        let embedUrl = res.path;
                        if (res.path.includes('watch?v=')) {
                            embedUrl = res.path.replace('watch?v=', 'embed/');
                        } else if (res.path.includes('youtu.be/')) {
                            embedUrl = res.path.replace('youtu.be/', 'youtube.com/embed/');
                        }

                        return (
                            <div key={res.id} className="sm:col-span-2 space-y-2 p-4 rounded-2xl bg-card border border-border/70 shadow-2xs">
                                <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                                    <Youtube className="h-4 w-4 text-rose-600" />
                                    <span>{res.title || 'Video Pembelajaran YouTube'}</span>
                                </div>
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/90">
                                    <iframe
                                        src={embedUrl}
                                        title={res.title || 'YouTube Video'}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <a
                            key={res.id}
                            href={res.path.startsWith('http') ? res.path : `/storage/${res.path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs transition-all active:scale-[0.98] min-h-[56px]"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    {res.type === 'image' ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                        {res.title || 'Berkas Lampiran'}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                                        {res.file_type || res.type}
                                    </p>
                                </div>
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
