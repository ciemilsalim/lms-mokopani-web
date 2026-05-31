import React from 'react';
import { Trash2, ListChecks, PenTool, Layers } from 'lucide-react';

interface QuizBuilderProps {
    assessmentKey: 'initial' | 'formative' | 'summative';
    instIdx: number | null;
    data: any;
    updateInitialConfig: (field: string, value: any) => void;
    updateFormativeConfig: (idx: number, field: string, value: any) => void;
    updateSummativeConfig: (idx: number, field: string, value: any) => void;
}

const generateMCQ = (idx: number) => ({
    id: `q${idx}`,
    type: 'multiple_choice',
    text: '',
    points: 1,
    options: [
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' }
    ]
});

const generateEssay = (idx: number) => ({
    id: `q${idx}`,
    type: 'essay',
    text: '',
    points: 5,
    answer: '',
    correct_answer: ''
});

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
    const quizMode = config.quiz_mode || '';

    const updateConfig = (field: string, value: any) => {
        if (assessmentKey === 'initial') {
            updateInitialConfig(field, value);
        } else if (assessmentKey === 'formative') {
            updateFormativeConfig(instIdx as number, field, value);
        } else {
            updateSummativeConfig(instIdx as number, field, value);
        }
    };

    const handleModeChange = (mode: string) => {
        updateConfig('quiz_mode', mode);
        let newQuestions: any[] = [];
        if (mode === 'mcq') {
            newQuestions = Array.from({ length: 10 }, (_, i) => generateMCQ(i + 1));
        } else if (mode === 'essay') {
            newQuestions = Array.from({ length: 5 }, (_, i) => generateEssay(i + 1));
        } else if (mode === 'mixed') {
            newQuestions = [
                ...Array.from({ length: 5 }, (_, i) => generateMCQ(i + 1)),
                ...Array.from({ length: 3 }, (_, i) => generateEssay(i + 6))
            ];
        }
        updateConfig('questions', newQuestions);
    };

    // Auto-initialize 3 tiered questions for Initial Assessment
    React.useEffect(() => {
        if (assessmentKey === 'initial' && questions.length !== 3) {
            const initialQs = [
                { id: 'q1', type: 'short_answer', text: '', answer: '', correct_answer: '' },
                { id: 'q2', type: 'short_answer', text: '', answer: '', correct_answer: '' },
                { id: 'q3', type: 'essay', text: '', answer: '', correct_answer: '' }
            ];
            updateConfig('questions', initialQs);
        }
    }, [assessmentKey, questions.length]);

    const addQuestion = () => {
        if (assessmentKey === 'initial') return;
        const newQs = [...questions, {
            type: 'multiple_choice',
            text: '',
            points: 1,
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
        if (assessmentKey === 'initial') return;
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

    // Difficulty labels for Initial Tiered Quiz
    const tieredLabels = [
        'Level 1: Prasyarat (Konsep Dasar)',
        'Level 2: Target (Kompetensi Inti)',
        'Level 3: Pengayaan (Tantangan Tinggi)'
    ];

    return (
        <div className="space-y-4">
            {assessmentKey === 'summative' && (
                <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">Mode Soal</label>
                    <div className="flex gap-2 p-1 bg-card rounded-lg border border-border">
                        <button
                            type="button"
                            onClick={() => handleModeChange('mcq')}
                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                quizMode === 'mcq'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <ListChecks className="h-3.5 w-3.5" /> Pilihan Ganda (10 Soal)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleModeChange('essay')}
                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                quizMode === 'essay'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <PenTool className="h-3.5 w-3.5" /> Esai (5 Soal)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleModeChange('mixed')}
                            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                                quizMode === 'mixed'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Layers className="h-3.5 w-3.5" /> Campuran (5 PG + 3 Esai)
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.05em] ml-1">
                    {assessmentKey === 'initial' ? 'Pertanyaan Kuis Diagnostik (Gradasi 3 Level Soal)' : 'Daftar Pertanyaan'}
                </label>
                {assessmentKey !== 'initial' && (
                    <button
                        type="button"
                        onClick={addQuestion}
                        className="h-6 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                        + Tambah Soal
                    </button>
                )}
            </div>
            <div className="grid gap-3">
                {questions.map((q: any, qIdx: number) => (
                    <div
                        key={qIdx}
                        className="group relative flex flex-col gap-3 p-4 bg-card text-card-foreground rounded-md border border-border hover:border-primary/30 transition-all"
                    >
                        {assessmentKey !== 'initial' && (
                            <button
                                type="button"
                                onClick={() => removeQuestion(qIdx)}
                                className="absolute top-3 right-3 text-muted-foreground/40 hover:text-[#EB5757] transition-colors p-1 opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}

                        <div className="flex items-start gap-3">
                            <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                                L{qIdx + 1}
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-2 items-center flex-wrap">
                                    <span className="text-[10px] font-black text-foreground uppercase tracking-wider">
                                        {assessmentKey === 'initial' ? (tieredLabels[qIdx] || `Soal Level ${qIdx + 1}`) : `Soal #${qIdx + 1}`}
                                    </span>
                                    
                                    <select
                                        value={q.type || 'short_answer'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const opts = type === 'multiple_choice' ? [
                                                { id: 'a', text: '' },
                                                { id: 'b', text: '' },
                                                { id: 'c', text: '' },
                                                { id: 'd', text: '' }
                                            ] : [];
                                            const newQs = [...questions];
                                            newQs[qIdx] = { ...newQs[qIdx], type, options: opts, answer: '', correct_answer: '' };
                                            updateConfig('questions', newQs);
                                        }}
                                        className="h-7 rounded border border-border bg-popover text-foreground px-2 text-[10px] font-semibold outline-none focus:border-primary transition"
                                    >
                                        {assessmentKey !== 'initial' && <option value="multiple_choice">Pilihan Ganda</option>}
                                        <option value="short_answer">Isian Singkat</option>
                                        <option value="essay">Uraian / Esai</option>
                                    </select>

                                    {assessmentKey !== 'initial' && (
                                        <div className="flex items-center gap-1.5 ml-auto">
                                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bobot</label>
                                            <input
                                                type="number"
                                                value={q.points !== undefined ? q.points : 1}
                                                onChange={(e) => updateQuestionField(qIdx, 'points', parseInt(e.target.value) || 0)}
                                                min="0"
                                                className="w-14 h-7 text-center rounded border border-border bg-popover text-foreground px-2 text-[10px] font-semibold outline-none focus:border-primary transition"
                                            />
                                        </div>
                                    )}
                                </div>

                                <textarea
                                    value={q.text || ''}
                                    onChange={(e) => updateQuestionField(qIdx, 'text', e.target.value)}
                                    placeholder={assessmentKey === 'initial' 
                                        ? `Tuliskan pertanyaan untuk ${tieredLabels[qIdx]}...`
                                        : "Tuliskan pertanyaan..."
                                    }
                                    rows={2}
                                    className="w-full rounded border border-border bg-popover text-foreground px-3 py-2 text-[12px] outline-none focus:border-primary transition resize-none leading-relaxed"
                                />

                                {(q.type === 'multiple_choice') && (
                                    <div className="space-y-2 mt-2 pl-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                Pilihan Jawaban (Klik huruf untuk set Kunci)
                                            </span>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {(q.options || []).map((opt: any, optIdx: number) => {
                                                const isCorrect = q.answer === opt.id || opt.is_correct === true;
                                                return (
                                                    <div key={optIdx} className="flex items-center gap-2 relative group/opt">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newQs = [...questions];
                                                                const newOpts = (newQs[qIdx].options || []).map((o: any) => ({
                                                                    ...o,
                                                                    is_correct: o.id === opt.id
                                                                }));
                                                                newQs[qIdx] = { ...newQs[qIdx], answer: opt.id, options: newOpts };
                                                                updateConfig('questions', newQs);
                                                            }}
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

                                {(q.type === 'short_answer' || q.type === 'essay') && (
                                    <div className="space-y-1.5 mt-2 pl-1">
                                        <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider ml-0.5">
                                            {q.type === 'short_answer' ? 'Kunci Jawaban Singkat' : 'Pedoman Penskoran / Jawaban Ideal'}
                                        </label>
                                        <input
                                            type="text"
                                            value={q.answer || q.correct_answer || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newQs = [...questions];
                                                newQs[qIdx] = { ...newQs[qIdx], answer: val, correct_answer: val };
                                                updateConfig('questions', newQs);
                                            }}
                                            placeholder={q.type === 'short_answer' 
                                                ? "Tuliskan kunci jawaban yang benar di sini..."
                                                : "Tuliskan pedoman penilaian atau uraian jawaban ideal..."
                                            }
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
                        <p className="text-[11px] text-muted-foreground font-medium">Memuat draf pertanyaan kuis awal...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
