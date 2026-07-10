require('dotenv').config()
console.log('cloud:', process.env.CLOUDINARY_CLOUD_NAME)
console.log('key:', process.env.CLOUDINARY_API_KEY)
console.log('secret exists:', !!process.env.CLOUDINARY_API_SECRET)
