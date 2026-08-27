import React from 'react';
import { Sparkles, Brain, CheckCircle2, Target, HelpCircle } from 'lucide-react';
import { SectionHeader } from '@/components/dashboard';

interface LearningStepsSectionProps {
    understandingActivity?: string | null;
    applicationActivity?: string | null;
    reflectionActivity?: string | null;
}

const stripHtml = (html: string | null): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
};

export function LearningStepsSection({
    understandingActivity,
    applicationActivity,
    reflectionActivity,
}: LearningStepsSectionProps) {
    const hasSteps = understandingActivity || applicationActivity || reflectionActivity;
    if (!hasSteps) return null;

    const steps = [
        {
            title: '1. Memahami (Pemahaman Konsep)',
            desc: stripHtml(understandingActivity),
            icon: Brain,
            color: 'bg-primary/10 text-primary border-primary/20',
        },
        {
            title: '2. Mengaplikasi (Praktik & Penerapan)',
            desc: stripHtml(applicationActivity),
            icon: Target,
            color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        },
        {
            title: '3. Merefleksi (Evaluasi & Refleksi)',
            desc: stripHtml(reflectionActivity),
            icon: CheckCircle2,
            color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        },
    ];

    return (
        <div className="space-y-3.5 fade-in">
            <SectionHeader
                title="Langkah Pembelajaran (Pedagogis)"
                subtitle="Alur pengalaman belajar: Memahami → Mengaplikasi → Merefleksi"
                icon={Sparkles}
            />

            <div className="space-y-3">
                {steps.map((step, idx) => {
                    if (!step.desc) return null;
                    const Icon = step.icon;

                    return (
                        <div
                            key={idx}
                            className="p-4 rounded-2xl bg-card border border-border/70 shadow-2xs space-y-2"
                        >
                            <div className="flex items-center gap-2">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${step.color}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <h4 className="text-xs sm:text-sm font-black text-foreground">
                                    {step.title}
                                </h4>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pl-10">
                                {step.desc}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
