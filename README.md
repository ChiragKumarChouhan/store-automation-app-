# 🏪 Store Automation System

### A Full Stack Development Project | ABESEC Ghaziabad

**Store Automation** is a web-based retail store management system designed to simplify and automate everyday store operations. It provides a centralized platform to manage inventory, products, sales, customers, suppliers, and business reports through an intuitive dashboard.

The project aims to demonstrate practical Full Stack Development concepts through a functional, database-driven application with role-based authentication.

---

## 📌 Project Overview

Store Automation helps store administrators manage retail operations efficiently by reducing manual work, maintaining accurate inventory records, tracking sales, and generating useful business insights.

The system provides two user roles:

- **Admin:** Complete access to store management and administrative features.
- **Student:** Restricted access to operational features for demonstration purposes.

## ✨ Key Features

### 1. Dashboard
- Overview of total products and inventory.
- Total sales and revenue statistics.
- Low-stock alerts.
- Sales analytics and visual charts.
- Recent transactions.

### 2. Inventory Management
- Add, update, and delete inventory records.
- Monitor available stock.
- Identify low-stock and out-of-stock products.
- Search, filter, and sort inventory.
- Automatic stock deduction after sales.

### 3. Product Management
- Manage product information.
- Maintain product categories.
- Track purchase and selling prices.
- Monitor product availability.

### 4. Sales & Billing
- Create sales transactions.
- Calculate product totals and discounts.
- Generate invoices.
- Maintain sales history.
- Automatically update inventory after successful transactions.

### 5. Customer Management
- Register and manage customers.
- Update customer information.
- View customer purchase history.

### 6. Supplier Management
- Maintain supplier information.
- Manage supplier contact details.
- Track supplied products.

### 7. Reports & Analytics
- Daily, weekly, and monthly sales reports.
- Revenue analysis.
- Best-selling products.
- Inventory valuation.
- Low-stock reports.

### 8. Authentication & Authorization
- Secure login system.
- Admin and Student roles.
- Role-based access control.
- Protected application routes.
- Password hashing and secure authentication.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| Vite | Development and build tool |
| Tailwind CSS | UI styling |
| React Router | Client-side navigation |
| Lucide React | Icons |
| Recharts | Data visualization |
| Node.js | Backend runtime |
| Express.js | REST API development |
| PostgreSQL | Relational database |
| JavaScript | Application programming |

---

## 🔐 Demo Login Credentials

Use the following credentials to access the application.

### Admin Account

| Field | Credentials |
|---|---|
| Username | `admin` |
| Password | `Admin@123` |
| Role | Administrator |

### Student Account

| Field | Credentials |
|---|---|
| Username | `student` |
| Password | `Student@123` |
| Role | Student |

**Note:** These are demonstration credentials. Change the passwords before deploying the application publicly.

---

## 📂 Project Structure

The project follows a modular full-stack architecture.

```text
Store-Automation/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── server.js
│   └── package.json
│
├── database/
│   └── schema.sql
│
└── README.md
```

*Note: This is the recommended structure; adjust it to match the actual repository.*

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

```bash
cd Store-Automation
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/store_automation
JWT_SECRET=your_secure_secret_key
```

Configure the database credentials according to your PostgreSQL setup.

### 3. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE store_automation;
```

Run the database schema or migrations provided in the project.

Initialize demo accounts using the backend seed script, if configured.

### 4. Start Backend Server

```bash
npm run dev
```

Backend API:

```text
http://localhost:5000
```

### 5. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Frontend application:

```text
http://localhost:5173
```

---

## 🔄 Application Workflow

1. User opens the Store Automation website.
2. User logs in using Admin or Student credentials.
3. The system verifies credentials and assigned permissions.
4. User accesses the appropriate dashboard.
5. Admin manages products, inventory, customers, and suppliers.
6. Sales transactions are recorded in the database.
7. Inventory is automatically updated after successful sales.
8. Dashboard statistics and reports reflect updated records.

---

## 🗄️ Database Modules

The application uses PostgreSQL for relational data management.

Major database entities include:

- Users
- Products
- Categories
- Inventory
- Sales
- Sale Items
- Customers
- Suppliers
- Stock Movements

Primary keys, foreign keys, and relational constraints help maintain data consistency.

---

## 🎯 Project Objectives

- Develop a practical Full Stack Web Application.
- Automate essential retail store operations.
- Implement database connectivity using PostgreSQL.
- Understand REST API development.
- Implement authentication and role-based authorization.
- Develop responsive and reusable UI components.
- Apply CRUD operations in a real-world application.
- Improve inventory tracking and sales management.

---

## 👨‍💻 Development Team

**Full Stack Development Team**

| Role | Name |
|---|---|
| Team Leader | Chirag Kumar |
| Team Member | Dev Malik |

**Institution:** ABES Engineering College (ABESEC), Ghaziabad

**Department:** [Add Branch and Section]

---

## 🚀 Future Enhancements

- Barcode and QR code scanning.
- Advanced demand forecasting.
- Automated purchase order generation.
- Email notifications for low inventory.
- PDF invoice generation.
- Advanced business intelligence.
- Cloud deployment and backup.

---

## 📜 License

This project has been developed for academic purposes as part of the Full Stack Development curriculum at ABESEC Ghaziabad.

---

<p align="center">
  **Store Automation System**
  <br/>
  Developed & Maintained By: Chirag Kumar and Dev Malik
  <br/>
  Full Stack Development Team
  <br/><br/>
  © 2026 ABESEC Ghaziabad. All Rights Reserved.
</p>
