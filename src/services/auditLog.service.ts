import { AuditLog } from '../models/AuditLog';
import { cleanObject } from '../utils/helpers';
import type { AuditAction } from '../types';

export class AuditLogService {
  static async log(
    adminId: string,
    action: AuditAction,
    resource: string,
    resourceId?: string,
    before?: any,
    after?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await AuditLog.create({
        admin: adminId,
        action,
        resource,
        resourceId,
        before: before ? cleanObject(before) : undefined,
        after: after ? cleanObject(after) : undefined,
        ipAddress,
        userAgent,
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  static async getLogs(page: number, limit: number, filters: any) {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (filters.action) query.action = filters.action;
    if (filters.admin) query.admin = filters.admin;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('admin', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total };
  }
}
