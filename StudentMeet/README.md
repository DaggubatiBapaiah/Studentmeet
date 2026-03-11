# 🎓 StudentMeet - Full Stack Project Platform

A premium full-stack solution for students to request projects, with automated email notifications and a secure admin dashboard.

## 🚀 Features
- **Modern UI**: Clean, mobile-friendly design with a specialized StudentMeet theme.
- **Request Form**: Detailed project submission with file uploads.
- **Automated Communication**: 
  - Client receives a confirmation email.
  - Admin (daggubatibapaiahchowdary@gmail.com) receives a notification email.
- **Secure Admin Panel**: Manage requests, track progress, and communicate via WhatsApp.
- **Production Ready**: Structured for easy deployment.

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)
- **Communication**: Nodemailer (Gmail integration)

## 📦 Setup Instructions

### 1. Prerequisite
- Node.js installed.
- MongoDB running locally or on Atlas.

### 2. Configuration (`backend/.env`)
Update the following details:
- `EMAIL_USER`: Your Gmail address.
- `EMAIL_PASS`: Your Gmail App Password.
- `MONGODB_URI`: Your MongoDB connection string.

### 3. Installation
Open your terminal in the `backend/` folder:
```bash
npm install
```

### 4. Run the Server
```bash
node server.js
```

### 5. Open Project
- **User Side**: Open `frontend/index.html`.
- **Admin Login**: Open `frontend/admin-login.html` (Default: admin / admin123).

---
*Built for StudentMeet by the Advanced Agentic Coding team.*
