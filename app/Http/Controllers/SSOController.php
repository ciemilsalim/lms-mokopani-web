<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class SSOController extends Controller
{
    /**
     * Redirect to Presensi with SSO signature.
     */
    public function redirectToPresensi(Request $request)
    {
        $user = auth()->user();
        if (!$user) {
            abort(403, 'Unauthorized');
        }

        $timestamp = now()->timestamp;
        $userId = $user->id;
        $secret = env('SSO_SECRET_KEY', 'default_sso_secret_key_123');

        $signature = hash_hmac('sha256', $userId . '|' . $timestamp, $secret);

        // LMS uses VITE_SIPADA_URL or SIPADA_URL, let's use env
        $presensiUrl = env('VITE_SIPADA_URL', env('SIPADA_URL', 'http://localhost:8000'));
        
        $url = rtrim($presensiUrl, '/') . '/sso/login?user_id=' . $userId . '&timestamp=' . $timestamp . '&signature=' . $signature;

        return redirect()->away($url);
    }

    /**
     * Handle incoming SSO login from Presensi.
     */
    public function login(Request $request)
    {
        $userId = $request->query('user_id');
        $timestamp = $request->query('timestamp');
        $signature = $request->query('signature');
        $secret = env('SSO_SECRET_KEY', 'default_sso_secret_key_123');

        if (!$userId || !$timestamp || !$signature) {
            abort(403, 'Missing SSO parameters.');
        }

        // Check if token is expired (e.g., older than 60 seconds)
        if (now()->timestamp - $timestamp > 60) {
            abort(403, 'SSO Token has expired.');
        }

        $expectedSignature = hash_hmac('sha256', $userId . '|' . $timestamp, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            abort(403, 'Invalid SSO Signature.');
        }

        $user = User::findOrFail($userId);
        
        // Log the user in
        Auth::login($user);

        // Redirect to dashboard or intended route
        return redirect()->route('dashboard');
    }
}
