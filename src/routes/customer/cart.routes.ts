import { Router } from 'express';
import { CartController } from '../../controllers';
import { authenticateCustomer, validate } from '../../middleware';
import { addToCartSchema, updateCartItemSchema } from '../../schemas';

const router = Router();

router.use(authenticateCustomer);

router.get('/', CartController.getCart);
router.post('/items', validate(addToCartSchema), CartController.addItem);
router.put('/items/:productId', validate(updateCartItemSchema), CartController.updateItem);
router.delete('/items/:productId', CartController.removeItem);
router.delete('/', CartController.clearCart);
router.post('/validate', CartController.validateCart);

export default router;
