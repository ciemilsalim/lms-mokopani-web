import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface StudentAttemptProgressProps {
    currentIndex: number;
    totalQuestions: number;
    answers: Record<string | number, any>;
    questions: any[];
    onSelectQuestion: (index: number) => void;
}

export function StudentAttemptProgress({
    currentIndex,
    totalQuestions,
    answers,
    questions,
    onSelectQuestion,
}: StudentAttemptProgressProps) {
    const answeredCount = Object.keys(answers).filter(k => {
        const val = answers[k];
        return val !== undefined && val !== null && val !== '';
    }).length;

    const progressPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    return (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span className="text-foreground">Progres Pengerjaan</span>
                <span className="text-primary font-black">{answeredCount} dari {totalQuestions} Soal Terjawab ({progressPercentage}%)</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>

            {/* Question Quick Jump Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-1">
                {questions.map((q, idx) => {
                    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '';
                    const isCurrent = idx === currentIndex;

                    return (
                        <button
                            key={q.id || idx}
                            type="button"
                            onClick={() => onSelectQuestion(idx)}
                            className={`
                                flex items-center justify-center h-8 w-8 shrink-0 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer
                                ${isCurrent
                                    ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/30'
                                    : isAnswered
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }
                            `}
                            title={`Soal ${idx + 1}${isAnswered ? ' (Sudah Dijawab)' : ''}`}
                        >
                            {idx + 1}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
