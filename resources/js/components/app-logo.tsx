import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
                <AppLogoIcon className="size-5 fill-current text-primary-foreground" />
            </div>
            <div className="ml-2 grid flex-1 text-left text-sm">
                <span className="truncate font-semibold text-sidebar-primary-foreground">LMS Mokopani</span>
            </div>
        </>
    );
}
