import { Head, useForm, Link } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <AuthLayout title="Lupa Kata Sandi 🔒" description="Masukkan email Anda untuk menerima tautan pengaturan ulang kata sandi">
            <Head title="Lupa Kata Sandi" />

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
                        name="email"
                        autoComplete="off"
                        value={data.email}
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="email@contoh.com"
                    />
                    <InputError message={errors.email} />
                </div>

                <Button className="w-full" disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Kirim Tautan Reset
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Kembali ke{' '}
                <Link href={route('login')} className="font-medium text-primary hover:text-primary/80">
                    halaman masuk
                </Link>
            </p>
        </AuthLayout>
    );
}
