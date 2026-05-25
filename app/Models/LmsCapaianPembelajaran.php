<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsCapaianPembelajaran extends Model
{
    use HasFactory;

    protected $table = 'lms_capaian_pembelajaran';

    protected $fillable = [
        'kode',
        'fase',
        'elemen',
        'subject_id',
        'deskripsi',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function learningObjectives()
    {
        return $this->hasMany(LmsLearningObjective::class, 'cp_id');
    }
}
