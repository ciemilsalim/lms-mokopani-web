import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export interface QuestionOption {
    id?: string | number;
    text: string;
    is_correct?: boolean;
}

export interface QuestionItem {
    id: string | number;
    type: 'multiple_choice' | 'short_answer' | 'essay' | string;
    question: string;
    points?: number;
    options?: QuestionOption[];
}

interface StudentQuestionRendererProps {
    question: QuestionItem;
    index: number;
    totalQuestions: number;
    userAnswer: any;
    onAnswerChange: (questionId: string | number, answer: any) => void;
    readOnly?: boolean;
}

export function StudentQuestionRenderer({
    question,
    index,
    totalQuestions,
    userAnswer,
    onAnswerChange,
    readOnly = false,
}: StudentQuestionRendererProps) {
    const isMultipleChoice = question.type === 'multiple_choice' || (question.options && question.options.length > 0);
    const isShortAnswer = question.type === 'short_answer';
    const isEssay = question.type === 'essay';

    return (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4 shadow-xs">
            {/* Question Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold">
                    Soal {index + 1} dari {totalQuestions}
                </span>
                {question.points !== undefined && (
                    <span className="text-xs font-bold text-muted-foreground">
                        {question.points} Poin
                    </span>
                )}
            </div>

            {/* Question Text */}
            <div className="text-sm sm:text-base font-bold text-foreground leading-relaxed whitespace-pre-line">
                {question.question}
            </div>

            {/* Multiple Choice Options */}
            {isMultipleChoice && question.options && (
                <div className="space-y-2.5 pt-2">
                    {question.options.map((option, optIdx) => {
                        const optionId = option.id !== undefined ? String(option.id) : String(optIdx);
                        const isSelected = String(userAnswer) === optionId;
                        const optionLetter = String.fromCharCode(65 + optIdx);

                        return (
                            <button
                                key={optionId}
                                type="button"
                                disabled={readOnly}
                                onClick={() => onAnswerChange(question.id, optionId)}
                                className={`
                                    w-full flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border text-left transition-all min-h-[48px] active:scale-[0.99]
                                    ${isSelected
                                        ? 'bg-primary/10 border-primary shadow-xs'
                                        : 'bg-background hover:bg-muted/40 border-border'
                                    }
                                    ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                                `}
                            >
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition mt-0.5 ${
                                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-muted-foreground'
                                }`}>
                                    {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-[11px] font-bold">{optionLetter}</span>}
                                </div>
                                <span className={`text-xs sm:text-sm font-medium leading-relaxed ${isSelected ? 'text-foreground font-bold' : 'text-foreground/90'}`}>
                                    {option.text}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Short Answer Input */}
            {isShortAnswer && (
                <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-muted-foreground block">
                        Jawaban Singkat
                    </label>
                    <input
                        type="text"
                        disabled={readOnly}
                        placeholder="Tuliskan jawaban singkat Anda di sini..."
                        value={userAnswer || ''}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[48px] disabled:opacity-60"
                    />
                </div>
            )}

            {/* Essay Textarea */}
            {isEssay && (
                <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-muted-foreground block">
                        Jawaban Uraian / Esai
                    </label>
                    <textarea
                        disabled={readOnly}
                        placeholder="Tuliskan penjelasan atau jawaban uraian Anda secara detail di sini..."
                        value={userAnswer || ''}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition min-h-[120px] disabled:opacity-60"
                        rows={5}
                    />
                </div>
            )}
        </div>
    );
}
