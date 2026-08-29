import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex items-center">
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg shadow-2xs overflow-hidden border border-border">
                <AppLogoIcon className="size-full object-cover" />
            </div>
            <div className="ml-2 flex-1 min-w-0 text-left">
                <span className="truncate block text-[15px] font-semibold text-sidebar-foreground leading-tight">LMS Mokopani</span>
            </div>
        </div>
    );
}
