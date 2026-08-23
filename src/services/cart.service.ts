import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { Types } from 'mongoose';
import { MAX_CART_ITEM_QUANTITY } from '../constants';

export class CartService {
  /**
   * Get user's cart populated with current product details.
   */
  static async getCart(userId: string) {
    let cart = await Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'name nameHindi slug price mrp stock isAvailable isActive thumbnail unit unitValue',
      })
      .lean();

    if (!cart) {
      await Cart.create({ user: userId, items: [] });
      cart = await Cart.findOne({ user: userId })
        .populate({
          path: 'items.product',
          select: 'name nameHindi slug price mrp stock isAvailable isActive thumbnail unit unitValue',
        })
        .lean();
    }
    
    if (!cart) throw new Error('Failed to create cart');

    return cart;
  }

  /**
   * Add or update product in cart.
   */
  static async updateCartItem(userId: string, productId: string, quantity: number) {
    // 1. Verify product exists and is active
    const product = await Product.findById(productId).select('isActive isAvailable stock').lean();
    if (!product) throw new NotFoundError('Product not found');
    if (!product.isActive || !product.isAvailable) {
      throw new BadRequestError('Product is currently unavailable');
    }

    // 2. Validate requested quantity against stock
    if (quantity > product.stock) {
      throw new BadRequestError(`Only ${product.stock} items in stock`);
    }

    if (quantity > MAX_CART_ITEM_QUANTITY) {
      throw new BadRequestError(`Maximum ${MAX_CART_ITEM_QUANTITY} quantity allowed per item`);
    }

    // 3. Find or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // 4. Update items array
    const itemIndex = cart.items.findIndex(
      (item) => item.product?.toString() === productId
    );

    if (itemIndex > -1) {
      // Update existing item
      if (quantity === 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
    } else {
      // Add new item
      if (quantity > 0) {
        cart.items.push({ product: new Types.ObjectId(productId), quantity });
      }
    }

    await cart.save();
    return this.getCart(userId);
  }

  /**
   * Remove product from cart.
   */
  static async removeItem(userId: string, productId: string) {
    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId } } },
      { new: true }
    )
      .populate({
        path: 'items.product',
        select: 'name nameHindi slug price mrp stock isAvailable isActive thumbnail unit unitValue',
      })
      .lean();

    if (!cart) throw new NotFoundError('Cart not found');
    return cart;
  }

  /**
   * Clear cart entirely.
   */
  static async clearCart(userId: string) {
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
  }

  /**
   * Validate cart before checkout to catch out-of-stock or changed prices.
   */
  static async validateCart(userId: string) {
    const cart = await this.getCart(userId);
    const issues: string[] = [];
    const validItems: any[] = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product: any = item.product;
      
      if (!product || !product.isActive || !product.isAvailable) {
        issues.push(`${product?.name || 'Product'} is no longer available.`);
        continue;
      }

      if (item.quantity > product.stock) {
        issues.push(`Only ${product.stock} items left for ${product.name}.`);
        // Auto-adjust quantity downwards to available stock for valid items array
        item.quantity = product.stock;
      }

      validItems.push({
        ...item,
        priceSnapshot: product.price,
        mrpSnapshot: product.mrp,
        total: product.price * item.quantity,
      });

      subtotal += product.price * item.quantity;
    }

    return {
      isValid: issues.length === 0,
      issues,
      validItems,
      subtotal,
    };
  }
}
