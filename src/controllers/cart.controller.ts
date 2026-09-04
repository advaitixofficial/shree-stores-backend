import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { sendSuccess } from '../utils/response';

export class CartController {
  static async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await CartService.getCart(req.userId!);
      sendSuccess(res, cart, 'Cart fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, quantity = 1 } = req.body;
      const cart = await CartService.addToCart(req.userId!, productId, quantity);
      sendSuccess(res, cart, 'Item added to cart');
    } catch (error) {
      next(error);
    }
  }

  static async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { quantity } = req.body;
      const { productId } = req.params;
      const cart = await CartService.updateCartItem(req.userId!, productId, quantity);
      sendSuccess(res, cart, 'Cart item updated');
    } catch (error) {
      next(error);
    }
  }

  static async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await CartService.removeItem(req.userId!, req.params.productId);
      sendSuccess(res, cart, 'Item removed from cart');
    } catch (error) {
      next(error);
    }
  }

  static async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      await CartService.clearCart(req.userId!);
      sendSuccess(res, null, 'Cart cleared');
    } catch (error) {
      next(error);
    }
  }

  static async validateCart(req: Request, res: Response, next: NextFunction) {
    try {
      const validation = await CartService.validateCart(req.userId!);
      sendSuccess(res, validation, 'Cart validation complete');
    } catch (error) {
      next(error);
    }
  }
}
