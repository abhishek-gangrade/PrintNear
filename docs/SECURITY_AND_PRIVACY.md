# Security, Privacy & Document Lifecycle Architecture

---

## 1. Threat Model & Privacy Principles

In a cloud-printing marketplace, users upload confidential documents: university research theses, government identity proofs (Aadhaar, passports), financial statements, legal contracts, and medical records. 

### 1.1 Threat Vectors & Mitigations

| Threat Vector | Potential Impact | Architecture Mitigation |
| :--- | :--- | :--- |
| **Public Storage Enumeration** | Attackers guess sequential filenames or public URLs to read other users' documents. | **Zero public static serving.** Files are stored in authenticated Cloudinary raw storage or unexposed local disk. Access requires authenticated server-mediated streaming (`/api/orders/:id/document`). |
| **Insecure Direct Object Reference (IDOR)** | Authenticated user supplies another user's `orderId` or `documentId` to download files. | Strict database-level ownership verification: only the ordering customer (`order.userId == req.user.id`) or the authorized shopkeeper (`order.shopId == shop._id && shop.ownerId == req.user.id`) can access the file. |
| **Untrusted Client Parameter Tampering** | User manipulates page counts or prices in browser to print at negligible cost. | **Authoritative Server Calculation.** PDF files are parsed server-side to extract the binary page count. Pricing is computed server-side using shop tariff configurations. |
| **Indefinite Data Retention** | Dormant files remain on disk or object storage indefinitely, creating liability. | **Automated Deletion Engine.** Explicit retention deadlines (`documentRetentionExpiresAt`) are enforced by background workers with physical unlinking, retries, and audit logging. |
| **Payment Signature Spoofing** | Client sends fake success response or invalid UTR to obtain free printing. | Cryptographic HMAC-SHA256 signature verification for payment gateways; merchant verification with pickup PIN verification for manual flows. |
| **Malicious File Upload** | Malicious executable masked as PDF attempts remote code execution. | Strict MIME-type filtering, file extension checks, file size boundaries (10MB limit), and safe filename sanitization. |

---

## 2. Document Lifecycle Management

The complete document lifecycle is enforced by the backend:

```text
[1. Upload] -> Buffer in memory (max 10MB)
    |
[2. Binary Validation] -> MIME verification + PDF parser extracts true page count
    |
[3. Private Storage] -> Authenticated Cloudinary raw asset or sandboxed local disk
    |
[4. Authorized Access] -> Accessible ONLY to order customer & assigned vendor
    |
[5. Printing & Pickup] -> Counter pickup verified via one-time PIN (order marked 'PickedUp')
    |
[6. Retention Deadline] -> documentRetentionExpiresAt set (default: 2 hrs post-pickup / 24 hrs post-cancellation)
    |
[7. Automated Cleanup] -> Background worker physically deletes file + logs deletion audit
    |
[8. Verified Destruction] -> Storage pointers wiped (order.filePath = '', order.filePublicId = '')
```

### 2.1 Retention Policies
- **Completed Orders (`PickedUp`):** Retained for 2 hours post-pickup to allow reprint if physical output was defective, after which the stored file is permanently unlinked.
- **Cancelled / Rejected Orders:** Retained for 24 hours to support dispute resolution, then deleted.
- **Abandoned Drafts / Uploads:** Retained for 4 hours then scrubbed if no order was confirmed.

### 2.2 Storage Deletion Verification
A database record deletion does NOT equal physical file destruction. The cleanup worker executes:
1. Object storage destroy API call (`cloudinary.uploader.destroy(publicId, { invalidate: true })`).
2. Local filesystem verification (`fs.existsSync(path)` followed by `fs.unlinkSync(path)`).
3. If deletion fails, records error in `retention_logs` and increments `deletionRetryCount` for subsequent worker passes.

---

## 3. Authentication & RBAC Model

### Roles:
- **`customer`**: Can search shops, generate quotes, upload documents, place orders, chat with assigned shop, view pickup PIN, and cancel orders prior to printing.
- **`shopkeeper`**: Can manage shop details, printer inventory, update order lifecycle, verify payments, read customer order files, verify pickup PINs, and update queue states.
- **`admin`**: Platform administrator with read/write access to dispute resolution, shop approval/suspension, retention audit statistics, and platform analytics.

### Token Strategy:
- JWT signed with HMAC-SHA256 (`JWT_SECRET`).
- Payload contains `{ id, role, name }`.
- Session expiration: 7 days.
- In-memory route rate limiting protects sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/orders`).

