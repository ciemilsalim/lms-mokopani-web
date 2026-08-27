import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg shadow-sm overflow-hidden border border-border">
                <AppLogoIcon className="size-full object-cover" />
            </div>
            <div className="ml-2 flex-1 min-w-0 text-left text-sm">
                <span className="truncate block font-semibold text-sidebar-foreground">LMS Mokopani</span>
            </div>
        </>
    );
}
