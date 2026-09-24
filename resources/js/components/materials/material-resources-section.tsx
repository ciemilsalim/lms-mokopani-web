import React, { useState } from 'react';
import { 
    FileText, Youtube, Globe, Download, ExternalLink, 
    Image as ImageIcon, Video, X, Maximize2 
} from 'lucide-react';
import { SectionHeader } from '@/components/dashboard';

export interface ResourceItem {
    id: number;
    type: 'file' | 'link' | 'youtube' | 'image' | 'video' | string;
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

function getYoutubeEmbedUrl(url: string): string | null {
    if (!url) return null;
    try {
        if (url.includes('youtube.com/watch')) {
            const v = new URL(url).searchParams.get('v');
            return v ? `https://www.youtube.com/embed/${v}` : null;
        }
        if (url.includes('youtu.be/')) {
            const id = url.split('youtu.be/')[1]?.split('?')[0];
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (url.includes('youtube.com/shorts/')) {
            const id = url.split('youtube.com/shorts/')[1]?.split('?')[0];
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (url.includes('youtube.com/embed/')) {
            return url;
        }
    } catch {
        return null;
    }
    return null;
}

function isImageFile(pathOrType?: string | null): boolean {
    if (!pathOrType) return false;
    const lower = pathOrType.toLowerCase();
    return (
        lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.svg') ||
        lower.includes('image/')
    );
}

function isVideoFile(pathOrType?: string | null): boolean {
    if (!pathOrType) return false;
    const lower = pathOrType.toLowerCase();
    return (
        lower.endsWith('.mp4') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.ogg') ||
        lower.includes('video/')
    );
}

export function MaterialResourcesSection({
    resources = [],
    mainFilePath,
    mainFileType,
    externalLink,
}: MaterialResourcesSectionProps) {
    const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

    const hasResources = resources.length > 0 || mainFilePath || externalLink;
    if (!hasResources) return null;

    const externalYoutubeEmbed = externalLink ? getYoutubeEmbedUrl(externalLink) : null;
    const mainFileUrl = mainFilePath ? (mainFilePath.startsWith('http') ? mainFilePath : `/storage/${mainFilePath}`) : null;
    const isMainFileImage = isImageFile(mainFilePath) || isImageFile(mainFileType);
    const isMainFileVideo = isVideoFile(mainFilePath) || isVideoFile(mainFileType);

    return (
        <div className="space-y-4 fade-in w-full min-w-0 max-w-full overflow-hidden">
            <SectionHeader
                title="Materi & Berkas Belajar"
                subtitle="Dokumen, video, dan tautan pembelajaran pendukung"
                icon={FileText}
            />

            {/* External Link Video Embed if YouTube */}
            {externalLink && externalYoutubeEmbed && (
                <div className="space-y-2 p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <Youtube className="h-4 w-4 text-rose-600" />
                            <span>Video Pembelajaran Eksternal (YouTube)</span>
                        </div>
                        <a
                            href={externalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                        >
                            <span>Buka di YouTube</span>
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/95 shadow-inner">
                        <iframe
                            src={externalYoutubeEmbed}
                            title="Video Pembelajaran Eksternal"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}

            {/* Main File Media Embeds (if image or video) */}
            {mainFileUrl && isMainFileImage && (
                <div className="space-y-2 p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <ImageIcon className="h-4 w-4 text-amber-600" />
                            <span>Gambar Utama Pembelajaran</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPreviewImage({ src: mainFileUrl, title: 'Gambar Utama Pembelajaran' })}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                            >
                                <Maximize2 className="h-3 w-3" />
                                <span>Perbesar</span>
                            </button>
                            <a
                                href={mainFileUrl}
                                download
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                            >
                                <Download className="h-3 w-3" />
                                <span>Unduh</span>
                            </a>
                        </div>
                    </div>
                    <div 
                        onClick={() => setPreviewImage({ src: mainFileUrl, title: 'Gambar Utama Pembelajaran' })}
                        className="rounded-2xl overflow-hidden border border-border/60 bg-muted/20 cursor-pointer group relative flex items-center justify-center w-full min-w-0"
                    >
                        <img
                            src={mainFileUrl}
                            alt="Berkas Utama Pembelajaran"
                            className="w-full h-auto max-h-[85vh] object-contain group-hover:scale-[1.01] transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-bold flex items-center gap-1.5">
                                <Maximize2 className="h-3.5 w-3.5" />
                                Klik untuk Memperbesar
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {mainFileUrl && isMainFileVideo && (
                <div className="space-y-2 p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <Video className="h-4 w-4 text-sky-600" />
                            <span>Video Pembelajaran Utama</span>
                        </div>
                        <a
                            href={mainFileUrl}
                            download
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                        >
                            <Download className="h-3 w-3" />
                            <span>Unduh Video</span>
                        </a>
                    </div>
                    <div className="w-full rounded-2xl overflow-hidden bg-black/95 shadow-inner flex items-center justify-center">
                        <video controls className="w-full h-auto max-h-[85vh] object-contain">
                            <source src={mainFileUrl} type={mainFileType || 'video/mp4'} />
                            Browser Anda tidak mendukung tag video HTML5.
                        </video>
                    </div>
                </div>
            )}

            {/* Grid of File Cards and Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Main File Attachment (if not already rendered as image/video preview) */}
                {mainFilePath && !isMainFileImage && !isMainFileVideo && (
                    <a
                        href={mainFileUrl || '#'}
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

                {/* External Link (if not already rendered as YouTube embed) */}
                {externalLink && !externalYoutubeEmbed && (
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
                    const isYt = res.type === 'youtube' || (res.path && (res.path.includes('youtube.com') || res.path.includes('youtu.be')));
                    const isImg = res.type === 'image' || isImageFile(res.path) || isImageFile(res.file_type);
                    const isVid = res.type === 'video' || isVideoFile(res.path) || isVideoFile(res.file_type);
                    const resUrl = res.path.startsWith('http') ? res.path : `/storage/${res.path}`;

                    if (isYt) {
                        const embedUrl = getYoutubeEmbedUrl(res.path) || res.path;
                        return (
                            <div key={res.id} className="sm:col-span-2 space-y-2 p-4 rounded-2xl bg-card border border-border/70 shadow-2xs">
                                <div className="flex items-center justify-between gap-2 text-xs font-bold text-foreground mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Youtube className="h-4 w-4 text-rose-600 shrink-0" />
                                        <span className="truncate">{res.title || 'Video Pembelajaran YouTube'}</span>
                                    </div>
                                    <a
                                        href={res.path}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0"
                                    >
                                        <span>Buka</span>
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
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

                    if (isImg) {
                        return (
                            <div key={res.id} className="sm:col-span-2 p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs space-y-3 w-full min-w-0 max-w-full overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <ImageIcon className="h-4 w-4 text-amber-600 shrink-0" />
                                        <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                            {res.title || 'Gambar Lampiran'}
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewImage({ src: resUrl, title: res.title || 'Gambar Lampiran' })}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            <Maximize2 className="h-3 w-3" />
                                            <span>Perbesar</span>
                                        </button>
                                        <a
                                            href={resUrl}
                                            download
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                                            title="Unduh"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            <span>Unduh</span>
                                        </a>
                                    </div>
                                </div>
                                <div
                                    onClick={() => setPreviewImage({ src: resUrl, title: res.title || 'Gambar Lampiran' })}
                                    className="relative rounded-2xl overflow-hidden bg-muted/20 border border-border/40 cursor-pointer group flex items-center justify-center w-full min-w-0"
                                >
                                    <img
                                        src={resUrl}
                                        alt={res.title || 'Gambar Lampiran'}
                                        className="w-full h-auto max-h-[85vh] object-contain group-hover:scale-[1.01] transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-bold flex items-center gap-1.5">
                                            <Maximize2 className="h-3.5 w-3.5" />
                                            Klik untuk Memperbesar
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (isVid) {
                        return (
                            <div key={res.id} className="sm:col-span-2 space-y-2 p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
                                <div className="flex items-center justify-between gap-2 text-xs font-bold text-foreground mb-1">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Video className="h-4 w-4 text-sky-600 shrink-0" />
                                        <span className="truncate">{res.title || 'Video Pembelajaran'}</span>
                                    </div>
                                    <a
                                        href={resUrl}
                                        download
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                        <Download className="h-3 w-3" />
                                        <span>Unduh Video</span>
                                    </a>
                                </div>
                                <div className="w-full rounded-2xl overflow-hidden bg-black/95 shadow-inner flex items-center justify-center">
                                    <video controls className="w-full h-auto max-h-[85vh] object-contain">
                                        <source src={resUrl} type={res.file_type || 'video/mp4'} />
                                        Browser Anda tidak mendukung tag video HTML5.
                                    </video>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <a
                            key={res.id}
                            href={resUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 shadow-2xs transition-all active:scale-[0.98] min-h-[56px]"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                    <FileText className="h-5 w-5" />
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

            {/* Image Preview Lightbox Modal */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <div 
                        className="relative max-w-4xl max-h-[90vh] bg-card rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3 overflow-hidden flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-full flex items-center justify-between pb-2 border-b border-border/60">
                            <h3 className="text-sm font-bold text-foreground truncate">{previewImage.title}</h3>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewImage.src}
                                    download
                                    className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground transition"
                                    title="Unduh Gambar"
                                >
                                    <Download className="h-4 w-4" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPreviewImage(null)}
                                    className="p-1.5 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground transition cursor-pointer"
                                    title="Tutup"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto max-h-[75vh] flex items-center justify-center rounded-2xl bg-muted/20 p-2">
                            <img
                                src={previewImage.src}
                                alt={previewImage.title}
                                className="max-w-full max-h-[70vh] object-contain rounded-xl"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
