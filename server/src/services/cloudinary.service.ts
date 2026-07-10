import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

/**
 * Uploads a file buffer to Cloudinary using a stream.
 * If Cloudinary environment variables are missing, falls back to a placeholder image.
 *
 * @param fileBuffer - Buffer of the file to upload
 * @returns Secure URL of the uploaded image
 */
export const uploadImage = (fileBuffer: Buffer): Promise<string> => {
  return new Promise((resolve, reject) => {
    const isConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET

    if (!isConfigured) {
      console.warn('CLOUDINARY credentials missing. Falling back to placeholder image URL.')
      resolve('https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80')
      return
    }

    // Configure Cloudinary lazily, at call time, so env vars are guaranteed loaded
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'civicsense_complaints' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error)
          return reject(error)
        }
        if (result) {
          return resolve(result.secure_url)
        }
        return reject(new Error('Cloudinary upload returned empty result.'))
      }
    )

    const readable = new Readable()
    readable.push(fileBuffer)
    readable.push(null)
    readable.pipe(uploadStream)
  })
}
