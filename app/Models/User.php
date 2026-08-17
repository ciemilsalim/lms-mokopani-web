<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

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
