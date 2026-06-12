import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive';
    requireInput?: string;
    inputPlaceholder?: string;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    message,
    confirmLabel = 'Ya, Hapus',
    cancelLabel = 'Batal',
    onConfirm,
    variant = 'destructive',
    requireInput,
    inputPlaceholder = 'Ketik kata di atas...',
}: ConfirmDialogProps) {
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (!open) {
            setInputValue('');
        }
    }, [open]);

    const isConfirmDisabled = requireInput ? inputValue !== requireInput : false;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-4 pt-2">
                            <p className="text-sm text-muted-foreground">{message}</p>
                            {requireInput && (
                                <div className="space-y-2 mt-4 rounded-lg bg-muted/50 p-4 border border-border">
                                    <p className="text-sm font-medium text-foreground">
                                        Silakan ketik <strong className="font-bold text-destructive select-all">{requireInput}</strong> untuk melanjutkan:
                                    </p>
                                    <Input
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={inputPlaceholder}
                                        className="mt-2"
                                    />
                                </div>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant}
                        disabled={isConfirmDisabled}
                        onClick={() => {
                            if (!isConfirmDisabled) {
                                onConfirm();
                                onOpenChange(false);
                            }
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
