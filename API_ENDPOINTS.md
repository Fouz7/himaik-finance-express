# API Endpoints Documentation

Dokumen ini menjelaskan seluruh endpoint pada backend `himaik-finance-express-backend`, cara pakai, request body, dan contoh response.

## Base URL

- Local: `http://localhost:3001/api`
- Port default: `3001` (bisa berubah via `process.env.PORT`)

## Authentication

Endpoint yang membutuhkan login wajib mengirim header:

```http
Authorization: Bearer <jwt_token>
```

Jika token tidak valid / tidak ada:

```json
{
  "message": "Access denied!"
}
```

atau

```json
{
  "message": "Invalid token."
}
```

---

## 1) Auth

### POST `/auth/login`
Login user dan mendapatkan JWT.

- Auth: `No`
- Content-Type: `application/json`

#### Request Body

```json
{
  "username": "admin",
  "password": "secret123"
}
```

#### Success Response (200)

```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin"
    },
    "token": "<jwt_token>"
  }
}
```

#### Error Responses

- 400

```json
{
  "message": "Username and password are required."
}
```

- 401

```json
{
  "message": "User Not Found"
}
```

atau

```json
{
  "message": "Password Incorrect"
}
```

- 500

```json
{
  "message": "Server error during login."
}
```

---

## 2) Incomes

### GET `/incomes?page=1&limit=10`
Ambil daftar income dengan pagination.

- Auth: `No`
- Query:
  - `page` (opsional, default `1`)
  - `limit` (opsional, hanya menerima `5` atau `10`, selain itu otomatis `10`)

#### Request Body
Tidak ada.

#### Success Response (200)

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": 11,
      "name": "Sponsor Event",
      "nominal": "500000",
      "transfer_date": "2026-03-16",
      "transactionId": 105,
      "createdBy": "admin",
      "createdAt": "2026-03-16T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

#### Error Response (500)

```json
{
  "message": "Server error while getting incomes."
}
```

### POST `/incomes`
Tambah income baru. Endpoint ini otomatis membuat transaksi income di tabel `transactions`.

- Auth: `Yes`
- Content-Type: `application/json`

#### Request Body

```json
{
  "name": "Sponsor Event",
  "nominal": 500000,
  "transfer_date": "2026-03-16"
}
```

#### Success Response (201)

```json
{
  "message": "Income added successfully.",
  "data": {
    "id": 11,
    "name": "Sponsor Event",
    "nominal": "500000",
    "transfer_date": "2026-03-16",
    "createdBy": "admin",
    "transactionId": 105,
    "createdAt": "2026-03-16T08:00:00.000Z"
  }
}
```

#### Error Responses

- 400

```json
{
  "message": "Missing required fields: name, nominal, transfer_date, createdBy."
}
```

- 500

```json
{
  "message": "Server error while adding income."
}
```

### PUT `/incomes/:id`
Update income dan update transaksi income terkait + rekalkulasi balance transaksi berikutnya.

- Auth: `Yes`
- Content-Type: `application/json`
- Path Param:
  - `id` (income id)

#### Request Body
Semua field opsional, minimal kirim 1 field:

```json
{
  "name": "Sponsor Event Revisi",
  "nominal": 650000,
  "transfer_date": "2026-03-17"
}
```

#### Success Response (200)

```json
{
  "message": "Income updated successfully.",
  "data": {
    "id": 11,
    "name": "Sponsor Event Revisi",
    "nominal": "650000",
    "transfer_date": "2026-03-17",
    "createdBy": "admin",
    "transactionId": 105,
    "createdAt": "2026-03-16T08:00:00.000Z"
  }
}
```

#### Error Responses

- 400

```json
{
  "message": "At least one field is required to update income."
}
```

atau

```json
{
  "message": "Nominal must be a valid positive number."
}
```

atau

```json
{
  "message": "Cannot update income without a linked transaction."
}
```

atau

