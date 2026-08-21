# Shree Stores Backend Audit Report

This report presents the findings of a comprehensive code audit of the **Shree Stores Backend** codebase.

---

## 1. Overall Status
**STATUS: PARTIALLY COMPLETE**

While the core routes and Mongoose schemas exist, several business-critical workflows, life-cycle transitions, security/concurrency guards, and required admin features are either missing, partially complete, or contain lifecycle bugs.

---

## 2. Component Audits

### Authentication & Authorization
* **Status:** `[COMPLETE]`
* **Findings:** Customer authenticates securely via OTP with rate-limiting. Admin logins have lockout features against brute-force attacks. Tokens are verified using distinct JWT secrets. Customer roles cannot invoke admin routes.

### Database Schema & Integrity
* **Status:** `[COMPLETE]`
* **Findings:** All Mongoose models exist. Unique constraints and indexes (e.g. `phone` on User, `code` on Coupon, text search on Product) are correctly defined. No plaintext passwords stored.

### Idempotency Guard (Concurrency Race)
* **Status:** `[BROKEN] / [INSECURE]`
* **Severity:** **CRITICAL**
* **Problem:** The idempotency middleware (`src/middleware/idempotency.ts`) only saves the response *after* the request completes. If two identical requests hit the server concurrently (e.g., rapid double-tap on checkout), both find no existing key and proceed to create duplicate orders.
* **Fix:** Introduce a "processing" lock status in the database. If a concurrent request arrives before the first one completes, reject it with a `409 Conflict`.

### Delivery Employees Lifecycle
* **Status:** `[BROKEN]`
* **Severity:** **HIGH**
* **Problem:** Assigning an employee to an order changes their status to `BUSY`. However, when an order is updated to `DELIVERED`, the employee's availability is **never** reset back to `AVAILABLE`, leaving them stuck in the `BUSY` state forever.
* **Fix:** Update `OrderService.updateOrderStatus` to automatically set the employee back to `AVAILABLE` and update the matching `Delivery` record status to `DELIVERED` when the order transitions to `DELIVERED`.

### Coupon Admin Management
* **Status:** `[PARTIALLY COMPLETE]`
* **Severity:** **MEDIUM**
* **Problem:** There is no way for store managers or admins to list, create, update, or delete coupons via the API. Only validation checks exist.
* **Fix:** Implement Admin Coupon CRUD operations (service, controller, routes, schema checks).

### Customer & Admin Notifications
* **Status:** `[MISSING]`
* **Severity:** **HIGH**
* **Problem:** There are no endpoints to fetch notifications for customers or admins. Additionally, there is no service to trigger these notifications on order stage transitions.
* **Fix:** Create a `NotificationService` and notification fetch/read routers for customers and admins. Trigger notifications during checkout, delivery assignments, status updates, and cancellations.

### Admin Category Listing
* **Status:** `[PARTIALLY COMPLETE]`
* **Severity:** **MEDIUM**
* **Problem:** Store managers cannot list all categories (including inactive ones) via the admin panel. They are forced to use the customer catalog route, which only returns active categories.
* **Fix:** Add a dedicated admin paginated category listing endpoint.

### Dashboard Sales & Marketing Reports
* **Status:** `[MISSING]`
* **Severity:** **MEDIUM**
* **Problem:** Date-filtered sales statistics, average order values, top-selling products, and category distributions are missing. Only a basic today-only summary is present in the dashboard statistics service.
* **Fix:** Implement a sales reports aggregation service.

---

## 3. Issues & Recommended Fixes

| Issue ID | Component | Severity | File Reference | Problem Description | Recommended Fix | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SS-B01** | Idempotency | **CRITICAL** | `src/middleware/idempotency.ts` | Concurrent double-taps bypass the cache check, creating duplicate orders. | Upsert a "processing" status key instantly upon request arrival; clear key if the handler throws. | **NOT FIXED** |
| **SS-B02** | Employee | **HIGH** | `src/services/order.service.ts` | Employees stay `BUSY` forever after order is delivered. | Update employee availability and `Delivery` document on order status transitions to `DELIVERED`. | **NOT FIXED** |
| **SS-B03** | Coupon | **MEDIUM** | `src/controllers/coupon.controller.ts` | Store managers cannot manage coupons. | Add list, create, update, delete endpoints to marketing routes. | **NOT FIXED** |
| **SS-B04** | Notification | **HIGH** | `src/services/notification.service.ts` | No notifications endpoints or creation service. | Create a Notification controller, routes, and trigger calls. | **NOT FIXED** |
| **SS-B05** | Category | **MEDIUM** | `src/routes/admin/catalog.routes.ts` | Admin cannot view inactive categories. | Add `GET /api/admin/catalog/categories` endpoint calling `getAdminCategories`. | **NOT FIXED** |
| **SS-B06** | Reports | **MEDIUM** | `src/services/report.service.ts` | Missing date-filtered sales & marketing reports. | Build a sales reports aggregation query filter. | **NOT FIXED** |
