import { Router } from 'express';
import { ProductController, CategoryController } from '../../controllers';
import { authenticateAdmin, requireRole, validate, upload } from '../../middleware';
import { createProductSchema, updateProductSchema, updateStockSchema, createCategorySchema, updateCategorySchema, paginationQuerySchema } from '../../schemas';

const router = Router();

router.use(authenticateAdmin);

// Must be at least MANAGER for catalog ops
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']));

// --- Categories ---
router.get('/categories', validate(paginationQuerySchema), CategoryController.getAdminCategories);
router.post('/categories', upload.single('image'), validate(createCategorySchema), CategoryController.createCategory);
router.put('/categories/:id', upload.single('image'), validate(updateCategorySchema), CategoryController.updateCategory);
router.delete('/categories/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), CategoryController.deleteCategory); // Only Admin/Super can delete

// --- Products ---
router.post('/products', upload.array('images', 5), validate(createProductSchema), ProductController.createProduct);
router.put('/products/:id', validate(updateProductSchema), ProductController.updateProduct);
router.patch('/products/:id/stock', validate(updateStockSchema), ProductController.updateStock);
router.post('/products/:id/images', upload.single('image'), ProductController.uploadImage);
router.delete('/products/:id/images/:publicId', ProductController.deleteImage);
router.delete('/products/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), ProductController.deleteProduct);

export default router;
