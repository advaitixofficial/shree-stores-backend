import mongoose from 'mongoose';
import { User, Product, Category, Employee, Delivery, StoreSettings, Coupon } from '../src/models';
import { OrderService } from '../src/services/order.service';
import { DeliveryService } from '../src/services/delivery.service';
import { CartService } from '../src/services/cart.service';
import { BadRequestError } from '../src/utils/errors';

describe('Order System & Delivery Employee Lifecycle Tests', () => {
  let customerId: string;
  let categoryId: string;
  let productId: string;
  let addressId: string;

  beforeEach(async () => {
    // 1. Create Default Store Settings
    await StoreSettings.create({
      storeName: 'Shree Stores Test',
      storeNameHindi: 'श्री स्टोर्स टेस्ट',
      phone: '+919876543210',
      email: 'test@shreestores.com',
      address: 'Varanasi',
      latitude: 25.3176,
      longitude: 82.9739,
      deliveryEnabled: true,
      deliveryRadiusKm: 5,
      deliveryFee: 30,
      freeDeliveryMinimum: 500,
    });

    // 2. Create User
    const user = await User.create({
      firstName: 'Ramesh',
      lastName: 'Kumar',
      phone: '+919999988888',
      role: 'CUSTOMER',
      isVerified: true,
    });
    customerId = user._id.toString();

    // 3. Create Address (Within 2km from store: store is 25.3176, 82.9739)
    const AddressModel = mongoose.model('Address');
    const address = await AddressModel.create({
      user: customerId,
      label: 'HOME',
      fullName: 'Ramesh Kumar',
      phone: '+919999988888',
      addressLine1: 'Sigra',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      postalCode: '221010',
      latitude: 25.3210, // ~400m away
      longitude: 82.9750,
      isDefault: true,
    });
    addressId = address._id.toString();

    // 4. Create Category
    const category = await Category.create({
      name: 'Vegetables',
      nameHindi: 'सब्जियां',
      slug: 'vegetables',
      sortOrder: 1,
    });
    categoryId = category._id.toString();

    // 5. Create Product with stock = 10
    const product = await Product.create({
      name: 'Fresh Tomatoes',
      nameHindi: 'टमाटर',
      slug: 'fresh-tomatoes',
      description: 'Organic red tomatoes',
      descriptionHindi: 'लाल टमाटर',
      category: categoryId,
      sku: 'TOM-001',
      unit: 'kg',
      unitValue: 1,
      price: 40,
      mrp: 50,
      stock: 10,
      lowStockThreshold: 2,
    });
    productId = product._id.toString();
  });

  test('Should place order successfully and decrement product stock', async () => {
    // Add item to cart
    await CartService.updateCartItem(customerId, productId, 2);

    // Place order
    const order = await OrderService.createOrder(customerId, {
      addressId,
      paymentMethod: 'COD',
    });

    expect(order).toBeDefined();
    expect(order.orderNumber).toBeDefined();
    expect(order.total).toBe(110); // (2 * 40) + 30 delivery fee

    // Check stock was decremented
    const updatedProduct = await Product.findById(productId);
    expect(updatedProduct?.stock).toBe(8);
    expect(updatedProduct?.isAvailable).toBe(true);
  });

  test('Should auto-deactivate product isAvailable flag when stock hits 0', async () => {
    await CartService.updateCartItem(customerId, productId, 10);

    await OrderService.createOrder(customerId, {
      addressId,
      paymentMethod: 'COD',
    });

    const updatedProduct = await Product.findById(productId);
    expect(updatedProduct?.stock).toBe(0);
    expect(updatedProduct?.isAvailable).toBe(false);
  });

  test('Should block order placement if stock is insufficient', async () => {
    await CartService.updateCartItem(customerId, productId, 5);

    // Concurrently or manually set stock down to 2 in DB
    await Product.findByIdAndUpdate(productId, { stock: 2 });

    await expect(
      OrderService.createOrder(customerId, {
        addressId,
        paymentMethod: 'COD',
      })
    ).rejects.toThrow(BadRequestError);
  });

  test('Should apply coupon percentage and honor caps', async () => {
    await Coupon.create({
      code: 'OFF50',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      maximumDiscount: 30, // Max cap 30
      startDate: new Date(Date.now() - 100000),
      endDate: new Date(Date.now() + 100000),
      perUserLimit: 1,
      minimumOrderAmount: 50,
    });

    await CartService.updateCartItem(customerId, productId, 2); // 2 * 40 = 80 subtotal

    const order = await OrderService.createOrder(customerId, {
      addressId,
      couponCode: 'OFF50',
      paymentMethod: 'COD',
    });

    expect(order.discount).toBe(30); // 50% of 80 is 40, capped at 30
    expect(order.total).toBe(80 - 30 + 30); // subtotal - discount + delivery fee = 80
  });

  test('Should reject order if customer coordinates are out of delivery radius', async () => {
    // Create an address far away (~30km away)
    const AddressModel = mongoose.model('Address');
    const farAddress = await AddressModel.create({
      user: customerId,
      label: 'HOME',
      fullName: 'Ramesh Kumar',
      phone: '+919999988888',
      addressLine1: 'Faraway Road',
      city: 'Mirzapur',
      state: 'Uttar Pradesh',
      postalCode: '231001',
      latitude: 25.1500,
      longitude: 82.5800,
    });

    await CartService.updateCartItem(customerId, productId, 1);

    await expect(
      OrderService.createOrder(customerId, {
        addressId: farAddress._id.toString(),
        paymentMethod: 'COD',
      })
    ).rejects.toThrow(/location|radius|KM/i);
  });

  test('Should assign employee (marking busy), and release employee on DELIVERED status transition', async () => {
    await CartService.updateCartItem(customerId, productId, 1);
    const order = await OrderService.createOrder(customerId, { addressId, paymentMethod: 'COD' });

    // Create delivery employee
    const employee = await Employee.create({
      name: 'Delivery Guy Rajesh',
      phone: '+919876543222',
      role: 'DELIVERY_EMPLOYEE',
      availability: 'AVAILABLE',
      status: 'ACTIVE',
    });

    // Accept order first, prepare it, and mark it ready
    await OrderService.updateOrderStatus(order._id.toString(), 'ACCEPTED');
    await OrderService.updateOrderStatus(order._id.toString(), 'PREPARING');
    await OrderService.updateOrderStatus(order._id.toString(), 'READY');

    // Assign employee (which moves it to OUT_FOR_DELIVERY)
    const delivery = await DeliveryService.assignEmployee(order._id.toString(), employee._id.toString());
    expect(delivery).toBeDefined();

    // Verify employee availability is now BUSY
    const busyEmployee = await Employee.findById(employee._id);
    expect(busyEmployee?.availability).toBe('BUSY');

    // Verify Delivery record is ASSIGNED
    const savedDelivery = await Delivery.findOne({ order: order._id });
    expect(savedDelivery?.status).toBe('ASSIGNED');

    // Since it is OUT_FOR_DELIVERY, next state transition is DELIVERED
    await OrderService.updateOrderStatus(order._id.toString(), 'DELIVERED');

    // Verify employee is released to AVAILABLE
    const freeEmployee = await Employee.findById(employee._id);
    expect(freeEmployee?.availability).toBe('AVAILABLE');

    // Verify Delivery record is updated to DELIVERED
    const finalDelivery = await Delivery.findOne({ order: order._id });
    expect(finalDelivery?.status).toBe('DELIVERED');
    expect(finalDelivery?.deliveredAt).toBeDefined();
  });
});
