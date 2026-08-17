<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Teacher extends Model
{
    use HasFactory;

    protected $table = 'teachers';

    protected $fillable = [
        'user_id',
        'name',
        'nip',
        'phone_number',
        'photo',
        'face_descriptor',
    ];

    protected $appends = ['photo_url'];

    /**
     * Accessor untuk mendapatkan URL lengkap foto guru dari aplikasi Absensi / SIPADA.
     */
    public function getPhotoUrlAttribute()
    {
        if (empty($this->photo)) {
            return null;
        }

        if (Str::startsWith($this->photo, ['http://', 'https://'])) {
            return $this->photo;
        }

        // 1. Cek file fisik di storage publik LMS Mokopani langsung
        if (file_exists(public_path('storage/' . $this->photo))) {
            return asset('storage/' . $this->photo);
        }

        // 2. Base URL Absensi / SIPADA
        $absensiUrl = rtrim(env('SSO_ABSENSI_URL', env('ABSENSI_URL', 'http://localhost:8002')), '/');
        $sipadaUrl = rtrim(env('SIPADA_URL', env('VITE_SIPADA_URL', 'http://localhost:8000')), '/');

        // 3. Cek direktori fisik aplikasi-absensi jika berdampingan
        $absensiStoragePath = env('ABSENSI_STORAGE_DIR', base_path('../aplikasi-absensi/storage/app/public'));
        if (file_exists($absensiStoragePath . '/' . $this->photo)) {
            return $absensiUrl . '/storage/' . $this->photo;
        }

        // 4. Cek direktori fisik sistem-pangkalan-data jika berdampingan
        $sipadaStoragePath = env('SIPADA_STORAGE_DIR', base_path('../sistem-pangkalan-data/storage/app/public'));
        if (file_exists($sipadaStoragePath . '/' . $this->photo)) {
            return $sipadaUrl . '/storage/' . $this->photo;
        }

        // 5. Fallback ke URL Absensi storage
        return $absensiUrl . '/storage/' . $this->photo;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subjects()
    {
        return $this->belongsToMany(Subject::class, 'subject_teacher');
    }
}
