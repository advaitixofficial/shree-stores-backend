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
   * Add product to cart (increments quantity if already exists).
   * Uses atomic MongoDB operations to prevent version conflicts on rapid taps.
   */
  static async addToCart(userId: string, productId: string, quantityToAdd: number = 1) {
    const product = await Product.findById(productId).select('isActive isAvailable stock').lean();
    if (!product) throw new NotFoundError('Product not found');
    if (!product.isActive || !product.isAvailable) {
      throw new BadRequestError('Product is currently unavailable');
    }

    // Ensure cart exists
    await Cart.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, items: [] } },
      { upsert: true }
    );

    // Check if item already exists in cart
    const existingCart = await Cart.findOne(
      { user: userId, 'items.product': productId },
      { 'items.$': 1 }
    ).lean();

    if (existingCart && existingCart.items.length > 0) {
      const currentQty = existingCart.items[0].quantity;
      const newQty = currentQty + quantityToAdd;

      if (newQty > product.stock) {
        throw new BadRequestError(`Only ${product.stock} items in stock`);
      }
      if (newQty > MAX_CART_ITEM_QUANTITY) {
        throw new BadRequestError(`Maximum ${MAX_CART_ITEM_QUANTITY} quantity allowed per item`);
      }

      // Atomic increment
      await Cart.findOneAndUpdate(
        { user: userId, 'items.product': productId },
        { $inc: { 'items.$.quantity': quantityToAdd } }
      );
    } else {
      if (quantityToAdd > product.stock) {
        throw new BadRequestError(`Only ${product.stock} items in stock`);
      }
      // Atomic push
      await Cart.findOneAndUpdate(
        { user: userId },
        { $push: { items: { product: new Types.ObjectId(productId), quantity: quantityToAdd } } }
      );
    }

    return this.getCart(userId);
  }

  /**
   * Set exact quantity for a product in cart.
   * Uses atomic MongoDB operations to prevent version conflicts.
   */
  static async updateCartItem(userId: string, productId: string, quantity: number) {
    const product = await Product.findById(productId).select('isActive isAvailable stock').lean();
    if (!product) throw new NotFoundError('Product not found');
    if (!product.isActive || !product.isAvailable) {
      throw new BadRequestError('Product is currently unavailable');
    }

    if (quantity > product.stock) {
      throw new BadRequestError(`Only ${product.stock} items in stock`);
    }
    if (quantity > MAX_CART_ITEM_QUANTITY) {
      throw new BadRequestError(`Maximum ${MAX_CART_ITEM_QUANTITY} quantity allowed per item`);
    }

    // Ensure cart exists
    await Cart.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, items: [] } },
      { upsert: true }
    );

    if (quantity <= 0) {
      // Atomic pull (remove item)
      await Cart.findOneAndUpdate(
        { user: userId },
        { $pull: { items: { product: productId } } }
      );
    } else {
      // Check if item already exists
      const exists = await Cart.findOne(
        { user: userId, 'items.product': productId }
      ).lean();

      if (exists) {
        // Atomic set quantity
        await Cart.findOneAndUpdate(
          { user: userId, 'items.product': productId },
          { $set: { 'items.$.quantity': quantity } }
        );
      } else {
        // Atomic push new item
        await Cart.findOneAndUpdate(
          { user: userId },
          { $push: { items: { product: new Types.ObjectId(productId), quantity } } }
        );
      }
    }

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
