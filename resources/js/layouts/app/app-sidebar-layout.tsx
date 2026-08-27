import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { type BreadcrumbItem } from '@/types';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    return (
        <AppShell variant="sidebar">
            {/* The Sidebar itself is hidden on mobile inside its component or via tailwind if we wrap it. */}
            <div className="hidden md:block">
                <AppSidebar />
            </div>
            <div className="layout-page flex min-w-0 max-w-full w-full flex-1 flex-col pb-24 md:pb-0">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <AppContent variant="sidebar">
                    {children}
                </AppContent>
                <footer className="border-t border-border px-4 sm:px-6 py-4 text-center text-[11px] text-muted-foreground/70">
                    Created By Zahradev &middot; LMS Mokopani Versi 1.0
                </footer>
                
                <MobileBottomNav />
            </div>
        </AppShell>
    );
}
