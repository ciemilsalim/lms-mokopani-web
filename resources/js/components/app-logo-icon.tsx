import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img src="/logo.png?v=4" alt="LMS Mokopani AI Logo" {...props} />
    );
}
