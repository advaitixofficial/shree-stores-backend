import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/address.service';
import { sendSuccess } from '../utils/response';

export class AddressController {
  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await AddressService.getAddresses(req.userId!);
      sendSuccess(res, addresses, 'Addresses fetched');
    } catch (error) {
      next(error);
    }
  }

  static async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await AddressService.createAddress(req.userId!, req.body);
      sendSuccess(res, address, 'Address created', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await AddressService.updateAddress(req.userId!, req.params.id, req.body);
      sendSuccess(res, address, 'Address updated');
    } catch (error) {
      next(error);
    }
  }

  static async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await AddressService.setDefault(req.userId!, req.params.id);
      sendSuccess(res, address, 'Default address updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      await AddressService.deleteAddress(req.userId!, req.params.id);
      sendSuccess(res, null, 'Address deleted');
    } catch (error) {
      next(error);
    }
  }
}
