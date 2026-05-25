import { GraduationCap, Clock, BookOpen, Users, AlertTriangle } from 'lucide-react';

const iconMap: Record<string, any> = {
    'graduation-cap': GraduationCap,
    'clock': Clock,
    'book-open': BookOpen,
    'users': Users,
    'alert-triangle': AlertTriangle,
};

const levelColor: Record<string, { bg: string; text: string; dot: string }> = {
    high:   { bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
    medium: { bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    low:    { bg: 'bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/30', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
};

interface Flag {
    type: string;
    level: string;
    label: string;
    message: string;
    icon: string;
}

export default function EarlyWarningBadge({ flags }: { flags: Flag[] }) {
    if (flags.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1.5">
            {flags.map((f, i) => {
                const colors = levelColor[f.level] ?? levelColor.low;
                const Icon = iconMap[f.icon] ?? AlertTriangle;

                return (
                    <div
                        key={i}
                        className={`group relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-tight ${colors.bg} ${colors.text}`}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                        <Icon className="h-3 w-3" />
                        {f.label}
                        <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border bg-popover p-3 shadow-lg group-hover:block">
                            <p className="text-xs font-medium text-foreground">{f.message}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
