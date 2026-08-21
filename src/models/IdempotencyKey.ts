import mongoose, { Schema } from 'mongoose';
import type { IIdempotencyKey } from '../types';
import { IDEMPOTENCY_TTL_SECONDS } from '../constants';

const IdempotencyKeySchema = new Schema<IIdempotencyKey>(
  {
    key: { type: String, required: true, unique: true },
    response: { type: Schema.Types.Mixed, required: true },
    statusCode: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now, expires: IDEMPOTENCY_TTL_SECONDS },
  }
);

export const IdempotencyKey = mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
