"use strict";
/**
 * Service to interface with the FastAPI AI Service for image classification.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictCategory = void 0;
/**
 * Sends an image file buffer to the FastAPI AI service to classify the civic issue.
 * Automatically handles timeouts and service downtime by returning a fallback category.
 *
 * @param fileBuffer - Buffer of the uploaded image
 * @param filename - Name of the file for the multipart form-data payload
 * @returns Object containing predicted category and confidence score
 */
const predictCategory = async (fileBuffer, filename) => {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'image/jpeg' });
        formData.append('file', blob, filename);
        // Apply a 5-second AbortController timeout to prevent blocking client requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${aiServiceUrl}/predict`, {
            method: 'POST',
            body: formData,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`AI Service HTTP error status ${response.status}`);
        }
        const data = (await response.json());
        return {
            category: data.category || 'Other',
            confidence: data.confidence ?? 0.0,
        };
    }
    catch (err) {
        console.warn(`⚠️ AI Service classification query failed: ${err.message || err}. Defaulting to 'Other'.`);
        return {
            category: 'Other',
            confidence: 0.0,
        };
    }
};
exports.predictCategory = predictCategory;
