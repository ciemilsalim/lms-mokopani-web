import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SessionTimerProps {
    startTime: string;
    endTime?: string | null;
    onEndSession: () => void;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({ startTime, endTime, onEndSession }) => {
    const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
    const [isRunning, setIsRunning] = useState<boolean>(!endTime);

    useEffect(() => {
        if (!startTime) return;
        const start = new Date(startTime).getTime();

        const calculateElapsed = () => {
            const now = endTime ? new Date(endTime).getTime() : new Date().getTime();
            setSecondsElapsed(Math.max(0, Math.floor((now - start) / 1000)));
        };

        calculateElapsed();

        if (!endTime && isRunning) {
            const interval = setInterval(calculateElapsed, 1000);
            return () => clearInterval(interval);
        }
    }, [startTime, endTime, isRunning]);

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');
        if (hours > 0) {
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        }
        return `${pad(minutes)}:${pad(seconds)}`;
    };

    return (
        <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg border border-slate-800">
            <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    {isRunning && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <Badge variant="outline" className="text-white border-slate-700 text-[10px] font-semibold">
                    {endTime ? 'Sesi Selesai' : isRunning ? 'Sesi Aktif' : 'Pause'}
                </Badge>
            </div>

            <div className="font-mono text-base font-bold tracking-wider text-emerald-400">
                {formatTime(secondsElapsed)}
            </div>

            {!endTime && (
                <div className="flex items-center gap-1.5 ml-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsRunning(!isRunning)}
                        className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 px-2"
                    >
                        {isRunning ? '⏸ Pause' : '▶ Lanjut'}
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onEndSession}
                        className="h-7 text-xs px-3 bg-rose-600 hover:bg-rose-700 font-semibold"
                    >
                        ⏹ Akhiri Sesi
                    </Button>
                </div>
            )}
        </div>
    );
};
