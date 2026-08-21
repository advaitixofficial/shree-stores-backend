import { Router } from 'express';
import { AddressController } from '../../controllers';
import { authenticateCustomer, validate } from '../../middleware';
import { createAddressSchema, updateAddressSchema } from '../../schemas';

const router = Router();

router.use(authenticateCustomer);

router.get('/', AddressController.getAddresses);
router.post('/', validate(createAddressSchema), AddressController.createAddress);
router.put('/:id', validate(updateAddressSchema), AddressController.updateAddress);
router.put('/:id/default', AddressController.setDefault);
router.delete('/:id', AddressController.deleteAddress);

export default router;
