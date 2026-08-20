<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SsoLoginController extends Controller
{
    /**
     * Authenticate the user automatically using a valid SSO token.
     */
    public function login(Request $request)
    {
        $token = $request->query('token');
        $isDebug = $request->has('debug');

        Log::info('[SSO LMS] /sso/login request diterima', [
            'has_token'      => !empty($token),
            'token_snippet'  => $token ? substr($token, 0, 10) . '...' : null,
            'ip'             => $request->ip(),
            'user_agent'     => $request->userAgent(),
            'server_time'    => now()->toDateTimeString(),
        ]);

        if (!$token) {
            Log::warning('[SSO LMS] Parameter token kosong di query string URL');
            if ($isDebug) {
                return response()->json(['status' => 'error', 'message' => 'Token SSO tidak ditemukan dalam URL.'], 400);
            }
            return redirect()->route('login')->withErrors(['sso' => 'Token SSO tidak ditemukan dalam URL.']);
        }

        // 1. Ambil data token langsung dari tabel database
        $rawToken = DB::table('sso_tokens')->where('token', $token)->first();

        if (!$rawToken) {
            $totalTokens = DB::table('sso_tokens')->count();
            $dbName = DB::connection()->getDatabaseName();
            Log::warning('[SSO LMS] Token tidak ditemukan di database sso_tokens', [
                'token_snippet'       => substr($token, 0, 10) . '...',
                'db_name'             => $dbName,
                'total_tokens_in_db'  => $totalTokens,
            ]);

            if ($isDebug) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Token SSO tidak ditemukan di database LMS.',
                    'database_connected' => $dbName,
                    'total_tokens_in_sso_tokens' => $totalTokens,
                    'token_submitted' => $token,
                ], 404);
            }

            return redirect()->route('login')->withErrors(['sso' => 'Token SSO tidak valid di database (' . $dbName . ') atau telah digunakan.']);
        }

        // 2. Validasi kadaluarsa token secara fleksibel dan timezone-resilient (menghindari selisih jam antar hosting/server)
        $expiresAt = Carbon::parse($rawToken->expires_at);
        $createdAt = Carbon::parse($rawToken->created_at);
        $isNotExpired = $expiresAt->isFuture() 
            || $createdAt->greaterThanOrEqualTo(now()->subHours(24)) 
            || abs(now()->diffInHours($createdAt)) <= 24;

        Log::info('[SSO LMS] Token SSO ditemukan di database', [
            'token_id'   => $rawToken->id,
            'user_id'    => $rawToken->user_id,
            'created_at' => (string) $rawToken->created_at,
            'expires_at' => (string) $rawToken->expires_at,
            'now'        => (string) now(),
            'is_valid'   => $isNotExpired,
        ]);

        if (!$isNotExpired) {
            Log::warning('[SSO LMS] Token SSO telah kadaluarsa', [
                'created_at' => (string) $rawToken->created_at,
                'expires_at' => (string) $rawToken->expires_at,
                'now'        => (string) now(),
            ]);
            DB::table('sso_tokens')->where('token', $token)->delete();

            if ($isDebug) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Token SSO telah kadaluarsa.',
                    'created_at' => (string) $rawToken->created_at,
                    'expires_at' => (string) $rawToken->expires_at,
                    'server_now' => (string) now(),
                ], 400);
            }

            return redirect()->route('login')->withErrors(['sso' => 'Token SSO telah kadaluarsa. Silakan klik ulang menu LMS Mokopani di Presensi.']);
        }

        // 3. Pastikan user dengan ID tersebut ada di tabel users
        $user = \App\Models\User::find($rawToken->user_id);
        if (!$user) {
            Log::error('[SSO LMS] User ID dari token tidak ditemukan di tabel users LMS', [
                'user_id' => $rawToken->user_id,
            ]);

            if ($isDebug) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User ID tidak ditemukan di tabel users.',
                    'user_id' => $rawToken->user_id,
                ], 404);
            }

            return redirect()->route('login')->withErrors(['sso' => 'Akun pengguna (ID: ' . $rawToken->user_id . ') tidak ditemukan di database LMS Mokopani.']);
        }

        // 4. Autentikasi user dengan remember token
        Auth::login($user, true);

        // 5. Hapus token satu kali pakai dari database
        DB::table('sso_tokens')->where('token', $token)->delete();

        // 6. Regenerasi session & simpan session secara eksplisit
        $request->session()->regenerate();
        $request->session()->save();

        Log::info('[SSO LMS] Login SSO Berhasil! Mengalihkan ke dashboard', [
            'user_id'    => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role'       => $user->role,
            'auth_check' => Auth::check(),
        ]);

        if ($isDebug) {
            return response()->json([
                'status' => 'success',
                'message' => 'SSO Login berhasil!',
                'user' => $user->only('id', 'name', 'email', 'role'),
                'redirect_target' => route('dashboard'),
            ]);
        }

        // 7. Arahkan langsung ke dashboard
        return redirect()->route('dashboard');
    }
}
