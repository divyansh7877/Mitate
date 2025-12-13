/**
 * Image Download Utility
 * Downloads images from URLs and saves them to local filesystem
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

/**
 * Download an image from a URL and save it to the output directory
 */
export async function downloadImage(
  imageUrl: string,
  filename: string,
  outputDir: string = './output'
): Promise<DownloadResult> {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Download the image
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error ${response.status}: ${response.statusText}`,
      };
    }

    // Get the image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to file
    const localPath = path.join(outputDir, filename);
    fs.writeFileSync(localPath, buffer);

    return {
      success: true,
      localPath,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download multiple images and save them
 */
export async function downloadImages(
  imageUrls: string[],
  baseFilename: string,
  outputDir: string = './output'
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    const filename = imageUrls.length === 1
      ? `${baseFilename}.png`
      : `${baseFilename}_section_${i + 1}.png`;

    const result = await downloadImage(url, filename, outputDir);
    results.push(result);

    if (result.success) {
      console.log(`✓ Downloaded: ${result.localPath}`);
    } else {
      console.error(`✗ Failed to download section ${i + 1}: ${result.error}`);
    }
  }

  return results;
}

/**
 * Generate a unique filename for a poster
 */
export function generatePosterFilename(requestId: string, mode: string = 'single'): string {
  const timestamp = Date.now();
  return `poster_${mode}_${timestamp}_${requestId}`;
}
