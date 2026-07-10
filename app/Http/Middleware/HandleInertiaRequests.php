<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();

        return array_merge(parent::share($request), [
            'name' => config('app.name'),
            'school_name' => school_setting('app_name', 'Nama Sekolah'),
            'school_logo' => school_logo_url(),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
            ],
            'user_role' => $user?->role ?? ($user?->teacher ? 'teacher' : ($user?->student ? 'student' : 'guest')),
            'unread_count' => $user ? \App\Models\Notification::where('user_id', $user->id)->unread()->count() : 0,
            'sipada_url' => env('SIPADA_URL', env('VITE_SIPADA_URL', 'http://localhost:8000')),
            'activeSemesterId' => session('active_semester_id') ?? \App\Models\Semester::where('is_active', true)->value('id'),
            'semestersList' => \App\Models\Semester::with('academicYear')->orderByDesc('id')->get()->map(function ($s) {
                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'academic_year' => $s->academicYear ? $s->academicYear->name : '',
                    'is_active' => $s->is_active
                ];
            }),
        ]);
    }
}
