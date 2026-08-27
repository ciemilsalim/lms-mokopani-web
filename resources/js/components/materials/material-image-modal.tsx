import React, { useState } from 'react';
import {
    ImagePlus, X, Upload, Sparkles, Loader2, AlertTriangle, Star, Trash2
} from 'lucide-react';
import axios from 'axios';

interface ExistingImage {
    id: number;
    path: string;
    type: 'existing' | 'legacy';
}

interface MaterialImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageFiles: File[];
    setImageFiles: React.Dispatch<React.SetStateAction<File[]>>;
    imageUrls: string[];
    setImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
    existingImages?: ExistingImage[];
    onRemoveExistingImage?: (id: number) => void;
    thumbnail: File | null;
    thumbnailUrl: string | null;
    onSetThumbnailFile: (file: File) => void;
    onSetThumbnailUrl: (url: string) => void;
    onClearThumbnail: () => void;
    maxImages?: number;
}

export function MaterialImageModal({
    isOpen,
    onClose,
    imageFiles,
    setImageFiles,
    imageUrls,
    setImageUrls,
    existingImages = [],
    onRemoveExistingImage,
    thumbnail,
    thumbnailUrl,
    onSetThumbnailFile,
    onSetThumbnailUrl,
    onClearThumbnail,
    maxImages = 6,
}: MaterialImageModalProps) {
    const [imageDescription, setImageDescription] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [imageModalTab, setImageModalTab] = useState<'upload' | 'ai'>('upload');
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const totalImages = existingImages.length + imageFiles.length + imageUrls.length;

    const handleGenerateImage = async () => {
        if (!imageDescription || totalImages >= maxImages) return;
        setIsGeneratingImage(true);
        setUploadProgress(0);

        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 10;
                setUploadProgress(progress);
            }
        }, 500);

        try {
            const response = await axios.post(route('ai.generate-illustration'), {
                description: imageDescription
            });
            if (response.data?.status === 'success') {
                setUploadProgress(100);
                clearInterval(progressInterval);
                setTimeout(() => {
                    setUploadProgress(null);
                    setImageUrls(prev => [...prev, response.data.url]);
                    setImageDescription('');
                    if (totalImages + 1 >= maxImages) onClose();
                }, 500);
            }
        } catch (error) {
            clearInterval(progressInterval);
            setUploadProgress(null);
            console.error('Failed to generate image', error);
            alert('Gagal menghasilkan gambar. Pastikan AI terkonfigurasi dengan benar.');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        const remaining = maxImages - totalImages;
        const toAdd = files.slice(0, remaining);

        setUploadProgress(0);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 25;
            setUploadProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setUploadProgress(null);
                    setImageFiles(prev => [...prev, ...toAdd]);
                    if (totalImages + toAdd.length >= maxImages) onClose();
                }, 300);
            }
        }, 100);

        e.target.value = '';
    };

    const removeImageFile = (index: number) => {
        const fileToRemove = imageFiles[index];
        if (thumbnail === fileToRemove) onClearThumbnail();
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeImageUrl = (index: number) => {
        const urlToRemove = imageUrls[index];
        if (thumbnailUrl === urlToRemove) onClearThumbnail();
        setImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                    <h3 className="font-bold text-base flex items-center gap-2">
                        <ImagePlus className="w-5 h-5 text-primary" />
                        Tambah Gambar ({totalImages}/{maxImages})
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Selector */}
                <div className="flex border-b border-border shrink-0">
                    <button
                        type="button"
                        onClick={() => setImageModalTab('upload')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition border-b-2 min-h-[48px] ${
                            imageModalTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Upload className="w-4 h-4" />
                        Upload
                    </button>
                    <button
                        type="button"
                        onClick={() => setImageModalTab('ai')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition border-b-2 min-h-[48px] ${
                            imageModalTab === 'ai' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Generate AI
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    {totalImages >= maxImages && (
                        <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 text-xs rounded-xl border border-amber-500/20 flex items-center gap-2 font-medium">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            Batas maksimal {maxImages} gambar sudah tercapai.
                        </div>
                    )}

                    {imageModalTab === 'upload' ? (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Format: JPG, PNG, WEBP (maks 4MB/gambar).
                            </p>
                            <label className={`flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                                totalImages >= maxImages ? 'border-border bg-muted/30 opacity-50 cursor-not-allowed' : 'border-border hover:border-primary/50 hover:bg-primary/5'
                            }`}>
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Upload className="h-6 w-6" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-foreground">Klik untuk pilih gambar</p>
                                    <p className="text-xs text-muted-foreground mt-1">atau seret file ke sini</p>
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    disabled={totalImages >= maxImages}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Ketikkan deskripsi gambar yang Anda inginkan. AI akan merender gambar secara otomatis.
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-foreground block">Deskripsi Gambar</label>
                                <textarea
                                    value={imageDescription}
                                    onChange={(e) => setImageDescription(e.target.value)}
                                    placeholder="Contoh: Anak-anak SD sedang membaca buku di perpustakaan..."
                                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition min-h-[100px]"
                                    rows={4}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateImage}
                                disabled={isGeneratingImage || !imageDescription || totalImages >= maxImages}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition disabled:opacity-50 min-h-[48px]"
                            >
                                {isGeneratingImage ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4" /> Generate Gambar</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Image Preview Grid */}
                    {totalImages > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Preview</p>
                            <div className="grid grid-cols-3 gap-2">
                                {existingImages.map((img) => (
                                    <div key={`existing-${img.id}`} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
                                        <img src={img.path} className="w-full h-full object-cover" alt="Gambar materi" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                                            {img.type === 'existing' && onRemoveExistingImage && (
                                                <button type="button" onClick={() => onRemoveExistingImage(img.id)} className="p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-white transition shadow-sm" title="Hapus">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">{img.type === 'legacy' ? 'Thumbnail' : 'Tersimpan'}</span>
                                    </div>
                                ))}
                                {imageFiles.map((file, idx) => (
                                    <div key={`file-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt={`Upload ${idx + 1}`} />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                                            <button type="button" onClick={() => { onSetThumbnailFile(file); }} className="p-1.5 rounded-full bg-white/90 text-amber-500 hover:bg-white transition shadow-sm" title="Jadikan Thumbnail">
                                                <Star className="h-3.5 w-3.5" />
                                            </button>
                                            <button type="button" onClick={() => removeImageFile(idx)} className="p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-white transition shadow-sm" title="Hapus">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">Upload</span>
                                        {thumbnail === file && (
                                            <span className="absolute top-1 right-1 text-[8px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                                                <Star className="h-2.5 w-2.5 fill-current" /> Thumb
                                            </span>
                                        )}
                                    </div>
                                ))}
                                {imageUrls.map((url, idx) => (
                                    <div key={`url-${idx}`} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-muted/30">
                                        <img src={url} className="w-full h-full object-cover" alt={`AI ${idx + 1}`} />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                                            <button type="button" onClick={() => { onSetThumbnailUrl(url); }} className="p-1.5 rounded-full bg-white/90 text-amber-500 hover:bg-white transition shadow-sm" title="Jadikan Thumbnail">
                                                <Star className="h-3.5 w-3.5" />
                                            </button>
                                            <button type="button" onClick={() => removeImageUrl(idx)} className="p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-white transition shadow-sm" title="Hapus">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-primary/80 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" /> AI</span>
                                        {thumbnailUrl === url && (
                                            <span className="absolute top-1 right-1 text-[8px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                                                <Star className="h-2.5 w-2.5 fill-current" /> Thumb
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex justify-end bg-muted/5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted rounded-xl transition min-h-[44px]"
                    >
                        Selesai
                    </button>
                </div>

                {/* Upload Progress */}
                {uploadProgress !== null && (
                    <div className="px-4 pb-4">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
                            />
                        </div>
                        <p className="text-center text-xs font-medium text-muted-foreground mt-2">
                            {uploadProgress >= 100 ? 'Berhasil ditambahkan!' : 'Memproses...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
