import React, { useState } from 'react';
import { Sparkles, Brain, CheckCircle2, Target, Lightbulb, Compass, ChevronRight } from 'lucide-react';
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

    const tracks = [
        {
            key: 'basic',
            label: 'Mulai dari Dasar',
            subtitle: 'Pemahaman konsep dasar materi',
            emoji: '🌱',
            desc: stripHtml(understandingActivity),
            icon: Brain,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            activeTabColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
        },
        {
            key: 'core',
            label: 'Penguatan Pemahaman',
            subtitle: 'Praktik & aplikasi konsep dalam kasus',
            emoji: '💡',
            desc: stripHtml(applicationActivity),
            icon: Lightbulb,
            color: 'text-primary bg-primary/10 border-primary/20',
            activeTabColor: 'bg-primary/15 text-primary border-primary/40',
        },
        {
            key: 'challenge',
            label: 'Tantangan Lanjutan',
            subtitle: 'Eksplorasi mendalam & uji analisis',
            emoji: '🚀',
            desc: stripHtml(reflectionActivity),
            icon: Compass,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
            activeTabColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40',
        },
    ].filter(t => Boolean(t.desc));

    const [activeKey, setActiveKey] = useState<string>(tracks[1]?.key || tracks[0]?.key || 'basic');
    const activeTrack = tracks.find(t => t.key === activeKey) || tracks[0];

    if (!activeTrack) return null;

    return (
        <div className="space-y-3 fade-in w-full min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>🎯 Pilih Jalur Belajarmu (Diferensiasi)</span>
            </div>

            {/* Segmented Track Pills */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/50 w-full min-w-0">
                {tracks.map((track) => {
                    const isSelected = activeKey === track.key;
                    return (
                        <button
                            key={track.key}
                            type="button"
                            onClick={() => setActiveKey(track.key)}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all min-h-[44px] active:scale-97 border ${
                                isSelected
                                    ? `${track.activeTabColor} shadow-2xs font-black`
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-background/40'
                            }`}
                        >
                            <span className="text-sm">{track.emoji}</span>
                            <span className="text-[11px] font-bold leading-tight line-clamp-1 mt-0.5">{track.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Active Track Content Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-2 fade-in">
                <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                    <span className="text-lg">{activeTrack.emoji}</span>
                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-black text-foreground">
                            {activeTrack.label}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate">{activeTrack.subtitle}</p>
                    </div>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed pt-1 whitespace-pre-line">
                    {activeTrack.desc}
                </p>
            </div>
        </div>
    );
}
