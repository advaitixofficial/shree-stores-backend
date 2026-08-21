import { Employee } from '../models/Employee';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { buildPaginationMeta } from '../utils/helpers';

export class EmployeeService {
  /**
   * Get all employees (Admin)
   */
  static async getEmployees(page: number, limit: number, filters: any) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) query.status = filters.status;
    if (filters.availability) query.availability = filters.availability;
    if (filters.role) query.role = filters.role;

    const [employees, total] = await Promise.all([
      Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Employee.countDocuments(query),
    ]);

    return { employees, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Get available delivery employees.
   */
  static async getAvailableDeliveryEmployees() {
    return Employee.find({
      role: 'DELIVERY_EMPLOYEE',
      status: 'ACTIVE',
      availability: 'AVAILABLE',
    }).lean();
  }

  static async createEmployee(data: any) {
    const existing = await Employee.findOne({ phone: data.phone }).lean();
    if (existing) throw new BadRequestError('Employee with this phone already exists');
    return Employee.create(data);
  }

  static async updateEmployee(id: string, data: any) {
    const employee = await Employee.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
    if (!employee) throw new NotFoundError('Employee not found');
    return employee;
  }
}
