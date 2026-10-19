# Project Audit: Printania (PrintNear)
**Date:** October 2026  
**Auditor:** Senior Full-Stack & System Architect  
**Project Identifier:** Printania / PrintNear  
**Workspace:** `/Users/apple/Desktop/PrintNear 2`

---

## 1. Executive Summary

Printania (historically developed under the branding **PrintNear**) is a hyperlocal cloud-printing platform designed to connect end-users (students, researchers, office workers) with nearby printing and photocopy shops. 

A thorough inspection of the repository reveals a working proof-of-concept / hardened prototype with real MongoDB persistence, JWT authentication, server-side price calculation during order creation, Leaflet-based geospatial shop discovery, Socket.IO real-time order chat, and Cloudinary/local document storage.

However, significant architectural gaps exist between the current prototype and the target production-grade vision:
1. **Three Core Technical Contributions:**
   - **Intelligent ECT (Estimated Completion Time) Prediction:** Currently missing. A rudimentary heuristic formula (`totalPagesAhead / 15 + targetIndex`) exists in `queueCalculator.js`. No machine learning service, dataset, training pipeline, or baseline comparison exists.
   - **Multi-Factor Shop Recommendation:** Only simple geospatial radius queries (`$geoNear`) are implemented. There is no multi-criteria scoring model incorporating distance, pricing for specific configurations, queue workloads, printer capabilities, and estimated completion times.
   - **Privacy-Aware Document Lifecycle:** Documents are uploaded and stored in Cloudinary or local disk. However, the local storage fallback does not have an authorized download/view endpoint (returns 404 or requires unauthenticated public exposure), there is no server-side page count verification (clients can falsify page counts), and cleanup is an unmonitored once-a-day cron without deletion audit trails, retries, or retention deadline models.
2. **Payment Processing:** Payment is limited to offline UPI QR code display and manual UTR submission with merchant confirmation. No automated gateway (such as Razorpay sandbox with signature verification and webhook idempotency) is integrated.
3. **User Roles & Admin Governance:** Only `customer` and `shopkeeper` roles exist. The `admin` role is completely absent from models, routes, and UI. No platform-wide oversight, dispute resolution, or shop suspension exists.
4. **Document Quoting:** Customers cannot obtain an authoritative quote before creating an order. The frontend computes its own local estimates, and `server/utils/pricing.js` is disconnected from `orderRoutes.js`.
5. **Testing & Observability:** No automated test suite (0 unit, integration, or E2E tests exist). No structured logging or Prometheus/health monitoring.

---

## 2. Technology Stack & Current Architecture

