<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SSOController extends Controller
{
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

        // 2. Store the token in the shared database with a 1-minute expiration
        DB::table('sso_tokens')->insert([
            'user_id' => $user->id,
            'token' => $token,
            'expires_at' => Carbon::now('UTC')->addMinute(),
            'created_at' => Carbon::now('UTC'),
            'updated_at' => Carbon::now('UTC'),
        ]);

        // 3. Get target Absensi URL
        $presensiUrl = env('ABSENSI_URL', 'http://localhost:8000');

        // 4. Redirect to the target Absensi SSO login route
        return redirect()->away(rtrim($presensiUrl, '/') . '/sso/login?token=' . $token);
    }
}
