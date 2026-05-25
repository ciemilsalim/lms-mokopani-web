import { Head, useForm, Link } from '@inertiajs/react';
import { LoaderCircle, MailCheck } from 'lucide-react';
import { FormEventHandler } from 'react';

import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <AuthLayout title="Verifikasi Email 📧" description="Silakan verifikasi alamat email Anda dengan mengklik tautan yang telah kami kirimkan ke email Anda.">
            <Head title="Verifikasi Email" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                    Tautan verifikasi baru telah dikirim ke alamat email yang Anda daftarkan.
                </div>
            )}

            <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <MailCheck className="h-8 w-8 text-primary" />
                </div>

                <form onSubmit={submit}>
                    <Button disabled={processing}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Kirim Ulang Email Verifikasi
                    </Button>
                </form>

                <Link href={route('logout')} method="post" as="button" className="text-sm text-muted-foreground hover:text-foreground">
                    Keluar
                </Link>
            </div>
        </AuthLayout>
    );
}
