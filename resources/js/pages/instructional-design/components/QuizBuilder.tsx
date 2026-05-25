import React from 'react';
import { Trash2, Plus, X } from 'lucide-react';
import { assessmentColors } from './types';

interface QuizBuilderProps {
    assessmentKey: 'initial' | 'formative' | 'summative';
    instIdx: number | null; // null for initial assessment
    data: any;
    updateInitialConfig: (field: string, value: any) => void;
    updateFormativeConfig: (idx: number, field: string, value: any) => void;
    updateSummativeConfig: (idx: number, field: string, value: any) => void;
}

export default function QuizBuilder({
    assessmentKey,
    instIdx,
    data,
    updateInitialConfig,
    updateFormativeConfig,
    updateSummativeConfig,
}: QuizBuilderProps) {
    const inst = assessmentKey === 'initial'
        ? data.initial
        : (data as any)[assessmentKey].instruments[instIdx as number];

    const config = inst.instrument_config || {};
    const questions = config.questions || [];
    const colors = assessmentColors[assessmentKey];

    const updateConfig = (field: string, value: any) => {
        if (assessmentKey === 'initial') {
            updateInitialConfig(field, value);
        } else if (assessmentKey === 'formative') {
            updateFormativeConfig(instIdx as number, field, value);
        } else {
            updateSummativeConfig(instIdx as number, field, value);
        }
    };

    const addQuestion = () => {
        const newQs = [...questions, {
            type: 'multiple_choice',
            text: '',
            options: [
                { id: 'a', text: '' },
                { id: 'b', text: '' },
                { id: 'c', text: '' },
                { id: 'd', text: '' }
            ]
        }];
        updateConfig('questions', newQs);
    };

    const removeQuestion = (qIdx: number) => {
        const newQs = questions.filter((_: any, idx: number) => idx !== qIdx);
        updateConfig('questions', newQs);
    };

    const updateQuestionField = (qIdx: number, field: string, value: any) => {
        const newQs = [...questions];
        newQs[qIdx] = { ...newQs[qIdx], [field]: value };
        updateConfig('questions', newQs);
    };

    const updateOptionText = (qIdx: number, optIdx: number, value: string) => {
        const newQs = [...questions];
        const newOpts = [...(newQs[qIdx].options || [])];
        newOpts[optIdx] = { ...newOpts[optIdx], text: value };
        newQs[qIdx] = { ...newQs[qIdx], options: newOpts };
        updateConfig('questions', newQs);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                    Daftar Pertanyaan
                </label>
                <button
                    type="button"
                    onClick={addQuestion}
                    className="h-6 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10 rounded transition-colors"
                >
                    + Tambah Soal
                </button>
            </div>
            <div className="grid gap-3">
                {questions.map((q: any, qIdx: number) => (
                    <div
                        key={qIdx}
                        className="group relative flex flex-col gap-3 p-4 bg-card text-card-foreground rounded-md border border-border hover:border-primary/30 transition-all"
                    >
                        <button
                            type="button"
                            onClick={() => removeQuestion(qIdx)}
                            className="absolute top-3 right-3 text-muted-foreground/40 hover:text-[#EB5757] transition-colors p-1 opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded bg-muted/50 dark:bg-border/60 text-muted-foreground flex items-center justify-center text-[10px] font-mono shrink-0">
                                Q{qIdx + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-2 items-center">
                                    <select
                                        value={q.type || 'multiple_choice'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const opts = type === 'multiple_choice' ? [
                                                { id: 'a', text: '' },
                                                { id: 'b', text: '' },
                                                { id: 'c', text: '' },
                                                { id: 'd', text: '' }
                                            ] : [];
                                            const newQs = [...questions];
                                            newQs[qIdx] = { ...newQs[qIdx], type, options: opts };
                                            updateConfig('questions', newQs);
                                        }}
                                        className="h-7 rounded border border-border bg-popover text-foreground px-2 text-[10px] font-semibold outline-none focus:border-primary transition"
                                    >
                                        <option value="multiple_choice">Pilihan Ganda</option>
                                        <option value="short_answer">Isian Singkat</option>
                                    </select>
                                </div>

                                <textarea
                                    value={q.text || ''}
                                    onChange={(e) => updateQuestionField(qIdx, 'text', e.target.value)}
                                    placeholder="Tuliskan pertanyaan..."
                                    rows={2}
                                    className="w-full rounded border border-border bg-popover text-foreground px-3 py-2 text-[12px] outline-none focus:border-primary transition resize-none leading-relaxed"
                                />

                                {(q.type === 'multiple_choice' || !q.type) && (
                                    <div className="space-y-2 mt-2 pl-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Pilihan Jawaban (Klik huruf untuk set Kunci)
                                            </span>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {(q.options || []).map((opt: any, optIdx: number) => {
                                                const isCorrect = q.answer === opt.id;
                                                return (
                                                    <div key={optIdx} className="flex items-center gap-2 relative group/opt">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateQuestionField(qIdx, 'answer', opt.id)}
                                                            title="Jadikan sebagai kunci jawaban"
                                                            className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                                                                isCorrect
                                                                    ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20'
                                                                    : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                                            }`}
                                                        >
                                                            {opt.id}
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={opt.text || ''}
                                                            onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                                                            placeholder={`Opsi ${opt.id.toUpperCase()}`}
                                                            className={`w-full h-8 rounded border bg-popover text-foreground px-3 text-[11px] outline-none transition ${
                                                                isCorrect
                                                                    ? 'border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20'
                                                                    : 'border-border focus:border-primary'
                                                            }`}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {q.type === 'short_answer' && (
                                    <div className="space-y-1.5 mt-2 pl-1">
                                        <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">
                                            Kunci Jawaban Singkat
                                        </label>
                                        <input
                                            type="text"
                                            value={q.answer || ''}
                                            onChange={(e) => updateQuestionField(qIdx, 'answer', e.target.value)}
                                            placeholder="Tuliskan kunci jawaban yang benar di sini..."
                                            className="w-full h-8 rounded border border-border bg-popover text-foreground px-3 text-[11px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {questions.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-border rounded-lg bg-muted/10">
                        <p className="text-[11px] text-muted-foreground font-medium">Belum ada pertanyaan. Silakan tambahkan pertanyaan baru.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
