import React, { useState } from 'react';

interface StudentAvatarProps {
    photoUrl?: string | null;
    name: string;
    className?: string;
}

export function StudentAvatar({ photoUrl, name, className = "h-10 w-10 rounded-xl" }: StudentAvatarProps) {
    const [imgError, setImgError] = useState(false);

    if (photoUrl && !imgError) {
        return (
            <img 
                src={photoUrl} 
                alt={name} 
                onError={() => setImgError(true)}
                className={`${className} object-cover shrink-0`} 
            />
        );
    }

    return (
        <div className={`${className} bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20`}>
            {name ? name.substring(0, 2).toUpperCase() : '??'}
        </div>
    );
}

export default StudentAvatar;
