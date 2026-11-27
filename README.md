# Store Automation System

**Institution:** ABESEC Ghaziabad  
**Project Type:** Full Stack Development (Academic Year 2026)  
**Developed & Maintained By:** Chirag Kumar, Dev Malik (CSE-15) — Full Stack Development Team

---

## Project Description

**Store Automation** is a full-stack retail store management web application designed for academic demonstration and real-world store operations. It provides role-based access control (Admin and Student), live database-driven KPI dashboards, product and category management, inventory stock tracking with automatic alerts, billing and invoice generation with atomic stock deduction, customer purchase history, supplier management, user administration, and analytical reporting.

---

## Key Features

- **Role-Based Authentication & Security**
  - JWT authentication stored in `httpOnly` cookies with `bcryptjs` password hashing.
  - Separate **Admin** and **Student** roles enforced at both API middleware and UI route levels.
  - Password visibility toggle, form validation, account activation/deactivation, and self-service password updates.
- **Database-Driven Dashboard**
  - 6 live KPI cards: Total Products, Total Inventory, Total Sales, Total Revenue, Low Stock Products, and Total Customers.
  - 14-day sales overview chart, 6-month revenue chart, category distribution chart, recent transactions, low-stock alerts, and recent inventory movements.
- **Inventory & Product Management**
  - Full CRUD for products and categories with server-side search, filtering, sorting, and pagination.
  - Stock availability indicators (`In Stock`, `Low Stock`, `Out of Stock`), manual stock adjustments (`IN` / `OUT` / `ADJUSTMENT`), and complete `stock_movements` audit trail.
- **Sales & Billing Management**
  - POS-style billing workflow with customer selection, flat/percentage discounts, optional tax calculation, payment method tracking, and idempotency protection against duplicate submissions.
  - Transactional PostgreSQL row locking (`SELECT ... FOR UPDATE`) ensures stock never goes negative and automatically deducts inventory upon sale completion.
  - Unique sequential invoice numbers (`INV-YYYY-XXXX`), invoice search, detail modal, and clean print layout.
- **Customer & Supplier Management**
  - Customer directory with registration dates and individual purchase history modal.
  - Supplier directory showing contact details and dynamically linked supplied products.
- **Reports & Analytics**
  - Daily, weekly, and monthly sales charts, category-wise sales breakdown, best-selling products, low-stock report, and inventory valuation (cost vs. retail value) with date filters and CSV export.
- **User Management & Store Settings (Admin)**
  - Create/edit accounts, assign roles, activate/deactivate users, reset passwords, and configure store details and student sales permissions.

---

## Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, React Router v7, Lucide React, Recharts
- **Backend:** Node.js, Express.js, JWT (`jsonwebtoken`), `bcryptjs`, Helmet, CORS, Cookie Parser
- **Database:** PostgreSQL (`pg` driver with relational schema, foreign keys, check constraints, and indexes)

---

## Project Structure

```text
store automation/
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       ├── controllers/
│       ├── db/
│       │   ├── init.js
│       │   ├── schema.sql
│       │   └── seed.js
│       ├── middleware/
│       ├── routes/
│       └── utils/
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18+ recommended; tested on v24.16.0)
- PostgreSQL (tested on PostgreSQL 18)

### 1. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env` and update your PostgreSQL credentials and JWT secret:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=store_automation
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=1d

SHOW_DEMO_CREDENTIALS=true
DEMO_ADMIN_USERNAME=admin
DEMO_ADMIN_PASSWORD=Admin@123
DEMO_STUDENT_USERNAME=student
DEMO_STUDENT_PASSWORD=Student@123
```

### 2. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Initialize & Seed Database
The backend automatically initializes and seeds the database on startup if empty. You can also run the scripts manually:

```bash
cd backend
npm run db:init
npm run db:seed
```

To reset and re-seed all tables from scratch:

```bash
cd backend
node src/db/seed.js --force
```

---

## Running the Application

Start the **Backend** server (port `5000`):

```bash
cd backend
npm run dev
```

Start the **Frontend** development server (port `5173`):

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Demo Login Credentials

Initialized via the backend seed script (`backend/src/db/seed.js`):

| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@123` |
| **Student** | `student` | `Student@123` |

You can change passwords anytime from **Settings → Change Password** or via **Users** (Admin only).
