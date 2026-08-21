import { Router } from 'express';
import { ProductController, CategoryController } from '../../controllers';
import { validate } from '../../middleware';
import { searchProductSchema } from '../../schemas';

const router = Router();

// Categories
router.get('/categories', CategoryController.getCategories);
router.get('/categories/:id', CategoryController.getCategory);

// Products
router.get('/products', validate(searchProductSchema), ProductController.getProducts);
router.get('/products/:id', ProductController.getProductById);

export default router;
