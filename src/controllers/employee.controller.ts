import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/helpers';

export class EmployeeController {
  static async getEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const filters = {
        status: req.query.status,
        availability: req.query.availability,
        role: req.query.role,
      };

      const result = await EmployeeService.getEmployees(page, limit, filters);
      sendPaginated(res, result.employees, result.pagination, 'Employees fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getAvailableDeliveryEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const employees = await EmployeeService.getAvailableDeliveryEmployees();
      sendSuccess(res, employees, 'Available delivery employees fetched');
    } catch (error) {
      next(error);
    }
  }

  static async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.createEmployee(req.body);
      sendSuccess(res, employee, 'Employee created', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await EmployeeService.updateEmployee(req.params.id, req.body);
      sendSuccess(res, employee, 'Employee updated');
    } catch (error) {
      next(error);
    }
  }
}
