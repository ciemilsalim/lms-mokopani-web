<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        $normalizedRole = \App\Models\User::normalizeRole($user->role);
        $userRole = ($normalizedRole && $normalizedRole !== 'user') ? $normalizedRole : ($user->teacher ? 'teacher' : ($user->student ? 'student' : ($user->parent ? 'parent' : 'guest')));

        $allowedRoles = array_map(fn ($r) => \App\Models\User::normalizeRole($r) ?? $r, $roles);

        $isAuthorized = in_array($userRole, $allowedRoles, true)
            || $user->hasAnyRole($allowedRoles)
            || (in_array('wakasek_kurikulum', $allowedRoles, true) && $user->isWakasekKurikulum());

        if (!$isAuthorized) {
            abort(403, 'Anda tidak memiliki akses ke halaman ini.');
        }

        return $next($request);
    }
}
