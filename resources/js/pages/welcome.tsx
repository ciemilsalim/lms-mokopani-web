import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function Welcome() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Welcome">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>
            <div className="flex min-h-screen flex-col bg-background">
                <header className="flex h-16 items-center justify-end gap-4 border-b border-border px-6">
                    {auth.user ? (
                        <Link
                            href={route('dashboard')}
                            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link
                                href={route('login')}
                                className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium text-foreground hover:bg-muted"
                            >
                                Log in
                            </Link>
                            <Link
                                href={route('register')}
                                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Register
                            </Link>
                        </div>
                    )}
                </header>

                <main className="flex flex-1 flex-col items-center justify-center p-6">
                    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                            <AppLogoIcon className="size-10 fill-current text-primary-foreground" />
                        </div>
                        <h1 className="mt-6 text-3xl font-bold text-foreground">LMS Mokopani</h1>
                        <p className="mt-3 text-lg text-muted-foreground">
                            Learning Management System untuk mendukung proses belajar mengajar yang lebih efektif dan terstruktur.
                        </p>
                        <div className="mt-8 flex items-center gap-4">
                            {!auth.user && (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                    >
                                        Masuk
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-6 text-sm font-medium text-foreground hover:bg-muted"
                                    >
                                        Daftar
                                    </Link>
                                </>
                            )}
                            {auth.user && (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    Dashboard
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="mt-16 grid gap-6 sm:grid-cols-3">
                        {[
                            { title: 'Rancang Pembelajaran', desc: 'Buat rencana pembelajaran yang terstruktur dengan tujuan, materi, dan asesmen.' },
                            { title: 'Kelola Konten', desc: 'Unggah materi, buat asesmen, dan kelola sumber belajar dalam satu tempat.' },
                            { title: 'Pantau Kemajuan', desc: 'Lihat laporan nilai, aktivitas siswa, dan capaian pembelajaran secara real-time.' },
                        ].map((feature) => (
                            <div key={feature.title} className="rounded-xl border bg-card p-6 shadow-sm">
                                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                                <p className="mt-2 text-sm text-muted-foreground">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </main>

                <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} LMS Mokopani. All rights reserved.
                </footer>
            </div>
        </>
    );
}
