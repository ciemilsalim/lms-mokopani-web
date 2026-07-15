import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Pengaturan Profil',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        email: auth.user.email,
        ai_provider: auth.user.ai_provider || 'gemini',
        ai_api_key: auth.user.ai_api_key || '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Update your name and email address" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Email address"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ai_provider">Pilih Penyedia AI</Label>
                            <Select value={data.ai_provider} onValueChange={(value) => setData('ai_provider', value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih AI" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini">Google Gemini</SelectItem>
                                    <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                                    <SelectItem value="claude">Anthropic Claude</SelectItem>
                                    <SelectItem value="groq">Groq (Llama 3)</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError className="mt-2" message={errors.ai_provider} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="ai_api_key">AI API Key (Opsional)</Label>
                            <Input
                                id="ai_api_key"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.ai_api_key}
                                onChange={(e) => setData('ai_api_key', e.target.value)}
                                placeholder={
                                    data.ai_provider === 'openai' ? 'Contoh: sk-proj-...' :
                                    data.ai_provider === 'claude' ? 'Contoh: sk-ant-api03-...' :
                                    data.ai_provider === 'groq' ? 'Contoh: gsk_...' :
                                    'Contoh: AIzaSyB...'
                                }
                            />
                            <p className="mt-1 text-sm text-neutral-500">
                                Masukkan API Key Anda sendiri jika Anda ingin menggunakan fitur AI tanpa batasan kuota sistem. Key ini disimpan secara aman (terenkripsi).
                            </p>
                            <InputError className="mt-2" message={errors.ai_api_key} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="mt-2 text-sm text-neutral-800">
                                    Your email address is unverified.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        Click here to re-send the verification email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
