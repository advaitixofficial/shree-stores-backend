# Shree Stores - Backend API

This is the Node.js/Express backend for Shree Stores, serving both the Customer App and the Admin/Store Manager App.

## Features
- **Authentication**: Phone/OTP for customers, Email/Password for Admins
- **Catalog**: Products, Categories, Stock tracking
- **Ordering**: Cart validation, Haversine distance-based delivery checks, coupon handling
- **Payments**: COD out-of-the-box (extensible to Razorpay/Stripe)
- **Roles**: Super Admin, Admin, Manager
- **Deliveries**: Assign store employees to orders
- **Real-time**: Socket.IO integrated

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your MongoDB, Redis, JWT, and Cloudinary credentials.

3. **Seed Database**
   This creates the first Super Admin and default store settings.
   ```bash
   npx ts-node src/scripts/seed.ts
   ```

4. **Run Server (Development)**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Tech Stack
- TypeScript
- Express
- MongoDB (Mongoose)
- Redis (IORedis)
- Zod (Validation)
- Socket.IO
- Cloudinary (Image streaming via multer memoryStorage)
