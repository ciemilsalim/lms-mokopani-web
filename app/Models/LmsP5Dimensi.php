<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsP5Dimensi extends Model
{
    protected $table = 'lms_p5_dimensi';

    protected $fillable = ['kode', 'nama', 'deskripsi'];

    public function elements()
    {
        return $this->hasMany(LmsP5Element::class, 'dimensi_id');
    }
}
