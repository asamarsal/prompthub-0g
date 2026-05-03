<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WatermarkService
{
    /**
     * Apply a diagonal "PromptHub" text watermark to an image file.
     * Uses PHP GD (built-in, no external packages needed).
     *
     * @param string $sourcePath  Absolute path to the source image file.
     * @param string $destPath    Absolute path where the watermarked image will be saved.
     * @param string $text        Watermark text (default: "PromptHub").
     * @return bool  True on success, false on failure.
     */
    public function apply(string $sourcePath, string $destPath, string $text = 'PromptHub'): bool
    {
        if (!extension_loaded('gd')) {
            Log::warning('WatermarkService: GD extension not loaded, skipping watermark.');
            return false;
        }

        if (!file_exists($sourcePath)) {
            Log::warning('WatermarkService: Source file not found: ' . $sourcePath);
            return false;
        }

        $mime = mime_content_type($sourcePath);
        $image = $this->createImageFromFile($sourcePath, $mime);

        if (!$image) {
            Log::warning('WatermarkService: Could not create image resource from: ' . $sourcePath);
            return false;
        }

        try {
            $width = imagesx($image);
            $height = imagesy($image);

            // Enable alpha blending for transparency
            imagealphablending($image, true);

            // Create semi-transparent white color for watermark text
            $watermarkColor = imagecolorallocatealpha($image, 255, 255, 255, 80);

            // Calculate font size relative to image dimensions
            $fontSize = max(12, (int) (min($width, $height) * 0.06));

            // Use built-in GD font for maximum compatibility (no TTF dependency)
            // We'll tile the watermark text diagonally across the image
            $this->tileWatermark($image, $width, $height, $text, $watermarkColor, $fontSize);

            // Ensure destination directory exists
            $destDir = dirname($destPath);
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }

            // Save the watermarked image
            $saved = $this->saveImage($image, $destPath, $mime);
            imagedestroy($image);

            return $saved;
        } catch (\Throwable $e) {
            Log::error('WatermarkService: Error applying watermark: ' . $e->getMessage());
            if (isset($image) && $image !== false) {
                imagedestroy($image);
            }
            return false;
        }
    }

    /**
     * Tile watermark text diagonally across the entire image.
     */
    private function tileWatermark($image, int $width, int $height, string $text, $color, int $fontSize): void
    {
        // Use GD built-in fonts (1-5, where 5 is the largest)
        $font = 5; // Largest built-in font
        $charWidth = imagefontwidth($font);
        $charHeight = imagefontheight($font);
        $textWidth = $charWidth * strlen($text);

        // Spacing between watermark repetitions
        $spacingX = $textWidth + max(60, (int) ($width * 0.1));
        $spacingY = max(80, (int) ($height * 0.12));

        // Draw tiled watermark pattern
        for ($y = -$height; $y < $height * 2; $y += $spacingY) {
            for ($x = -$width; $x < $width * 2; $x += $spacingX) {
                // Since GD built-in fonts don't support rotation,
                // we draw the text horizontally with offset pattern
                $offsetX = $x + (int) (($y / $spacingY) * ($spacingX * 0.3));
                imagestring($image, $font, $offsetX, $y, $text, $color);
            }
        }
    }

    /**
     * Create a GD image resource from a file based on MIME type.
     */
    private function createImageFromFile(string $path, ?string $mime)
    {
        return match ($mime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/gif' => @imagecreatefromgif($path),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            default => false,
        };
    }

    /**
     * Save a GD image resource to a file based on MIME type.
     */
    private function saveImage($image, string $path, ?string $mime): bool
    {
        return match ($mime) {
            'image/jpeg', 'image/jpg' => imagejpeg($image, $path, 85),
            'image/png' => imagepng($image, $path, 8),
            'image/gif' => imagegif($image, $path),
            'image/webp' => function_exists('imagewebp') ? imagewebp($image, $path, 85) : false,
            default => imagejpeg($image, $path, 85), // Fallback to JPEG
        };
    }

    /**
     * Check if a file is a supported image type for watermarking.
     */
    public function isImageFile(string $mimeType): bool
    {
        return in_array($mimeType, [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
        ]);
    }
}
