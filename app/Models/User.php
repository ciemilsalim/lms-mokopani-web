<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'profile_photo_path',
        'ai_provider',
        'ai_api_key',
    ];

    public function teacher()
    {
        return $this->hasOne(Teacher::class);
    }

    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function parent()
    {
        return $this->hasOne(ParentModel::class, 'user_id');
    }

    /**
     * Normalize role aliases for Wakasek Kurikulum to canonical 'wakasek_kurikulum'.
     */
    public static function normalizeRole(?string $role): ?string
    {
        if (!$role) {
            return null;
        }

        $normalized = strtolower(trim($role));
        $normalizedSlug = str_replace([' ', '-'], '_', $normalized);

        if (in_array($normalizedSlug, ['wakasek_kurikulum', 'waka_kurikulum', 'kurikulum', 'wakasek'], true)) {
            return 'wakasek_kurikulum';
        }

        return $role;
    }

    /**
     * Check whether the user holds any of the given roles via Spatie's `model_has_roles` + `roles` tables
     * (shared with SIPADA / Aplikasi Absensi) or via the local `users.role` column.
     */
    public function hasAnyRole(array $roles): bool
    {
        $targetRoles = [];
        foreach ($roles as $r) {
            $lower = strtolower(trim((string) $r));
            if ($lower !== '') {
                $targetRoles[] = $lower;
            }
            $norm = self::normalizeRole((string) $r);
            if ($norm) {
                $targetRoles[] = strtolower($norm);
            }
        }
        $targetRoles = array_values(array_unique($targetRoles));

        // 1. Check Spatie Permission tables (model_has_roles & roles) if available
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('model_has_roles') && \Illuminate\Support\Facades\Schema::hasTable('roles')) {
                $spatieRoleNames = \Illuminate\Support\Facades\DB::table('model_has_roles')
                    ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                    ->where('model_has_roles.model_id', $this->id)
                    ->where(function ($q) {
                        $q->where('model_has_roles.model_type', self::class)
                          ->orWhere('model_has_roles.model_type', 'App\\Models\\User');
                    })
                    ->pluck('roles.name');

                foreach ($spatieRoleNames as $spatieRole) {
                    $rawLower = strtolower(trim((string) $spatieRole));
                    $normLower = strtolower((string) self::normalizeRole((string) $spatieRole));
                    if (in_array($rawLower, $targetRoles, true) || ($normLower !== '' && in_array($normLower, $targetRoles, true))) {
                        return true;
                    }
                }
            }
        } catch (\Throwable $e) {
            // Fallback gracefully if Spatie tables are not present
        }

        // 2. Fallback to local `users.role` column and model relations
        $localRole = strtolower(trim((string) $this->role));
        $normalizedLocal = strtolower((string) self::normalizeRole($this->role));

        if (($localRole !== '' && in_array($localRole, $targetRoles, true)) || ($normalizedLocal !== '' && in_array($normalizedLocal, $targetRoles, true))) {
            return true;
        }

        if ((!$localRole || $localRole === 'user') && $this->teacher && in_array('teacher', $targetRoles, true)) {
            return true;
        }
        if ((!$localRole || $localRole === 'user') && $this->student && in_array('student', $targetRoles, true)) {
            return true;
        }
        if ((!$localRole || $localRole === 'user') && $this->parent && in_array('parent', $targetRoles, true)) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether this user has the Wakasek Kurikulum role (via `users.role` OR Spatie `model_has_roles`).
     */
    public function isWakasekKurikulum(): bool
    {
        if (self::normalizeRole($this->role) === 'wakasek_kurikulum') {
            return true;
        }

        return $this->hasAnyRole(['wakasek_kurikulum', 'wakasek kurikulum', 'waka_kurikulum', 'waka kurikulum', 'kurikulum']);
    }

    /**
     * Resolve the effective primary role string for LMS navigation and middleware.
     */
    public function resolveEffectiveRole(): string
    {
        if (strtolower((string) $this->role) === 'admin' || $this->hasAnyRole(['admin'])) {
            return 'admin';
        }

        // If user is a teacher (even if also Wakasek Kurikulum), keep 'teacher' as primary layout role
        // while `isWakasekKurikulum()` unlocks Leger Nilai across all classes and enforces read-only grade rules.
        // If user is NOT a teacher (standalone Wakasek Kurikulum account) or explicitly has role='wakasek_kurikulum' without teacher record, return 'wakasek_kurikulum'.
        if (self::normalizeRole($this->role) === 'wakasek_kurikulum' && !$this->teacher) {
            return 'wakasek_kurikulum';
        }

        if ($this->teacher || strtolower((string) $this->role) === 'teacher') {
            return self::normalizeRole($this->role) === 'wakasek_kurikulum' ? 'wakasek_kurikulum' : 'teacher';
        }

        if ($this->isWakasekKurikulum()) {
            return 'wakasek_kurikulum';
        }

        if ($this->role && $this->role !== 'user') {
            return self::normalizeRole($this->role) ?? $this->role;
        }

        if ($this->student) {
            return 'student';
        }

        if ($this->parent) {
            return 'parent';
        }

        return 'guest';
    }

    protected $appends = ['avatar', 'avatar_url'];

    public function getAvatarAttribute()
    {
        return $this->getAvatarUrlAttribute();
    }

    public function getAvatarUrlAttribute()
    {
        // 1. Cek profile_photo_path di User (dari aplikasi Absensi / Jetstream / SIPADA)
        if (!empty($this->profile_photo_path)) {
            if (Str::startsWith($this->profile_photo_path, ['http://', 'https://'])) {
                return $this->profile_photo_path;
            }
            return url('/media-proxy/' . ltrim($this->profile_photo_path, '/'));
        }

        // 2. Cek relasi Teacher
        $teacher = $this->teacher ?: Teacher::where('user_id', $this->id)->first();
        if ($teacher && $teacher->photo_url) {
            return $teacher->photo_url;
        }

        // 3. Cek relasi Student
        $student = $this->student ?: Student::where('user_id', $this->id)->first();
        if ($student && $student->photo_url) {
            return $student->photo_url;
        }

        // 4. Cek kolom photo langsung jika ada
        if (!empty($this->photo)) {
            if (Str::startsWith($this->photo, ['http://', 'https://'])) {
                return $this->photo;
            }
            return url('/media-proxy/' . ltrim($this->photo, '/'));
        }

        return null;
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'ai_api_key',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'ai_api_key' => 'encrypted',
        ];
    }
}
