import multer from 'multer';
import { BadRequestError } from '../utils/errors';
import { ALLOWED_IMAGE_MIMES, MAX_FILE_SIZE } from '../constants';

/**
 * Configure Multer to use memory storage.
 * Files are kept in memory as Buffers and never written to disk.
 * They will be streamed directly to Cloudinary.
 */
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`Invalid file type. Allowed: ${ALLOWED_IMAGE_MIMES.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // 5MB limit
  },
  fileFilter,
});
