<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsAnnouncement extends Model
{
    use HasFactory;

    protected $table = 'lms_announcements';

    protected $fillable = [
        'teacher_id',
        'school_class_id',
        'title',
        'content',
        'priority',
    ];

    public function teacher()
    {
        return $this->belongsTo(Teacher::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class);
    }
}
