import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm overflow-hidden border border-border">
                <AppLogoIcon className="size-full object-cover" />
            </div>
            <div className="ml-2 grid flex-1 text-left text-sm">
                <span className="truncate font-semibold text-sidebar-foreground">LMS Mokopani</span>
            </div>
        </>
    );
}
