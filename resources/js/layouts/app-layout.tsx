import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';

interface AppLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    hideBottomNav?: boolean;
}

export default ({ children, breadcrumbs, hideBottomNav, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} hideBottomNav={hideBottomNav} {...props}>
        {children}
    </AppLayoutTemplate>
);
