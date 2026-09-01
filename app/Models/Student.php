<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Student extends Model
{
    use HasFactory;

    protected $table = 'students';

    protected $fillable = [
        'user_id',
        'name',
        'nis',
        'school_class_id',
        'religion',
        'unique_id',
        'photo',
        'face_descriptor'
    ];

    protected $attributes = [
        'religion' => 'islam',
    ];

    protected $appends = ['photo_url'];

    /**
     * Accessor untuk mendapatkan URL lengkap foto siswa dari SIPADA.
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

        // 2. Cek direktori fisik sistem-pangkalan-data jika berdampingan
        $sipadaStoragePath = env('SIPADA_STORAGE_DIR', base_path('../sistem-pangkalan-data/storage/app/public'));
        if (file_exists($sipadaStoragePath . '/' . $this->photo)) {
            return url('/media-proxy/' . ltrim($this->photo, '/'));
        }

        // 3. Cek direktori fisik aplikasi-absensi jika berdampingan
        $absensiStoragePath = env('ABSENSI_STORAGE_DIR', base_path('../aplikasi-absensi/storage/app/public'));
        if (file_exists($absensiStoragePath . '/' . $this->photo)) {
            return url('/media-proxy/' . ltrim($this->photo, '/'));
        }

        return url('/media-proxy/' . ltrim($this->photo, '/'));
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }
}
