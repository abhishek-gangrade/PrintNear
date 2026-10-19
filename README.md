# PrintNear

PrintNear is a hyper-local document printing platform built with React + Vite, Node.js + Express, MongoDB Atlas and Socket.IO.

## What was upgraded

The original prototype has been hardened for deployment and interview discussion:

- **Server-side pricing**: totals, binding charges and coupon discounts are calculated from shop pricing on the API. The browser can no longer submit an arbitrary trusted amount.
- **Role-based authorization**: customers can access only their own orders; shopkeepers can access only their own shop/orders.
- **Protected documents**: uploads are no longer exposed through a public `/uploads` directory. Cloudinary authenticated storage is supported, with a local fallback for development.
- **Real-time architecture**: authenticated Socket.IO connections, order rooms, shop rooms and persisted chat messages.
- **Payment workflow**: UPI intent/QR is a payment initiation mechanism; the vendor explicitly verifies the submitted UTR before printing.
- **Pickup security**: a one-time 4-digit PIN is verified by the shopkeeper before an order becomes `PickedUp`.
- **Order state machine**: `Pending -> Printing -> Ready -> PickedUp`, with cancellation from `Pending`/`Printing`.
- **Queue API**: calculates queue position, pages ahead and estimated pickup time.
- **Validation**: file type/size, numeric limits, enums, string lengths and shop pricing are validated on the API.
- **Production configuration**: Vercel SPA rewrite, Render service definition, environment templates and `/health` endpoint.
- **Privacy cleanup**: completed/picked-up documents can be automatically removed after the configured retention window.
- **No secrets in source control**: `.env` files and the prototype's uploaded/personal files are intentionally excluded.

## Architecture

```text
Vercel
  React + Vite + Tailwind
        |
        | HTTPS REST + WebSocket
        v
Render
  Express API + Socket.IO
        |
        +------ MongoDB Atlas
        |
        +------ Cloudinary (authenticated document storage)
```

## Local development

### 1. Backend

```bash
cd server
cp .env.example .env
npm ci
npm run dev
```

Required:
- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`

For production, Cloudinary credentials are required for persistent document storage. Local development can fall back to `server/uploads` when Cloudinary is not configured.

### 2. Frontend

```bash
cd client
cp .env.example .env
npm ci
npm run dev
```

Set:

```text
VITE_API_URL=http://localhost:5001
```

For Vercel:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

### 3. MongoDB Atlas

Create a database user, allow the Render service IP/network access as appropriate, and set the connection string as `MONGO_URI`.

### 4. Cloudinary

Create a Cloudinary account and set:

```text
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Documents are uploaded as authenticated raw assets under `printnear/orders`.

## Render deployment

The included `render.yaml` describes the API service.

Set these Render environment variables:

- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL=https://YOUR-VERCEL-DOMAIN.vercel.app`
- `PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Deploy the `server` directory as the Node service. Confirm:

```text
GET /health
```

returns:

```json
{ "status": "ok", "service": "printnear-api" }
```

## Vercel deployment

Deploy the `client` directory.

Set:

```text
VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com
```

The included `vercel.json` rewrites client-side routes to `index.html`.

## Important payment note

PrintNear currently implements **UPI deep-link + dynamic QR + UTR submission + merchant-side verification**. This is not the same as automatic bank/payment-gateway verification.

For a production payment integration, replace manual UTR verification with a provider such as Razorpay/PhonePe/PayU or another supported merchant gateway and verify webhooks server-side.

## Interview architecture story

### Why MERN?

MongoDB fits the flexible print-order configuration while Mongoose provides schema validation and indexes. Express exposes a REST API, React handles the responsive customer/vendor experience, and Node.js supports both REST and long-lived Socket.IO connections.

### How is security handled?

1. Passwords are hashed with bcrypt.
2. JWTs authenticate REST and WebSocket sessions.
3. Middleware enforces customer/vendor authorization.
4. Order ownership is checked on every sensitive operation.
5. File type and 10 MB size are validated before upload.
6. The API calculates the final price instead of trusting the frontend.
7. Documents are stored as authenticated Cloudinary assets and served only to authorized users.
8. Pickup requires a one-time PIN.
9. Basic API rate limiting and security headers are applied.

### How does real-time tracking work?

The client opens an authenticated Socket.IO connection. Customers and vendors join order-specific rooms. Vendor status changes are persisted in MongoDB and emitted to the corresponding order room. Vendor dashboards also join their shop room to receive new orders instantly.

### Why server-side pricing?

A browser is an untrusted client. If the frontend sent `totalAmount=1`, a vulnerable API might accept it. PrintNear instead receives the configuration, looks up the selected shop's tariff, calculates pages × copies × rate + finishing, applies the coupon policy and stores the authoritative total.

### How does queue estimation work?

Orders in `Pending` or `Printing` are sorted by creation time. For an order, the API sums pages × copies for jobs ahead of it and estimates processing time using a configurable throughput assumption.

### What would I improve next?

- Payment gateway + signed webhook verification
- Redis adapter for Socket.IO when horizontally scaling multiple Render instances
- Background job queue (BullMQ) for document processing/notifications
- Automated PDF page-count extraction
- S3/R2/Cloudinary lifecycle policies
- Observability with structured logs, metrics and error tracking
- Automated tests and CI/CD
- Vendor ratings and service availability/ETA
- Admin moderation and dispute handling

## Demo flow for interviews

1. Customer registers.
2. Customer sees nearby shops on Leaflet.
3. Customer chooses B&W/color, copies, orientation, duplex and binding.
4. Server calculates the final price.
5. Customer pays through UPI intent/QR and submits the UTR.
6. Vendor receives the order live through Socket.IO.
7. Vendor verifies payment and changes `Pending -> Printing -> Ready`.
8. Customer sees status and queue estimate.
9. Customer shows the 4-digit PIN at the counter.
10. Vendor verifies the PIN; order becomes `PickedUp`.
11. Retention cleanup removes the document after the privacy window.

## Known design boundary

The current Leaflet map displays **registered PrintNear shops**, not a live directory of every physical xerox shop in OpenStreetMap. This avoids pretending that an external place exists as a PrintNear vendor until that vendor actually registers.

The project is intentionally designed so that the strongest interview claims are backed by actual implementation rather than UI-only mock features.
