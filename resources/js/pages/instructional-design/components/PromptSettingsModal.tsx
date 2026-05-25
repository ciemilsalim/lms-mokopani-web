import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Save, Loader2, Sparkles, HelpCircle, Code, Check } from 'lucide-react';
import axios from 'axios';

interface Prompt {
    key: string;
    name: string;
    description: string;
    placeholders: string[];
    default_prompt: string;
    custom_prompt: string | null;
    prompt_text: string;
    is_custom: boolean;
}

interface PromptSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PromptSettingsModal({ isOpen, onClose }: PromptSettingsModalProps) {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [activeKey, setActiveKey] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isResetting, setIsResetting] = useState<boolean>(false);
    const [editedText, setEditedText] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Fetch prompts from API
    const fetchPrompts = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(route('instructional-design.prompts.get'));
            setPrompts(response.data);
            if (response.data.length > 0) {
                // Keep active tab if already selected, otherwise pick first
                const current = response.data.find((p: Prompt) => p.key === activeKey);
                if (current) {
                    setEditedText(current.prompt_text);
                } else {
                    setActiveKey(response.data[0].key);
                    setEditedText(response.data[0].prompt_text);
                }
            }
        } catch (error) {
            console.error('Failed to fetch prompts', error);
            showToast('Gagal memuat konfigurasi prompt.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPrompts();
        }
    }, [isOpen]);

    // Handle tab switch
    const handleTabChange = (key: string) => {
        setActiveKey(key);
        const selected = prompts.find(p => p.key === key);
        if (selected) {
            setEditedText(selected.prompt_text);
        }
    };

    // Show custom toast feedback
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Insert placeholder at cursor
    const handleInsertPlaceholder = (placeholder: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        const newText = before + placeholder + after;
        setEditedText(newText);

        // Reset cursor position after state update
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
        }, 50);
    };

    // Save prompt to database
    const handleSave = async () => {
        if (!activeKey) return;
        setIsSaving(true);
        try {
            const response = await axios.post(route('instructional-design.prompts.save'), {
                key: activeKey,
                prompt_text: editedText,
            });

            if (response.data.success) {
                showToast('Prompt berhasil disimpan khusus untuk Anda!', 'success');
                // Refresh data to update badges/status
                fetchPrompts();
            }
        } catch (error) {
            console.error('Failed to save prompt', error);
            showToast('Gagal menyimpan prompt.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Reset prompt to system default
    const handleReset = async () => {
        if (!activeKey) return;
        if (!confirm('Apakah Anda yakin ingin mengembalikan prompt ini ke pengaturan default bawaan sistem? Semua kustomisasi Anda untuk prompt ini akan dihapus.')) return;
        
        setIsResetting(true);
        try {
            const response = await axios.post(route('instructional-design.prompts.reset'), {
                key: activeKey,
            });

            if (response.data.success) {
                showToast('Prompt berhasil di-reset ke default.', 'success');
                fetchPrompts();
            }
        } catch (error) {
            console.error('Failed to reset prompt', error);
            showToast('Gagal me-reset prompt.', 'error');
        } finally {
            setIsResetting(false);
        }
    };

    if (!isOpen) return null;

    const activePrompt = prompts.find(p => p.key === activeKey);

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
            {/* Backdrop click close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Slide-over panel */}
            <div className="relative w-full max-w-3xl h-full bg-popover/95 border-l border-border/80 shadow-2xl flex flex-col animate-slide-in-right">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                        <div>
                            <h3 className="text-base font-bold text-foreground">Pengaturan Prompt AI</h3>
                            <p className="text-[11px] text-muted-foreground">Kustomisasi instruksi AI yang hanya berlaku untuk akun Anda sendiri.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Main Content Area */}
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground uppercase font-mono tracking-widest">Memuat Konfigurasi...</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        
                        {/* Prompt Tabs Sidebar */}
                        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/60 bg-muted/10 p-4 flex flex-col gap-2 overflow-y-auto">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block px-2">Daftar Prompt AI</span>
                            {prompts.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => handleTabChange(p.key)}
                                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all relative flex flex-col gap-1 ${
                                        activeKey === p.key
                                            ? 'bg-primary/5 border-primary text-foreground font-semibold shadow-sm'
                                            : 'bg-card border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/10'
                                    }`}
                                >
                                    <span className="truncate">{p.name}</span>
                                    {p.is_custom ? (
                                        <span className="inline-flex self-start px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                                            Kustom
                                        </span>
                                    ) : (
                                        <span className="inline-flex self-start px-2 py-0.5 rounded-full text-[9px] font-semibold bg-muted border border-border text-muted-foreground">
                                            Bawaan
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Prompt Editor Area */}
                        {activePrompt && (
                            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                                {/* Prompt Title & Description */}
                                <div className="space-y-1.5 p-4 rounded-2xl bg-card border border-border shadow-sm">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Code className="h-4 w-4 text-primary" /> {activePrompt.name}
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{activePrompt.description}</p>
                                </div>

                                {/* Placeholder Tags Bar */}
                                {activePrompt.placeholders && activePrompt.placeholders.length > 0 && (
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <HelpCircle className="h-3.5 w-3.5" /> Placeholder Dinamis (Klik untuk menyisipkan):
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                            {activePrompt.placeholders.map(placeholder => (
                                                <button
                                                    key={placeholder}
                                                    type="button"
                                                    onClick={() => handleInsertPlaceholder(placeholder)}
                                                    className="px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-[11px] text-primary font-mono transition-all hover:scale-105"
                                                >
                                                    {placeholder}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Editor Textarea */}
                                <div className="flex-1 flex flex-col min-h-[250px] relative">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Isi Prompt AI</label>
                                    <textarea
                                        ref={textareaRef}
                                        value={editedText}
                                        onChange={e => setEditedText(e.target.value)}
                                        className="flex-1 w-full p-4 rounded-2xl border border-border bg-card text-xs text-foreground font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none outline-none leading-relaxed shadow-inner"
                                        placeholder="Tuliskan instruksi prompt sistem di sini..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Controls */}
                {!isLoading && activePrompt && (
                    <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={isResetting || isSaving || !activePrompt.is_custom}
                            className="h-10 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-[13px] flex items-center gap-2 transition disabled:opacity-40"
                        >
                            {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 text-muted-foreground" />}
                            Reset ke Bawaan
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving || isResetting}
                            className="h-10 px-5 rounded-xl bg-primary text-white hover:bg-primary/90 font-semibold text-[13px] flex items-center gap-2 shadow-lg shadow-primary/25 transition disabled:opacity-40"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Simpan Prompt Saya
                        </button>
                    </div>
                )}

                {/* Floating custom toast */}
                {toast && (
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl animate-slide-in-top border border-border/50 text-xs font-semibold bg-popover text-foreground">
                        {toast.type === 'success' ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                            <X className="h-4 w-4 text-rose-400" />
                        )}
                        <span>{toast.message}</span>
                    </div>
                )}

            </div>
        </div>
    );
}
