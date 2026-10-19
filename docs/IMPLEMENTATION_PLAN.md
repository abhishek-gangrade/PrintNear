# Phased Implementation Plan: Printania Platform

---

## Phase 1: Audit, Architecture & Baseline Stabilization (Completed)
- [x] Comprehensive code audit of frontend, backend, models, routes, utils, and dependencies.
- [x] Identification of security vulnerabilities, missing endpoints, and architectural gaps.
- [x] Documentation deliverables: `docs/PROJECT_AUDIT.md`, `docs/ARCHITECTURE.md`.
- [x] Sanitize `.env.example` to remove any committed credentials.

---

## Phase 2: Foundation, Security & Testing Infrastructure
**Goal:** Establish enterprise-grade configuration, RBAC, input validation, and automated testing harness.
- **Tasks:**
  1. Expand user roles: add `admin` role to `User` schema and create administrative authorization guards (`allowRoles('admin')`).
  2. Sanitize environment templates and add runtime configuration validator in `server/index.js` to ensure required variables exist before boot.
  3. Implement security headers, strict CORS, and route-specific rate limiters (auth, upload, payment).
  4. Setup backend test harness using Jest and Supertest.
  5. Add baseline tests for Auth (registration, login, invalid credentials) and Role guards.
- **Acceptance Criteria:**
  - Automated test runner executes and passes all auth and security tests.
  - Server halts with clear message if critical env vars are malformed or missing.

---

## Phase 3: Shop Discovery & Multi-Factor Smart Recommendation
**Goal:** Transform the shop listing from a simple distance filter into an intelligent multi-factor recommendation engine.
- **Tasks:**
  1. Enhance `Shop` model to support:
     - Printer inventory (printer name, type, speed in ppm, color support, duplex support, status).
     - Operating hours schedule (open/close times).
     - Extended pricing (paper sizes, duplex discount, spiral/staple finishing fees).
  2. Create Authoritative Quote Endpoint `POST /api/quotes`:
     - Calculates subtotal, binding fees, volume discount, duplex factor, coupon savings, and tax.
     - Persists temporary quote token for tamper-proof checkout.
  3. Implement Multi-Factor Recommendation Service `GET /api/shops/recommend`:
     - Inputs: User coordinates, print configuration (pages, copies, color, duplex).
     - Calculates: Distance, specific quote price, queue length, and estimated completion time.
     - Composite Score:
       $$\text{Score} = w_D \cdot S_{\text{dist}} + w_P \cdot S_{\text{price}} + w_Q \cdot S_{\text{queue}} + w_T \cdot S_{\text{time}}$$
     - Returns ranked list with sorting options (`best_match`, `nearest`, `lowest_price`, `fastest`) and explainability tags.
  4. Update Frontend `ShopList.jsx` to render recommendation scores, sort selectors, and detailed factor badges.
- **Acceptance Criteria:**
  - Users can compare shops by price, distance, and completion time for their specific print configuration.
  - Recommendation factors are visibly explained.

---

## Phase 4: Order Lifecycle, Finite State Machine & Queue Management
**Goal:** Enforce rigorous order state transitions, ownership checks, and queue prioritization.
- **Tasks:**
  1. Implement complete Order Finite State Machine:
     - Valid transitions: `Draft -> Quoted -> Payment_Pending -> Paid -> Accepted -> Queued -> Printing -> Ready -> PickedUp`.
     - Alternate outcomes: `Rejected`, `Cancelled`, `Refund_Pending`, `Refunded`.
  2. Implement transition validation middleware and event history audit logging on the `Order` model.
  3. Refactor queue tracking to accurately reflect printer concurrency and active job durations.
  4. Add counter pickup PIN verification and shop acceptance/rejection workflows.
  5. Update frontend `CustomerOrders.jsx` and `ShopDashboard.jsx` to display current lifecycle state and available actions.
- **Acceptance Criteria:**
  - Invalid state transitions (e.g. `PickedUp` -> `Printing`) are rejected by the API with HTTP 400.
  - Shopkeepers can accept or reject incoming orders; customers can cancel before printing starts.

---

