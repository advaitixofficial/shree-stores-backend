import { Router } from 'express';
import { UserController } from '../../controllers';
import { authenticateCustomer, validate, upload } from '../../middleware';
import { updateProfileSchema } from '../../schemas';

const router = Router();

router.use(authenticateCustomer);

router.get('/me', UserController.getProfile);
router.put('/me', validate(updateProfileSchema), UserController.updateProfile);
router.post('/me/image', upload.single('image'), UserController.uploadImage);
router.post('/me/push-token', UserController.updatePushToken);

export default router;
