<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class SSOController extends Controller
{
    /**
     * Menentukan URL target aplikasi Presensi secara adaptif (Lokal vs cPanel).
     */
    public function getTargetPresensiUrl(Request $request): string
    {
        $host = $request->getHost();
        $isLocalHost = in_array($host, ['localhost', '127.0.0.1', '::1'])
            || str_starts_with($host, '192.168.')
            || str_starts_with($host, '10.')
            || str_ends_with($host, '.test')
            || str_ends_with($host, '.local');

        if ($isLocalHost) {
            return env('ABSENSI_LOCAL_URL', env('ABSENSI_URL', 'http://localhost:8000'));
        }

        return env('ABSENSI_PRODUCTION_URL', env('ABSENSI_URL', 'https://presensi-smpn1biau.zahradev.id'));
    }

    /**
     * Redirect to Presensi using secure database token SSO.
     */
    public function redirectToPresensi(Request $request)
    {
        $user = auth()->user();
        if (!$user) {
            abort(403, 'Unauthorized');
        }

        // Secure role check in LMS
        $role = $user->role ?: ($user->teacher ? 'teacher' : ($user->student ? 'student' : 'guest'));
        
        if ($role !== 'teacher' && $role !== 'admin') {
            abort(403, 'Anda tidak memiliki hak akses untuk SSO ke Aplikasi Presensi.');
        }

        // 1. Generate a secure random token
        $token = Str::random(60);

        // 2. Store the token in the shared database with a 10-minute expiration
        DB::table('sso_tokens')->insert([
            'user_id' => $user->id,
            'token' => $token,
            'expires_at' => now()->addMinutes(10),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Get target Absensi URL
        $presensiUrl = $this->getTargetPresensiUrl($request);

        // 4. Redirect to the target Absensi SSO login route
        return redirect()->away(rtrim($presensiUrl, '/') . '/sso/login?token=' . $token);
    }
}
