import multer from 'multer'
import { Request } from 'express'

// Configure in-memory storage for file buffers
const storage = multer.memoryStorage()

/**
 * File filter to ensure only image files are uploaded
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed.'))
  }
}

/**
 * Multer middleware configured for single image uploads up to 5MB
 */
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
  fileFilter,
})