```json
{
  "message": "Linked transaction is not an income transaction."
}
```

- 404

```json
{
  "message": "Income not found."
}
```

atau

```json
{
  "message": "Linked transaction not found."
}
```

- 500

```json
{
  "message": "Server error while updating income."
}
```

### DELETE `/incomes/:id`
Hapus income dan transaksi yang terhubung (`transactionId`) sekaligus, lalu rekalkulasi balance transaksi sesudahnya.

- Auth: `Yes`
- Path Param:
  - `id` (income id)

#### Request Body
Tidak ada.

#### Success Response (200)

```json
{
  "message": "Income and linked transaction deleted with recalculated balances successfully."
}
```

Jika data income ada tapi transaksi referensinya sudah tidak ada:

```json
{
  "message": "Income deleted successfully. Linked transaction was not found."
}
```

#### Error Responses

- 400

```json
{
  "message": "Cannot delete income without a linked transaction."
}
```

- 404

```json
{
  "message": "Income not found."
}
```

- 500

```json
{
  "message": "Server error while deleting income."
}
```

---

## 3) Transactions

### GET `/transactions?page=1&limit=10`
Ambil daftar semua transaksi (income + expense) dengan pagination.

- Auth: `No`
- Query:
  - `page` (opsional, default `1`)
  - `limit` (opsional, hanya menerima `5` atau `10`, selain itu otomatis `10`)

#### Request Body
Tidak ada.

#### Success Response (200)

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "transactionId": 201,
      "debit": "120000",
      "credit": "0",
      "balance": "780000",
      "notes": "Pembelian ATK + print",
      "createdBy": "admin",
      "createdAt": "2026-03-16T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

#### Error Response (500)

```json
{
  "message": "Server error while getting transactions."
}
```

### POST `/transactions`
Tambah transaksi pengeluaran (expense).

- Auth: `Yes`
- Content-Type: `application/json`

#### Request Body

```json
{
  "nominal": 100000,
  "notes": "Pembelian ATK"
}
```

#### Success Response (201)

```json
{
  "message": "Expense transaction added successfully.",
  "data": {
    "transactionId": 201,
    "debit": "100000",
    "credit": "0",
    "balance": "800000",
    "notes": "Pembelian ATK",
    "createdBy": "admin",
    "createdAt": "2026-03-16T10:00:00.000Z"
  }
}
```

#### Error Responses

- 400

```json
{
  "message": "Missing required fields: nominal, notes, createdBy."
}
```

atau

```json
{
  "message": "Insufficient balance. The expense exceeds the current balance."
}
```

- 500

```json
{
  "message": "Server error while adding expense."
}
```

### PUT `/transactions/:id`
Update transaksi berdasarkan `transactionId` + rekalkulasi balance transaksi sesudahnya.

Perilaku update:
- Jika transaksi adalah expense (`debit > 0`), update berlaku ke transaksi expense seperti sebelumnya.
- Jika transaksi adalah income (`credit > 0`), data income terkait di `incomedata` ikut ter-update (sinkron dua arah).

- Auth: `Yes`
- Content-Type: `application/json`
- Path Param:
  - `id` (transaction id)

#### Request Body
Semua field opsional, minimal kirim 1 field:

```json
{
  "nominal": 120000,
  "notes": "Pembelian ATK + print"
}
```

#### Success Response (200)

Untuk expense:

```json
{
  "message": "Transaction updated and balance recalculated successfully.",
  "data": {
    "transactionId": 201,
    "debit": "120000",
    "credit": "0",
    "balance": "780000",
    "notes": "Pembelian ATK + print",
    "createdBy": "admin",
    "createdAt": "2026-03-16T10:00:00.000Z"
  }
}
```

Untuk income (sekaligus sinkron ke `incomedata`):

