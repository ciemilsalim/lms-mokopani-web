import React from 'react';
import { LayoutDashboard, Users, BookOpen, ClipboardList, CalendarCheck } from 'lucide-react';

export type ClassTabKey = 'overview' | 'students' | 'materials' | 'assignments' | 'attendance';

interface TabItem {
    key: ClassTabKey;
    label: string;
    icon: React.ElementType;
    badgeCount?: number;
}

interface ClassTabsProps {
    activeTab: ClassTabKey;
    onTabChange: (tab: ClassTabKey) => void;
    studentsCount?: number;
    materialsCount?: number;
    assignmentsCount?: number;
}

export function ClassTabs({
    activeTab,
    onTabChange,
    studentsCount = 0,
    materialsCount = 0,
    assignmentsCount = 0,
}: ClassTabsProps) {
    const tabs: TabItem[] = [
        { key: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
        { key: 'students', label: 'Siswa', icon: Users, badgeCount: studentsCount },
        { key: 'materials', label: 'Materi', icon: BookOpen, badgeCount: materialsCount },
        { key: 'assignments', label: 'Asesmen', icon: ClipboardList, badgeCount: assignmentsCount },
        { key: 'attendance', label: 'Presensi', icon: CalendarCheck },
    ];

    return (
        <div className="w-full overflow-x-auto scrollbar-none py-1">
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/50 min-w-max">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onTabChange(tab.key)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] active:scale-95 ${
                                isActive
                                    ? 'bg-background text-primary shadow-2xs font-black'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                            <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span>{tab.label}</span>
                            {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                                <span
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                        isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {tab.badgeCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
