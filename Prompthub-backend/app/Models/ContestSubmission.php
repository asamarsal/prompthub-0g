<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContestSubmission extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'contest_id', 'artist_address', 'cid_ipfs', 'preview_image_url',
        'prompt_used', 'tool', 'storage_root_hash', 'storage_tx_hash',
        'ipfs_metadata_uri', 'onchain_entry_id', 'is_winner'
    ];

    protected $casts = [
        'is_winner' => 'boolean',
    ];

    public function contest()
    {
        return $this->belongsTo(Contest::class);
    }
}
