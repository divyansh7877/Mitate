/**
 * Image Handler Utility
 * Downloads images from URLs and uploads them to Appwrite Storage
 */

import { ID, InputFile } from 'node-appwrite';
import axios from 'axios';

/**
 * Download an image from a URL and upload it to Appwrite Storage
 * @param {string} imageUrl
 * @param {string} bucketId
 * @param {string} filename
 * @param {import('node-appwrite').Storage} storage
 * @returns {Promise<string>} The File ID (or URL if you constructed it, but typically File ID)
 */
export async function downloadAndUploadImage(imageUrl, bucketId, filename, storage) {
    try {
        // Download the image as a buffer
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);

        // Upload to Appwrite Storage
        // InputFile.fromBuffer(buffer, filename)
        const file = await storage.createFile(
            bucketId,
            ID.unique(),
            InputFile.fromBuffer(buffer, filename)
        );

        return file.$id;
    } catch (error) {
        console.error(`Failed to process image ${filename}:`, error);
        throw error;
    }
}