### 2.1 Frontend
- **Framework:** React 19 (`react`, `react-dom`) with Vite 6.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`).
- **Mapping:** Leaflet 1.9.4 and `react-leaflet` 5.0.0.
- **Networking:** Axios 1.19.0.
- **Real-Time:** Socket.IO client 4.8.3.
- **Icons & QR:** `lucide-react` 1.28.0, `qrcode.react` 4.2.0.

### 2.2 Backend
- **Runtime:** Node.js v25 (ES Modules).
- **Web Framework:** Express 5.2.1.
- **Database ODM:** Mongoose 9.9.1 (MongoDB Atlas).
- **Authentication:** `bcryptjs` 3.0.3, `jsonwebtoken` 9.0.3 (JWT in `Authorization: Bearer <token>`).
- **File Uploads:** `multer` 2.2.0 (memory storage, 10MB limit).
- **External Storage:** Cloudinary 2.10.0 (authenticated raw asset storage with fallback to local disk).
- **Scheduling:** `node-cron` 4.6.0.
- **Email Service:** `nodemailer` 9.0.5 (Gmail SMTP transport configured).
- **Real-Time Engine:** Socket.IO 4.8.3.

---

## 3. Inventory & Implementation Status by Domain

| Domain / Feature | Status | Implementation Details | Gaps & Risks |
| :--- | :--- | :--- | :--- |
| **Authentication & Profile** | Partially Functional | Registration & login via bcrypt + JWT. Profile update in `authRoutes.js`. | No email verification endpoint invoked. No password reset. No admin role. In-memory rate limiting only. |
| **Shop Management** | Partially Functional | Shop profile creation on vendor registration (`/api/shops/my-shop`). Update rates (`bwPerPage`, `colorPerPage`), address, coordinates, open/closed toggle. | No individual printer management. No operating hour schedules. No capacity limits. No finishing service custom pricing. |
| **Shop Discovery** | Basic | Geospatial `$geoNear` aggregation in MongoDB (`GET /api/shops/nearby`). Displays markers on Leaflet map. | No multi-factor scoring (Score = wD·D + wP·P + wQ·Q + wT·T). No sorting by Best Match / Lowest Price / Fastest ETA. |
| **Document Upload & Storage** | Partially Insecure | Multer memory storage. Uploads to Cloudinary (authenticated) or local `server/uploads`. | Local fallback has no authorized download route (local files 404). Cloudinary signed URL generation exists but lacks granular document access audit. Server does not parse PDF page counts; client sends trusted count! |
| **Document Privacy & Cleanup** | Minimal | Daily cron deletes files for `PickedUp` or `Cancelled` orders older than 24 hours. | No retention metadata model. No deletion retry or audit log. No handling of expired drafts or unpicked orders. |
| **Pricing & Quotes** | Inconsistent | `orderRoutes.js` calculates price at order creation. `server/utils/pricing.js` exists but is NOT used by `orderRoutes.js`. | No standalone `POST /api/quotes` endpoint. Client duplicates calculation logic. Discrepancies between tiered discount logic and flat shop pricing. |
| **Order State Machine** | Partial | States: `Pending -> Printing -> Ready -> PickedUp`, `Cancelled`. 4-digit pickup PIN verified at counter. | Missing granular states (`Draft`, `Payment_Pending`, `Paid`, `Accepted`, `Rejected`, `Refunded`). Cancellation rules are rudimentary. |
| **Queue Management** | Heuristic | `queueCalculator.js` calculates queue position, pages ahead, and `estimatedMinutes = totalPagesAhead / 15 + index`. | Linear heuristic, not printer-aware. No tracking of individual printer speeds, duplex speed differences, or multi-printer shops. |
| **Machine Learning (ECT)** | Missing | None. | No ML model, no Python/FastAPI service, no dataset, no training pipeline, no baseline evaluation. |
| **Payment Integration** | Manual Only | Generates dynamic UPI deep-link / QR code. User submits UTR. Shopkeeper marks Verified. | Not an automated payment gateway. No Razorpay webhook verification, no idempotency checks, no automated refund handling. |
| **Real-time Updates & Chat** | Functional | Socket.IO rooms for `order_${orderId}` and `shop_${shopId}`. Messages persisted in MongoDB. | No reconnection sync fallback. Chat history limited to 200 messages without pagination. |
| **Admin Oversight** | Missing | None. | No admin user model, no platform management endpoints, no dispute handling, no shop moderation. |
| **Automated Testing** | Missing | 0 tests. | No Jest, Supertest, or Vitest configuration. |

---

## 4. Critical Bugs, Gaps & Security Risks

### Risk 1: Insecure Document Serving & Local Fallback 404
In `server/utils/fileStorage.js`:
```javascript
export const getDocumentUrl = (order) => {
  if (order.filePublicId && hasCloudinary) {
    return cloudinary.url(order.filePublicId, { ... });
  }
  if (order.filePath) return `${process.env.PUBLIC_API_URL || ''}/${order.filePath.replace(/^\/+/, '')}`;
  return null;
};
```
- `index.js` does NOT serve `/uploads` via static middleware. As a result, in local development or environments without Cloudinary credentials, clicking the document preview link produces a **404 Not Found**.
- If `express.static('uploads')` were added, uploaded confidential files would be accessible to **anyone** with the URL without authentication.
- **Remediation:** Create an authenticated, role-verified streaming endpoint `GET /api/orders/:id/document` that verifies the caller is either the order owner or the authorized shopkeeper, and streams the file securely with appropriate `Content-Disposition` and security headers.

### Risk 2: Client-Supplied Untrusted Page Counts
In `server/routes/orderRoutes.js`:
```javascript
const { pages, copies, ... } = req.body;
const pageCount = Number(pages);
```
- The backend trusts the `pages` field submitted in `multipart/form-data` from the browser.
- A malicious user could upload a 500-page dissertation and submit `pages=1`, paying ₹3 instead of ₹1500.
- **Remediation:** Implement server-side document parsing (using `pdf-parse` for PDF files) to extract the authoritative page count directly from the uploaded buffer and reject mismatches or override the client value.

### Risk 3: Disconnected & Conflicting Pricing Logic
- `server/utils/pricing.js` defines volume discounts (e.g. >10 pages gets 20% off) and double-sided discounts (15% off).
- `server/routes/orderRoutes.js` completely ignores `pricing.js` and implements a different formula using flat coupon discounts and hardcoded binding costs.
- There is no `POST /api/quotes` endpoint for the frontend to obtain an authoritative quote prior to upload.
- **Remediation:** Unify pricing into an authoritative service, supporting paper sizes, double/single-sided adjustments, finishing, and coupons, and expose a dedicated quote endpoint.

### Risk 4: Sensitive Credentials in `.env.example`
- `server/.env.example` contains an active MongoDB connection string with credentials and an active Gmail app password.
- **Remediation:** Sanitize `.env.example` with standard dummy placeholders (`mongodb://...`, `your-secret-here`).

### Risk 5: Missing Machine Learning Component
- The platform promises intelligent completion time prediction, but only provides a single heuristic formula.
- **Remediation:** Design and implement a real completion-time prediction engine featuring feature extraction (pages, copies, color, duplex, queue ahead, printer count, printer speed), a baseline heuristic estimator, and a trained regression model with documented MAE evaluation and fallback safety.

### Risk 6: Lack of Automated Payment Gateway & Signature Validation
- Currently, users can enter any 12-digit string as a UTR. The vendor has to check their physical bank/UPI app.
- **Remediation:** Integrate Razorpay SDK (sandbox mode) with server-side order creation (`POST /api/payments/create-order`), cryptographic HMAC-SHA256 signature verification (`POST /api/payments/verify`), and webhook handling with idempotency. Preserve manual UPI as an alternative payment mode.

---

## 5. Audit Deliverables Plan

The comprehensive documentation suite will be established in:
- `docs/PROJECT_AUDIT.md` (this document)
- `docs/ARCHITECTURE.md` (detailed multi-tier architecture & data flows)
- `docs/IMPLEMENTATION_PLAN.md` (step-by-step phased execution roadmap)
- `docs/SECURITY_AND_PRIVACY.md` (threat model, document retention, zero-trust storage)
- `docs/ENVIRONMENT_SETUP.md` (reproducible local & production setup)
- `docs/ORDER_LIFECYCLE.md` (finite state machine, transition guards, actor policies)
- `docs/ECT_PREDICTION.md` (ML architecture, feature engineering, baseline vs model, API contract)

