import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import AppearanceToggleDropdown from './appearance-dropdown';
import NotificationBell from './notification-bell';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth, user_role } = usePage<SharedData>().props;
    const initials = (auth?.user?.name ?? '')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const roleLabels: Record<string, string> = {
        admin: 'Administrator',
        teacher: 'Guru',
        student: 'Siswa',
        parent: 'Orang Tua',
    };
    const roleLabel = roleLabels[user_role] || 'Pengguna';

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-card px-6 shadow-sm">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="text-sidebar-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition" />
                <div className="hidden md:flex">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
                <AppearanceToggleDropdown />
                <NotificationBell />
                <div className="h-6 w-px bg-border hidden sm:block"></div>
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20 shadow-sm text-xs font-black">
                        {initials}
                    </div>
                    <div className="hidden sm:block text-left">
                        <p className="text-sm font-bold text-foreground leading-none">{auth?.user?.name}</p>
                        <p className="text-[10px] text-muted-foreground/85 font-semibold mt-0.5 leading-none">{roleLabel}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
