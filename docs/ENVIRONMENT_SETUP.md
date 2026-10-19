# Environment Setup & Configuration Guide: Printania

---

## 1. Prerequisites

- **Node.js:** v20.x or higher (tested on Node v25).
- **npm:** v10.x or higher.
- **Python (Optional for ML service):** v3.10 or higher.
- **MongoDB:** MongoDB Atlas cluster or local MongoDB instance running on `mongodb://127.0.0.1:27017/printnear`.

---

## 2. Environment Variables

### 2.1 Backend (`server/.env`)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `PORT` | No | Port on which the Express server listens | `5001` |
| `NODE_ENV` | Yes | Runtime environment (`development`, `test`, `production`) | `development` |
| `MONGO_URI` | Yes | MongoDB connection URI | `mongodb://127.0.0.1:27017/printnear` |
| `JWT_SECRET` | Yes | Secret key for signing JSON Web Tokens | `your-secure-random-jwt-secret` |
| `CLIENT_URL` | Yes | Allowed frontend origin for CORS | `http://localhost:5173` |
| `PUBLIC_API_URL` | No | Base public URL of the backend API | `http://localhost:5001` |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud identifier (for persistent cloud storage) | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key | `your_api_key` |
| `CLOUDINARY_API_SECRET`| No | Cloudinary API secret | `your_api_secret` |
| `RAZORPAY_KEY_ID` | No | Razorpay API key ID for online payments | `rzp_test_placeholder` |
| `RAZORPAY_KEY_SECRET` | No | Razorpay Key Secret for signature verification | `your_razorpay_secret` |
| `RAZORPAY_WEBHOOK_SECRET` | No | Secret for verifying Razorpay webhook payloads | `your_webhook_secret` |
| `EMAIL_USER` | No | SMTP sender email | `support@printnear.com` |
| `EMAIL_PASS` | No | SMTP password / app password | `your_email_password` |

### 2.2 Frontend (`client/.env`)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | Yes | URL of the backend API | `http://localhost:5001` (or empty for Vite proxy) |
| `VITE_RAZORPAY_KEY_ID` | No | Public Razorpay key ID for checkout modal | `rzp_test_placeholder` |

---

## 3. Local Development Quickstart

### Step 1: Install Dependencies
```bash
# In repository root
cd server
npm install

cd ../client
npm install
```

### Step 2: Configure Environment Files
```bash
# Server configuration
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and JWT_SECRET

# Client configuration
cd ../client
cp .env.example .env
# Edit .env to set VITE_API_URL=http://localhost:5001
```

### Step 3: Seed Initial Data
To populate demo shops, customer accounts, and vendor accounts:
```bash
cd server
npm run seed
```

Default credentials seeded:
- **Customer:** `demo.customer@printnear.test` / `PrintNearDemo123!`
- **Vendor 1:** `demo.vendor@printnear.test` / `PrintNearDemo123!`
- **Vendor 2:** `demo.vendor2@printnear.test` / `PrintNearDemo123!`
- **Admin:** `admin@printnear.test` / `PrintNearAdmin123!`

### Step 4: Run Services
```bash
# Terminal 1: Backend API
cd server
npm run dev

# Terminal 2: Frontend Client
cd client
npm run dev
```

Visit the application at: **`http://localhost:5173`**.

---

## 4. Verification & Health Checks

Verify the backend service is operational:
```bash
curl http://localhost:5001/health
```
Expected response:
```json
{
  "status": "ok",
  "service": "printnear-api",
  "time": "2026-10-16T15:00:00.000Z"
}
```

Verify backend test suite:
```bash
cd server
npm test
```

Verify client production build:
```bash
cd client
npm run build
```