## Phase 5: Privacy-Aware Document Lifecycle & Server-Side Validation
**Goal:** Deliver zero-trust document security with server-side validation and automated object deletion.
- **Tasks:**
  1. Server-side PDF Page Counting:
     - Integrate PDF parser (`pdf-parse`) in upload processing.
     - Automatically extract page count from buffer, compare against client claim, and set authoritative count.
  2. Authorized Document Access Endpoint:
     - Create `GET /api/orders/:id/document`.
     - Enforce authorization: only order customer or assigned shopkeeper can access.
     - Stream file directly (local fallback) or issue short-lived (60-second) signed Cloudinary URL.
     - Return HTTP 403 / 404 for unauthorized or expired orders.
  3. Document Retention Policy & Cleanup Worker:
     - Add retention fields to `Order`: `documentRetentionExpiresAt`, `documentDeletedAt`, `deletionStatus`.
     - Set retention window (e.g. 2 hours post-pickup or 24 hours post-cancellation).
     - Enhanced cleanup job with retry counter, logging to `retention_logs`, and physical file deletion verification.
  4. Prevent public static access to the `uploads/` directory.
- **Acceptance Criteria:**
  - Documents cannot be accessed without valid JWT and order ownership.
  - Uploading a PDF with falsified page count is automatically corrected to the actual binary page count.
  - Expired order documents are physically deleted from storage with audit trail entries.

---

## Phase 6: Payment Integration (Razorpay Gateway & Verified Manual UPI)
**Goal:** Provide automated payment verification with Razorpay sandbox and retain verified manual UPI.
- **Tasks:**
  1. Create Payment Service & Controller:
     - `POST /api/payments/create-order`: Generates Razorpay Order ID for authoritative quote amount.
     - `POST /api/payments/verify`: Validates HMAC-SHA256 signature using `crypto`.
     - `POST /api/payments/webhook`: Handles asynchronous payment events with idempotency keys.
  2. Maintain verified manual UPI flow as fallback with UTR format validation and shopkeeper verification.
  3. Implement refund initiation workflow for rejected or cancelled paid orders.
  4. Integrate payment modal in frontend `OrderForm.jsx`.
- **Acceptance Criteria:**
  - Tampered payment signatures are rejected.
  - Successful payment verification automatically transitions order to `Paid` / `Accepted`.

---

## Phase 7: Real-Time Updates & Order-Scoped Chat
**Goal:** Harden Socket.IO real-time event pipeline and live messaging.
- **Tasks:**
  1. Authenticated socket handshake with token verification.
  2. Order room (`order_${id}`) and Shop room (`shop_${id}`) authorization enforcement.
  3. Real-time event propagation: status updates, queue position shifts, payment confirmation, and new messages.
  4. Reconnection handler: Client fetches authoritative state on socket reconnect to prevent dropped event desync.
- **Acceptance Criteria:**
  - Status updates made on vendor dashboard immediately update the customer tracking screen without browser refresh.
  - Socket unauthorized attempts are disconnected.

---

## Phase 8: Machine Learning ECT (Estimated Completion Time) Prediction Engine
**Goal:** Deliver a real prediction service comparing baseline estimation with trained regression models.
- **Tasks:**
  1. Create ECT Prediction Module (`server/utils/ectPredictor.js` & optional Python service `ml/`):
     - Feature schema: `page_count`, `copies`, `color_mode`, `duplex`, `queue_pages_ahead`, `active_jobs_ahead`, `available_printers`, `avg_ppm`.
     - Baseline Estimator: Analytical hardware throughput model based on shop printer PPM ratings and setup overhead.
     - Trained Regression Model: Polynomial / Random Forest regression model trained on printing duration datasets.
     - Hybrid Predictor: Uses ML model with automatic fallback to baseline if input features are out of bounds or ML service times out.
  2. Integrate predictor into Quote and Queue calculation APIs.
  3. Store prediction metadata (`predictedMinutes`, `algorithmVersion`, `actualMinutesTaken`) in `Order` for future continuous training.
  4. Document training data, features, MAE performance, and API schema in `docs/ECT_PREDICTION.md`.
- **Acceptance Criteria:**
  - API returns validated completion time estimates with metadata (`baseline` or `model_v1`).
  - Prediction endpoint responds within 50ms and degrades gracefully on missing parameters.

---

## Phase 9: Admin Portal, Production Hardening & Full Test Suite
**Goal:** Implement administrative capabilities, health monitoring, and comprehensive verification.
- **Tasks:**
  1. Implement Admin API routes (`/api/admin/overview`, `/api/admin/shops`, `/api/admin/users`, `/api/admin/disputes`, `/api/admin/retention-stats`).
  2. Admin UI component / view to inspect system health, verify shops, and review document retention status.
  3. Run comprehensive test suite across Auth, Orders, Quotes, Payments, Retention, and Recommendations.
  4. Verify production frontend build (`npm run build`).
  5. Final documentation review and validation.
- **Acceptance Criteria:**
  - Test suite passes with >80% coverage on critical paths.
  - Frontend production build succeeds cleanly.
  - End-to-end user journey works smoothly from discovery to counter pickup.

