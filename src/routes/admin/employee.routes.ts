import { Router } from 'express';
import { EmployeeController } from '../../controllers';
import { authenticateAdmin, requireRole, validate } from '../../middleware';
import { createEmployeeSchema, updateEmployeeSchema, paginationQuerySchema } from '../../schemas';

const router = Router();

router.use(authenticateAdmin);

// Managers can see available delivery employees for assigning orders
router.get('/available-delivery', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), EmployeeController.getAvailableDeliveryEmployees);

// Only Admins can manage employees
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/', validate(paginationQuerySchema), EmployeeController.getEmployees);
router.post('/', validate(createEmployeeSchema), EmployeeController.createEmployee);
router.put('/:id', validate(updateEmployeeSchema), EmployeeController.updateEmployee);

export default router;
