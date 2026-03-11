# 🚀 Freelance Project Lead Generator

A modern, mobile-responsive website where clients can request projects and only you (the admin) can manage them.

## ✨ Features
- **Modern Hero Page**: Catchy title and description.
- **Glassmorphism UI**: Premium looks with dark mode support.
- **Project Request Form**: Data is saved directly to Firebase Firestore.
- **Admin Dashboard**: Real-time project tracking with:
  - Client details (Name, Email, WhatsApp, Budget, Deadline).
  - Quick WhatsApp chat button.
  - "Mark as Completed" and "Delete" actions.
- **Full Security**: Only logged-in admins can access the dashboard.

## 🛠️ Setup Instructions

### 1. Firebase Project Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project called "DevRequests".
3. Add a **Web App** to your project.
4. Copy your **Firebase Configuration** (apiKey, authDomain, etc.).
5. Open `firebase-config.js` in this project and paste your credentials.

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication** -> **Sign-in method**.
2. Enable **Email/Password**.
3. Create your admin account by clicking "Add user". This will be your login.

### 3. Set Up Firestore Database
1. Go to **Firestore Database** and create a database.
2. Start in **test mode** (or use the rules below for better security).
3. Create a collection named `projects`.

#### 🔥 Recommended Firestore Security Rules
Copy and paste this into the **Rules** tab of your Firestore Database:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to submit a request
    match /projects/{project} {
      allow create: if true;
      // ONLY the admin (logged-in user) can read, update, or delete
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

### 4. Deploying to Netlify
1. Log in to your [Netlify account](https://www.netlify.com/).
2. Drag and drop the folder containing these files into the Netlify "Sites" area.
3. Your site is now live! ✨

---
*Built with ❤️ for student freelancers.*
