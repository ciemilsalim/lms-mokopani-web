<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LmsMaterialResource extends Model
{
    use HasFactory;

    protected $table = 'lms_material_resources';

    protected $fillable = [
        'material_id',
        'type',
        'title',
        'path',
        'file_type',
    ];

    public function material()
    {
        return $this->belongsTo(LmsMaterial::class, 'material_id');
    }
}
