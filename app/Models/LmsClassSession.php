<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsClassSession extends Model
{
    use HasFactory;

    protected $table = 'lms_class_sessions';

    protected $fillable = [
        'modul_ajar_id',
        'teacher_id',
        'school_class_id',
        'start_time',
        'end_time',
        'session_data',
        'attendance_synced',
    ];

    protected $casts = [
        'session_data' => 'array',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'attendance_synced' => 'boolean',
    ];

    public function modulAjar()
    {
        return $this->belongsTo(LmsModulAjar::class, 'modul_ajar_id');
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }
}
