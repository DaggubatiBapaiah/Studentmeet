require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const mongoose = require('mongoose');

// Task 7: MongoDB Connection (Non-blocking setup)
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log("✅ MongoDB Connected Successfully"))
        .catch(err => console.error("❌ MongoDB Connection Error:", err));
}

const RequestModel = require('./models/Request');

const app = express();
const PORT = process.env.PORT || 5000;

/* ===============================
   1. LOCAL DATABASE SETUP
================================ */

const DB_FILE = path.join(__dirname, 'database.json');
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const getRequests = () => JSON.parse(fs.readFileSync(DB_FILE));

const saveRequestToLocal = (newReq) => {
    try {
        const requests = getRequests();
        requests.unshift(newReq);
        fs.writeFileSync(DB_FILE, JSON.stringify(requests, null, 2));
        console.log(`💾 Project request saved: ${newReq.projectTitle} (ID: ${newReq._id})`);
    } catch (error) {
        console.error("❌ Error saving request to local DB:", error);
    }
};

/* ===============================
   2. MIDDLEWARE & LOGGING
================================ */

// CORS Configuration
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger (Production Monitoring)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] 📥 ${req.method} request received: ${req.url}`);
    next();
});

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend')));

/* ===============================
   3. FILE UPLOAD (MULTER)
================================ */

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + "-" + unique + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

/* ===============================
   4. EMAIL SETUP (GMAIL SMTP)
================================ */



const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});
/* Confirm email server connection */
transporter.verify(function (error, success) {
    if (error) {
        console.error("SMTP error:", error);
    } else {
        console.log("SMTP server ready to send emails");
    }
});

/* ===============================
   5. ADMIN AUTH MIDDLEWARE
================================ */

const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error();

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: "Authentication required"
        });
    }
};

/* ===============================
   6. SUBMIT PROJECT REQUEST
================================ */

app.post('/api/requests', upload.single('file'), async (req, res) => {
    try {
        const {
            name,
            email,
            whatsapp,
            projectTitle,
            projectCategory,
            projectDescription,
            budget,
            deadline
        } = req.body;

        const requestData = {
            name,
            email,
            whatsapp,
            projectTitle,
            projectCategory,
            projectDescription,
            budget,
            deadline,
            fileName: req.file ? req.file.filename : null,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
            status: "pending",
            createdAt: new Date()
        };

        // 1. Save to Database (Non-blocking)
        // Check if MongoDB is used, otherwise fall back to local JSON
        if (mongoose.connection.readyState === 1) {
            new RequestModel(requestData).save()
                .then(doc => console.log(`💾 Saved to MongoDB: ${doc._id}`))
                .catch(err => console.error("❌ MongoDB Save Error:", err));
        } else {
            saveRequestToLocal({ _id: Date.now().toString(), ...requestData });
        }

        // 2. Respond immediately to the client (Saves < 100ms)
        // This PREVENTS the "Request timed out" error on Render.
        res.json({
            success: true,
            message: "Project request submitted successfully!"
        });

        // 3. Process emails in the background (Non-blocking)
        // Do NOT 'await' this because SMTP delivery can take 2-5 seconds.
        sendEmails(requestData).catch(err => {
            console.error("🔥 Background Email Error:", err);
        });

    } catch (error) {
        console.error("❌ API Request Processing Error:", error);

        // Ensure we send a response even if something fails early
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Internal server error. Please try again."
            });
        }
    }
});

/* ===============================
   7. ADMIN LOGIN
================================ */

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        const token = jwt.sign(
            { username },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        console.log(`👤 Admin login successful: ${username}`);
        return res.json({
            success: true,
            token
        });
    }

    console.warn(`⚠️ Failed login attempt for: ${username}`);
    res.status(401).json({
        success: false,
        error: "Invalid credentials"
    });
});

/* ===============================
   8. ADMIN API
================================ */

app.get('/api/requests', auth, (req, res) => {
    res.json(getRequests());
});

app.patch('/api/requests/:id', auth, (req, res) => {
    const requests = getRequests();
    const index = requests.findIndex(r => r._id === req.params.id);

    if (index !== -1) {
        requests[index].status = req.body.status;
        fs.writeFileSync(DB_FILE, JSON.stringify(requests, null, 2));
        console.log(`🔄 Status for request ${req.params.id} updated to: ${req.body.status}`);
        res.json({ success: true, message: "Status updated" });
    } else {
        res.status(404).json({ error: "Not found" });
    }
});

app.delete('/api/requests/:id', auth, (req, res) => {
    const requests = getRequests();
    const filtered = requests.filter(r => r._id !== req.params.id);
    fs.writeFileSync(DB_FILE, JSON.stringify(filtered, null, 2));
    console.log(`🗑️ Record deleted: ${req.params.id}`);
    res.json({ success: true, message: "Deleted" });
});

/* ===============================
   9. EMAIL FUNCTION
================================ */

async function sendEmails(data) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("⚠️ Email credentials missing");
        return;
    }

    const adminEmail = process.env.EMAIL_USER;

    // Admin Notification
    try {
        await transporter.sendMail({
            from: `"StudentMeet Admin" <${process.env.EMAIL_USER}>`,
            to: adminEmail,
            subject: "New Project Request Received",
            text: `
Name: ${data.name}
Email: ${data.email}
WhatsApp: ${data.whatsapp}
Project: ${data.projectTitle}
Budget: ${data.budget}
Deadline: ${data.deadline}
`
        });
        console.log("📧 Admin email sent successfully");
    } catch (err) {
        console.error("❌ Detailed Admin Email Error:", err);
    }

    // Client Confirmation
    try {
        await transporter.sendMail({
            from: `"StudentMeet Team" <${process.env.EMAIL_USER}>`,
            to: data.email,
            subject: "StudentMeet - Request Received",
            text: `
Hello ${data.name},
 
Your project request has been received.
Project Title: ${data.projectTitle}
 
We will contact you soon.
 
StudentMeet Team
`
        });
        console.log("📧 Client email sent successfully");
    } catch (err) {
        console.error("❌ Detailed Client Email Error:", err);
    }
}

/* ===============================
   10. SERVER START
================================ */

app.listen(PORT, () => {
    console.log(`🚀 Server starting...`);
    console.log(`📍 Server running on port ${PORT}`);
});