```json
{
  "message": "Income transaction and linked income updated successfully.",
  "data": {
    "transactionId": 105,
    "debit": "0",
    "credit": "650000",
    "balance": "1250000",
    "notes": "Income: Sponsor Event Revisi",
    "createdBy": "admin",
    "createdAt": "2026-03-16T08:00:00.000Z"
  }
}
```

#### Error Responses

- 400

```json
{
  "message": "At least one field is required to update transaction."
}
```

atau

```json
{
  "message": "Nominal must be a valid positive number."
}
```

```json
{
  "message": "Insufficient balance. The updated expense exceeds the available balance at transaction time."
}
```

atau

```json
{
  "message": "Linked income not found for this transaction."
}
```

- 404

```json
{
  "message": "Transaction not found."
}
```

- 500

```json
{
  "message": "Server error while updating transaction."
}
```

### DELETE `/transactions/:id`
Hapus transaksi berdasarkan `transactionId`.

Perilaku baru:
- Jika transaksi adalah expense, hanya transaksi itu yang dihapus.
- Jika transaksi adalah income (`credit > 0`), data income terkait di `incomedata` juga ikut dihapus.
- Setelah penghapusan, balance transaksi setelahnya otomatis direkalkulasi.

- Auth: `Yes`
- Path Param:
  - `id` (transaction id)

#### Request Body
Tidak ada.

#### Success Response (200)

```json
{
  "message": "Transaction deleted and related data recalculated successfully."
}
```

#### Error Responses

- 404

```json
{
  "message": "Transaction not found."
}
```

- 500

```json
{
  "message": "Server error while deleting transaction."
}
```

---

## 4) Balance

### GET `/balance`
Ambil saldo terakhir.

- Auth: `No`

#### Request Body
Tidak ada.

#### Success Response (200)

```json
{
  "balance": 780000
}
```

#### Error Response (500)

```json
{
  "message": "Server error while fetching balance."
}
```

### GET `/balance/income`
Ambil total pemasukan (`SUM(credit)`).

- Auth: `No`

#### Request Body
Tidak ada.

#### Success Response (200)

```json
{
  "totalIncome": 2500000
}
```

#### Error Response (500)

```json
{
  "message": "Server error while fetching total income."
}
```

### GET `/balance/outcome`
Ambil total pengeluaran (`SUM(debit)`).

- Auth: `No`

#### Request Body
Tidak ada.

#### Success Response (200)

```json
{
  "totalOutcome": 1720000
}
```

#### Error Response (500)

```json
{
  "message": "Server error while fetching total outcome."
}
```

### POST `/balance/evidence`
Upload bukti saldo terbaru (hanya JPG/PNG, max 5MB).

- Auth: `Yes`
- Content-Type: `multipart/form-data`
- Form field:
  - `file` (required)

#### Request Body
Bentuk `form-data` (bukan JSON).

#### Success Response (201)

```json
{
  "url": "https://<vercel-blob-url>",
  "key": "balance-evidence/1742111111111-abc123.jpg"
}
```

#### Error Responses

- 400

```json
{
  "message": "No file uploaded or file is empty."
}
```

atau

```json
{
  "message": "Only JPG or PNG are allowed."
}
```

- 500

```json
{
  "message": "Server error while uploading evidence."
}
```

### GET `/balance/evidence/latest`
Ambil URL bukti saldo paling baru.

- Auth: `No`

#### Request Body
Tidak ada.

#### Success Response (200)
Jika ada file:

```json
{
  "url": "https://<vercel-blob-url>",
  "key": "balance-evidence/1742111111111-abc123.jpg"
}
```

Jika belum ada file:

```json
{
  "url": null
}
```

#### Error Response (500)

```json
{
  "message": "Server error while fetching latest evidence."
}
```

---

## Quick Testing (cURL)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"secret123\"}"

curl -X DELETE http://localhost:3001/api/transactions/105 \
  -H "Authorization: Bearer <jwt_token>"

curl -X DELETE http://localhost:3001/api/incomes/11 \
  -H "Authorization: Bearer <jwt_token>"
```
