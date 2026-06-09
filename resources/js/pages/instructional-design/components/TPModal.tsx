import React from 'react';
import { X, Target, Hash, AlignLeft, Sparkles, Loader2, Check } from 'lucide-react';
import { CpItem } from './types';

interface TPModalProps {
    isOpen: boolean;
    onClose: () => void;
    cpList: CpItem[];
    subjectId: string;
    processing: boolean;
    activeTPTab: 'direct' | 'analysis' | 'cross_element';
    setActiveTPTab: (tab: 'direct' | 'analysis' | 'cross_element') => void;
    tpForm: {
        code: string;
        cp_id: string;
        competence: string;
        content: string;
        description: string;
        subject_id: string;
    };
    setTpForm: React.Dispatch<React.SetStateAction<any>>;
    selectedCps: number[];
    setSelectedCps: (cps: number[]) => void;
    directSuggestions: Array<{ text: string; is_used: boolean }>;
    setDirectSuggestions: (suggestions: any[]) => void;
    suggestObjectives: () => void;
    handleCreateTP: (e: React.FormEvent) => void;
}

export default function TPModal({
    isOpen,
    onClose,
    cpList,
    subjectId,
    processing,
    activeTPTab,
    setActiveTPTab,
    tpForm,
    setTpForm,
    selectedCps,
    setSelectedCps,
    directSuggestions,
    setDirectSuggestions,
    suggestObjectives,
    handleCreateTP,
}: TPModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl rounded-xl bg-background border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between border-b border-border pb-4 mb-5">
                    <div>
                        <h4 className="text-[14px] font-bold uppercase tracking-[0.05em] text-foreground flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Rumuskan Tujuan Pembelajaran (TP)
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.05em] mt-1">
                            Gunakan salah satu dari 3 metode perumusan
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted/50 dark:hover:bg-accent/40 transition text-muted-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tab Selector */}
                <div className="flex p-1 bg-muted/50 dark:bg-border/60/50 rounded-lg mb-6">
                    {[
                        { id: 'direct', label: 'Salin CP', desc: 'Praktis' },
                        { id: 'analysis', label: 'Analisis', desc: 'Kompetensi & Konten' },
                        { id: 'cross_element', label: 'Lintas Elemen', desc: 'Terintegrasi' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActiveTPTab(tab.id as any);
                                setDirectSuggestions([]);
                            }}
                            className={`flex-1 flex flex-col items-center py-2.5 rounded-md transition ${activeTPTab === tab.id ? 'bg-card dark:bg-popover shadow-md' : 'hover:bg-muted/50 dark:hover:bg-accent/40'}`}
                        >
                            <span className={`text-[11px] font-bold ${activeTPTab === tab.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                {tab.label}
                            </span>
                            <span className="text-[9px] font-semibold text-muted-foreground/60 uppercase">
                                {tab.desc}
                            </span>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleCreateTP} className="space-y-5">
                    {/* Kode TP */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em] flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-primary" />
                            Kode (Opsional)
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: TP 1.1"
                            value={tpForm.code}
                            onChange={(e) => setTpForm({ ...tpForm, code: e.target.value })}
                            className="w-full rounded-lg border border-border bg-muted/30 dark:bg-popover px-4 py-2.5 text-[13px] font-medium text-foreground outline-none focus:border-primary transition"
                        />
                    </div>

                    {/* CP Selection */}
                    {activeTPTab === 'cross_element' ? (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em] flex items-center gap-1.5">
                                <Target className="h-3 w-3 text-primary" />
                                Pilih Beberapa CP untuk Digabungkan
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-muted/30 dark:bg-popover rounded-lg border border-border">
                                {cpList
                                    .filter(cp => cp.subject.id.toString() === subjectId)
                                    .map(cp => (
                                        <label
                                            key={cp.id}
                                            className={`flex items-start gap-2.5 p-2.5 rounded-md border transition cursor-pointer ${selectedCps.includes(cp.id) ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-card text-card-foreground border-border hover:border-[#8A8F98]/30'}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCps.includes(cp.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedCps([...selectedCps, cp.id]);
                                                    else setSelectedCps(selectedCps.filter(id => id !== cp.id));
                                                }}
                                                className="mt-0.5 rounded border-[#8A8F98] text-primary focus:ring-primary/20"
                                            />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-tight text-foreground">{cp.elemen}</span>
                                                <span className="text-[9px] font-medium text-muted-foreground line-clamp-2">{cp.deskripsi}</span>
                                            </div>
                                        </label>
                                    ))
                                }
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em] flex items-center gap-1.5">
                                <Target className="h-3 w-3 text-primary" />
                                Rujukan Capaian Pembelajaran (CP)
                            </label>
                            <select
                                value={tpForm.cp_id}
                                onChange={(e) => {
                                    setTpForm({ ...tpForm, cp_id: e.target.value });
                                    setDirectSuggestions([]);
                                }}
                                className="w-full rounded-lg border border-border bg-muted/30 dark:bg-popover px-4 py-2.5 text-[13px] font-medium text-foreground outline-none focus:border-primary transition"
                            >
                                <option value="">-- Pilih Elemen CP --</option>
                                {cpList
                                    .filter(cp => cp.subject.id.toString() === subjectId)
                                    .map(cp => <option key={cp.id} value={cp.id}>{cp.elemen} (Fase {cp.fase})</option>)
                                }
                            </select>
                        </div>
                    )}

                    {/* Direct Suggestions */}
                    {activeTPTab === 'direct' && directSuggestions.length > 0 && (
                        <div className="space-y-2.5 p-4 bg-primary/5 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-bottom-2">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-[0.05em]">Pilih Kalimat TP yang Sesuai</label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {directSuggestions.map((s, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={s.is_used}
                                        onClick={() => setTpForm({ ...tpForm, description: s.text })}
                                        className={`w-full text-left p-3 rounded-lg border transition flex items-start justify-between gap-2 ${s.is_used ? 'bg-muted/50 dark:bg-border/60/50 opacity-50 cursor-not-allowed border-transparent' : tpForm.description === s.text ? 'bg-primary border-primary text-white' : 'bg-card text-card-foreground border-border hover:border-primary/40 shadow-sm'}`}
                                    >
                                        <span className="text-[12px] font-medium leading-relaxed">{s.text}</span>
                                        {s.is_used ? (
                                            <span className="shrink-0 text-[9px] font-bold uppercase text-muted-foreground/60 bg-[#8A8F98]/10 px-2 py-0.5 rounded">Terpakai</span>
                                        ) : tpForm.description === s.text ? (
                                            <Check className="h-4 w-4 shrink-0" />
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-muted-foreground font-semibold text-center uppercase italic">Kalimat yang sudah digunakan tidak dapat dipilih kembali.</p>
                        </div>
                    )}

                    {/* Analysis Fields */}
                    {activeTPTab === 'analysis' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-[0.05em]">Kompetensi (Kata Kerja)</label>
                                <input
                                    value={tpForm.competence}
                                    onChange={e => setTpForm({ ...tpForm, competence: e.target.value })}
                                    placeholder="Misal: Menyajikan, Memahami"
                                    className="w-full bg-card text-card-foreground rounded-md px-3 py-2 text-[12px] font-medium outline-none border border-primary/20 focus:border-primary transition text-foreground"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-[0.05em]">Konten (Materi Pokok)</label>
                                <input
                                    value={tpForm.content}
                                    onChange={e => setTpForm({ ...tpForm, content: e.target.value })}
                                    placeholder="Misal: Nilai tempat bilangan"
                                    className="w-full bg-card text-card-foreground rounded-md px-3 py-2 text-[12px] font-medium outline-none border border-primary/20 focus:border-primary transition text-foreground"
                                />
                            </div>
                        </div>
                    )}

                    {/* Description + Auto Suggest */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.05em] flex items-center gap-1.5">
                                <AlignLeft className="h-3 w-3 text-primary" />
                                Rumusan Kalimat TP
                            </label>
                            <button
                                type="button"
                                onClick={suggestObjectives}
                                disabled={processing || (activeTPTab !== 'cross_element' && !tpForm.cp_id) || (activeTPTab === 'cross_element' && selectedCps.length === 0)}
                                className="h-7 px-2.5 rounded bg-primary/10 text-primary hover:bg-primary/20 text-[10px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                {activeTPTab === 'direct' && directSuggestions.length > 0 ? 'Segarkan' : 'Rumuskan Otomatis'}
                            </button>
                        </div>
                        <textarea
                            rows={activeTPTab === 'direct' && directSuggestions.length > 0 ? 2 : 3}
                            placeholder="Tuliskan rumusan tujuan pembelajaran di sini atau klik 'Rumuskan Otomatis'..."
                            value={tpForm.description}
                            onChange={(e) => setTpForm({ ...tpForm, description: e.target.value })}
                            className="w-full rounded-lg border border-border bg-muted/30 dark:bg-popover px-4 py-3 text-[13px] font-medium text-foreground outline-none focus:border-primary transition leading-relaxed resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={processing || !tpForm.description}
                        className="w-full rounded-lg bg-primary py-3 text-[13px] font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:opacity-50"
                    >
                        {processing ? 'Menyimpan...' : 'Terbitkan Tujuan Pembelajaran'}
                    </button>
                </form>
            </div>
        </div>
    );
}
