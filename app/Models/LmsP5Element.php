<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LmsP5Element extends Model
{
    protected $table = 'lms_p5_elements';

    protected $fillable = ['dimensi_id', 'nama', 'deskripsi'];

    public function dimensi()
    {
        return $this->belongsTo(LmsP5Dimensi::class, 'dimensi_id');
    }

    public function subElements()
    {
        return $this->hasMany(LmsP5SubElement::class, 'element_id');
    }
}
