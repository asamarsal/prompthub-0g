<?php

use App\Services\ZeroGComputeService;

test('0g compute json parser accepts strict json', function () {
    $parsed = app(ZeroGComputeService::class)->parseJsonContent('{"clarity":8,"reasoning":"ok"}');

    expect($parsed)
        ->toBeArray()
        ->and($parsed['clarity'])->toBe(8)
        ->and($parsed['reasoning'])->toBe('ok');
});

test('0g compute json parser accepts markdown fenced json', function () {
    $parsed = app(ZeroGComputeService::class)->parseJsonContent(
        "```json\n{\"clarity\":9,\"reasoning\":\"wrapped\"}\n```"
    );

    expect($parsed)
        ->toBeArray()
        ->and($parsed['clarity'])->toBe(9)
        ->and($parsed['reasoning'])->toBe('wrapped');
});

test('0g compute json parser extracts json from extra model text', function () {
    $parsed = app(ZeroGComputeService::class)->parseJsonContent(
        "Sure, here is the result:\n{\"clarity\":7,\"reasoning\":\"extra text\"}\nHope this helps."
    );

    expect($parsed)
        ->toBeArray()
        ->and($parsed['clarity'])->toBe(7)
        ->and($parsed['reasoning'])->toBe('extra text');
});
