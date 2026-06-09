import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { Settings, Lock, Palette } from 'lucide-react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        url: '/settings/profile',
        icon: Settings,
    },
    {
        title: 'Password',
        url: '/settings/password',
        icon: Lock,
    },
    {
        title: 'Appearance',
        url: '/settings/appearance',
        icon: Palette,
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const currentPath = window.location.pathname;

    return (
        <div className="px-4 py-6">
            <Heading title="Settings" description="Manage your profile and account settings" />

            <div className="mt-6 flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full lg:w-56">
                    <nav className="flex flex-col space-y-1">
                        {sidebarNavItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Button
                                    key={item.url}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn(
                                        'w-full justify-start gap-2',
                                        currentPath === item.url
                                            ? 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Link href={item.url || ''} prefetch>
                                        {Icon && <Icon className="h-4 w-4" />}
                                        {item.title}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
