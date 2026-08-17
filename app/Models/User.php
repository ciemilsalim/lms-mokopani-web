<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

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
        $teacher = $this->teacher ?: Teacher::where('user_id', $this->id)->first();
        if ($teacher && $teacher->photo_url) {
            return $teacher->photo_url;
        }

        $student = $this->student ?: Student::where('user_id', $this->id)->first();
        if ($student && $student->photo_url) {
            return $student->photo_url;
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
