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
        select: 'name nameHindi slug price mrp stock isAvailable isActive thumbnail unit unitValue variants',
      })
      .lean();

    if (!cart) {
      await Cart.create({ user: userId, items: [] });
      cart = await Cart.findOne({ user: userId })
        .populate({
          path: 'items.product',
          select: 'name nameHindi slug price mrp stock isAvailable isActive thumbnail unit unitValue variants',
        })
        .lean();
    }
    
    if (!cart) throw new Error('Failed to create cart');

    // Prune items where product was hard deleted (product is null)
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(item => item.product != null);

    if (cart.items.length !== originalLength) {
      // Save the pruned cart back to the database
      await Cart.updateOne(
        { _id: cart._id },
        { items: cart.items.map(i => ({ product: (i.product as any)._id, variantId: i.variantId, quantity: i.quantity })) }
      );
    }

    return cart;
  }


  /**
   * Add product to cart (increments quantity if already exists).
   */
  static async addToCart(userId: string, productId: string, variantId: string, quantityToAdd: number = 1) {
    if (!variantId) throw new BadRequestError('variantId is required');
    
    const product = await Product.findById(productId).select('isActive isAvailable variants').lean();
    if (!product) throw new NotFoundError('Product not found');
    if (!product.isActive || !product.isAvailable) {
      throw new BadRequestError('Product is currently unavailable');
    }

    const variant = product.variants.find(v => v._id?.toString() === variantId);
    if (!variant) throw new NotFoundError('Variant not found');
    if (!variant.isAvailable) throw new BadRequestError('Variant is out of stock');

    // Ensure cart exists
    await Cart.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId, items: [] } },
      { upsert: true }
    );

    // Check if item already exists in cart with same product and variant
    const existingCart = await Cart.findOne(
      { user: userId, 'items.product': productId, 'items.variantId': variantId },
      { 'items.$': 1 }
    ).lean();

    if (existingCart && existingCart.items.length > 0) {
      const currentQty = existingCart.items[0].quantity;
      const newQty = currentQty + quantityToAdd;

      if (newQty > variant.stock) {
        throw new BadRequestError(`Only ${variant.stock} items in stock`);
      }
      if (newQty > MAX_CART_ITEM_QUANTITY) {
        throw new BadRequestError(`Maximum ${MAX_CART_ITEM_QUANTITY} quantity allowed per item`);
      }

      // Atomic increment
      await Cart.findOneAndUpdate(
        { user: userId, 'items.product': productId, 'items.variantId': variantId },
        { $inc: { 'items.$.quantity': quantityToAdd } }
      );
    } else {
      if (quantityToAdd > variant.stock) {
        throw new BadRequestError(`Only ${variant.stock} items in stock`);
      }
      // Atomic push
      await Cart.findOneAndUpdate(
        { user: userId },
        { $push: { items: { product: new Types.ObjectId(productId), variantId: new Types.ObjectId(variantId), quantity: quantityToAdd } } }
      );
    }

    return this.getCart(userId);
  }

  /**
   * Set exact quantity for a product in cart.
   */
  static async updateCartItem(userId: string, productId: string, variantId: string, quantity: number) {
    if (!variantId) throw new BadRequestError('variantId is required');

    const product = await Product.findById(productId).select('isActive isAvailable variants').lean();
    if (!product) throw new NotFoundError('Product not found');
    if (!product.isActive || !product.isAvailable) {
      throw new BadRequestError('Product is currently unavailable');
    }

    const variant = product.variants.find(v => v._id?.toString() === variantId);
    if (!variant) throw new NotFoundError('Variant not found');

    if (quantity > variant.stock) {
      throw new BadRequestError(`Only ${variant.stock} items in stock`);
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
        { $pull: { items: { product: productId, variantId } } }
      );
    } else {
      // Check if item already exists
      const exists = await Cart.findOne(
        { user: userId, 'items.product': productId, 'items.variantId': variantId }
      ).lean();

      if (exists) {
        // Atomic set quantity
        await Cart.findOneAndUpdate(
          { user: userId, 'items.product': productId, 'items.variantId': variantId },
          { $set: { 'items.$.quantity': quantity } }
        );
      } else {
        // Atomic push new item
        await Cart.findOneAndUpdate(
          { user: userId },
          { $push: { items: { product: new Types.ObjectId(productId), variantId: new Types.ObjectId(variantId), quantity } } }
        );
      }
    }

    return this.getCart(userId);
  }

  /**
   * Remove product variant from cart.
   */
  static async removeItem(userId: string, productId: string, variantId: string) {
    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId, variantId } } },
      { new: true }
    )
      .populate({
        path: 'items.product',
        select: 'name nameHindi slug price mrp stock isAvailable isActive thumbnail unit unitValue variants',
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

      // Backward compatibility: If cart item doesn't have a variantId (from before migration), fallback to first variant
      const variantId = item.variantId || (product.variants && product.variants.length > 0 ? product.variants[0]._id : null);
      
      const variant = product.variants?.find((v: any) => v._id?.toString() === variantId?.toString());

      if (!variant) {
        issues.push(`Selected size for ${product.name} is no longer available.`);
        continue;
      }

      if (!variant.isAvailable) {
        issues.push(`${product.name} (${variant.unitValue} ${variant.unit}) is out of stock.`);
        continue;
      }

      if (item.quantity > variant.stock) {
        issues.push(`Only ${variant.stock} items left for ${product.name} (${variant.unitValue} ${variant.unit}).`);
        // Auto-adjust quantity downwards to available stock for valid items array
        item.quantity = variant.stock;
      }

      // We inject variant-specific fields into the item so the checkout logic uses them
      validItems.push({
        ...item,
        variantId: variant._id,
        priceSnapshot: variant.price,
        mrpSnapshot: variant.mrp,
        unitSnapshot: variant.unit,
        unitValueSnapshot: variant.unitValue,
        total: variant.price * item.quantity,
      });

      subtotal += variant.price * item.quantity;
    }

    return {
      isValid: issues.length === 0,
      issues,
      validItems,
      subtotal,
    };
  }
}
