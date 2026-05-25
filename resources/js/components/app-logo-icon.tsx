import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="url(#lms_grad)" />
            <path d="M12 16C12 14.343 13.343 13 15 13H33C34.657 13 36 14.343 36 16V32C36 33.657 34.657 35 33 35H15C13.343 35 12 33.657 12 32V16Z" fill="white" fillOpacity="0.15" />
            <path d="M17 19H31M17 24H27M17 29H23" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="34" cy="30" r="6" fill="#38BDF8" />
            <path d="M31.5 30L33.2 31.7L36.5 28.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
                <linearGradient id="lms_grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0F172A" />
                    <stop offset="1" stopColor="#1E3A5F" />
                </linearGradient>
            </defs>
        </svg>
    );
}
