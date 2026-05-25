import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import AppearanceToggleDropdown from './appearance-dropdown';
import NotificationBell from './notification-bell';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { auth } = usePage<SharedData>().props;
    const initials = (auth?.user?.name ?? '')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border/60 bg-card px-6 shadow-sm">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="text-sidebar-foreground" />
                <div className="hidden md:flex">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
                <AppearanceToggleDropdown />
                <NotificationBell />
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {initials}
                </div>
            </div>
        </header>
    );
}
