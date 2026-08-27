import React from 'react';
import { Users, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChildItem {
    id: number;
    name: string;
    nis: string;
    class_name: string;
}

export interface ChildSwitcherProps {
    childrenList: ChildItem[];
    selectedChildId: number;
    onSelectChild: (childId: number) => void;
    className?: string;
}

export function ChildSwitcher({
    childrenList = [],
    selectedChildId,
    onSelectChild,
    className = '',
}: ChildSwitcherProps) {
    if (childrenList.length <= 1) return null;

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Anak yang Dipantau:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {childrenList.map((child) => {
                    const isSelected = child.id === selectedChildId;
                    return (
                        <button
                            key={child.id}
                            onClick={() => onSelectChild(child.id)}
                            className={cn(
                                'flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition active:scale-95 shrink-0 min-h-[48px]',
                                isSelected
                                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                    : 'bg-card text-foreground border-border/80 hover:bg-muted/40'
                            )}
                        >
                            <div className={cn('flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs', isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary')}>
                                {child.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                                <p className="leading-none font-bold truncate max-w-[120px]">{child.name}</p>
                                <p className={cn('text-[10px] mt-0.5 font-medium', isSelected ? 'text-white/80' : 'text-muted-foreground')}>
                                    Kelas {child.class_name}
                                </p>
                            </div>
                            {isSelected && <Check className="h-4 w-4 ml-1 text-white shrink-0" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
