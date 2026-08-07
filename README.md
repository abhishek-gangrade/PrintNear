# 🖨️ PrintNear — Multi-Vendor Hyperlocal Printing Platform

PrintNear is a full-stack MERN (MongoDB, Express, React, Node.js) web application that connects students and professionals with local print shop owners for fast, on-demand document printing, dynamic UPI pre-payments, and live order tracking.

---

## ✨ Key Features

### 🔵 Customer Panel
* **Interactive Map Discovery:** Locate nearby print shops in real time using OpenStreetMap and Leaflet geolocation.
* **Dynamic UPI Pre-Payment:** Pay instantly via auto-generated UPI QR codes (GPay, PhonePe, Paytm).
* **Automated Discounts:** Volume pricing calculations and single/double-sided print options.
* **Live Order Tracking & Chat:** Real-time order status updates via Socket.IO and direct chat with shopkeepers.
* **Order History:** Access past orders, pickup PINs, and digital receipts.

### 🟢 Shopkeeper (Vendor) Panel
* **Real-Time Order Queue:** Receive incoming print orders instantly with audio alert chimes.
* **Auto Revenue & Earnings Dashboard:** Metrics for Today's Revenue, Total Earnings, AOV, and Pages Printed.
* **Dynamic Discount Manager:** Configure custom volume discount rules (e.g., 80 paise/page for >10 pages).
* **Privacy Auto-Delete & Cleanup:** Automated midnight background job via `node-cron` to permanently purge expired documents from disk.
* **Payment Proof Verification:** Inspect customer UPI payment screenshots directly on the dashboard.

---

## 🛠️ Tech Stack

* **Frontend:** React, Tailwind CSS, React-Leaflet, Socket.IO Client, QRCode React
* **Backend:** Node.js, Express.js, MongoDB, Mongoose, Socket.IO, Multer, Node-Cron, BcryptJS, JWT

---

## 🚀 Local Setup & Installation

### 1. Clone the Repository
```bash
git clone [https://github.com/abhishek-gangrade/PrintNear.git](https://github.com/abhishek-gangrade/PrintNear.git)
cd PrintNear
