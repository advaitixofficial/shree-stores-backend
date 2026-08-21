import { Order } from '../models/Order';
import { Employee } from '../models/Employee';
import { Delivery } from '../models/Delivery';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { runInTransaction } from '../utils/transaction';

export class DeliveryService {
  /**
   * Assign an employee to an order.
   */
  static async assignEmployee(orderId: string, employeeId: string) {
    return runInTransaction(async (session) => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new NotFoundError('Order not found');

      if (!['READY', 'PREPARING'].includes(order.orderStatus)) {
        throw new BadRequestError(`Cannot assign employee to order in ${order.orderStatus} state`);
      }

      const employee = await Employee.findById(employeeId).session(session);
      if (!employee) throw new NotFoundError('Employee not found');

      if (employee.status !== 'ACTIVE' || employee.availability !== 'AVAILABLE') {
        throw new BadRequestError('Employee is not available');
      }

      // Mark employee busy
      employee.availability = 'BUSY';
      await employee.save({ session });

      // Update Order
      order.assignedEmployee = employee._id;
      order.orderStatus = 'OUT_FOR_DELIVERY';
      order.outForDeliveryAt = new Date();
      await order.save({ session });

      // Create Delivery Record
      const delivery = await Delivery.create([{
        order: order._id,
        employee: employee._id,
        assignedAt: new Date(),
        status: 'ASSIGNED',
      }], { session });

      return delivery[0];
    });
  }
}
