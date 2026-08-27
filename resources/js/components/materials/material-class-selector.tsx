import React from 'react';
import { Check, Users } from 'lucide-react';

interface ClassOption {
    id: number;
    name: string;
}

interface MaterialClassSelectorProps {
    classes: ClassOption[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    disabled?: boolean;
    error?: string;
}

export function MaterialClassSelector({
    classes,
    selectedIds,
    onChange,
    disabled = false,
    error,
}: MaterialClassSelectorProps) {
    const toggleClass = (id: number) => {
        if (disabled) return;
        onChange(
            selectedIds.includes(id)
                ? selectedIds.filter(c => c !== id)
                : [...selectedIds, id]
        );
    };

    return (
        <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary/60" />
                Kelas
            </label>

            {classes.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 italic py-2">
                    Pilih mata pelajaran terlebih dahulu
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {classes.map(c => {
                        const isSelected = selectedIds.includes(c.id);
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleClass(c.id)}
                                disabled={disabled}
                                className={`
                                    inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold
                                    border transition-all active:scale-95 min-h-[44px]
                                    ${isSelected
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-primary/5'
                                    }
                                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                            >
                                {isSelected && <Check className="h-3.5 w-3.5" />}
                                {c.name}
                            </button>
                        );
                    })}
                </div>
            )}

            {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        </div>
    );
}
