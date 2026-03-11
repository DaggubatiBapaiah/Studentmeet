# 🚀 Full-Stack Freelance Project Platform

A fully working freelance lead-generation website with a Node.js/Express backend, MongoDB storage, and professional email notifications.

## ✨ Features
- **Modern Landing Page**: Dynamic Hero, Portfolio, and Testimonials.
- **Project Request Form**: Data is saved to MongoDB. Supports file uploads (PDF/Image).
- **Automated Emails**: Confirmation sent to client and notification sent to admin via Nodemailer.
- **Admin Dashboard**: Secure management of project requests with status tracking.
- **Premium Design**: Dark mode glassmorphism UI with mobile responsiveness.

## 🛠️ Setup Instructions

### Pre-requisites
- **Node.js** installed on your machine.
- **MongoDB** running locally or a MongoDB Atlas URI.
- **Gmail App Password** (if using Gmail for emails). [How to get one](https://support.google.com/accounts/answer/185833).

### Step 1: Install Dependencies
Open your terminal in the `backend/` directory:
```bash
cd backend
npm install
```

### Step 2: Configure Environment (.env)
Open `backend/.env` and update the following:
- `MONGODB_URI`: Your database connection string.
- `EMAIL_USER`: Your Gmail address.
- `EMAIL_PASS`: Your 16-character Gmail App Password.
- `ADMIN_EMAIL`: Where you want to receive notifications.

### Step 3: Start the Server
In the `backend/` directory:
```bash
node server.js
```

### Step 4: Access the Website
- **Frontend**: Open `frontend/index.html` in your browser.
- **Admin Login**: Go to `admin-login.html` (Default: admin / admin123).

---
*Built with ❤️ for professional freelancers.*
