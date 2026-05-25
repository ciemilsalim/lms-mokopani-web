import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <div className="layout-page flex min-w-0 flex-1 flex-col">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <AppContent variant="sidebar">
                    {children}
                </AppContent>
                <footer className="border-t border-border px-6 py-3 text-center text-[10px] text-muted-foreground/60">
                    Created By Zahradev &middot; LMS Mokopani Versi 1.0
                </footer>
            </div>
        </AppShell>
    );
}
