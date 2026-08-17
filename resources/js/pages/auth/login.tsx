import { Head, useForm, Link } from '@inertiajs/react';
import { Eye, EyeOff, LoaderCircle, AlertTriangle } from 'lucide-react';
import { FormEventHandler, useState, useEffect } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
    errors: Record<string, string>;
}

export default function Login({ status, canResetPassword, errors: propErrors }: LoginProps) {
    const [showPassword, setShowPassword] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const activeErrors = { ...propErrors, ...errors };

    useEffect(() => {
        console.group('[SSO LMS Login Diagnostik]');
        console.log('Current URL:', window.location.href);
        console.log('Query String:', window.location.search);
        console.log('Status Message:', status || 'Tidak ada status');
        console.log('Errors:', activeErrors);
        if (activeErrors?.sso) {
            console.error('SSO ERROR TERDETEKSI:', activeErrors.sso);
        }
        console.groupEnd();
    }, [activeErrors, status]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Selamat datang! 👋" description="Silakan masuk ke akun Anda untuk melanjutkan">
            <Head title="Masuk" />

            {activeErrors?.sso && (
                <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm font-medium text-destructive flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                    <div>
                        <div className="font-bold text-destructive">Gagal Masuk via SSO</div>
                        <div className="text-xs mt-0.5 text-destructive/90 leading-relaxed">{activeErrors.sso}</div>
                    </div>
                </div>
            )}

            {status && (
                <div className="mb-4 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        required
                        autoFocus
                        tabIndex={1}
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="Masukkan email Anda"
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Kata Sandi</Label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                tabIndex={5}
                                className="text-xs font-medium text-primary hover:text-primary/80"
                            >
                                Lupa kata sandi?
                            </Link>
                        )}
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="············"
                            className="pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    <InputError message={errors.password} />
                </div>

                <div className="flex items-center gap-2">
                    <Checkbox
                        id="remember"
                        name="remember"
                        tabIndex={3}
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground">
                        Ingat saya
                    </Label>
                </div>

                <Button type="submit" className="w-full" tabIndex={4} disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Masuk
                </Button>
            </form>

        </AuthLayout>
    );
}
