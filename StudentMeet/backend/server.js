require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. PROJECT DATA STORAGE (Local File System as Fallback)
// Since MongoDB is not installed, we use a JSON file to store your requests.
// This works IMMEDIATELY without needing any extra services!
const DB_FILE = path.join(__dirname, 'database.json');
const uploadDir = path.join(__dirname, 'uploads');

// Ensure database file and uploads folder exist
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Helper functions for our "Database"
const getRequests = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveRequestToLocal = (newReq) => {
    const requests = getRequests();
    requests.unshift(newReq); // Add to beginning
    fs.writeFileSync(DB_FILE, JSON.stringify(requests, null, 2));
};

// 2. MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../frontend')));

console.log('✅ Local File Database Ready (database.json)');

// 3. MULTER CONFIG
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// 4. NODEMAILER CONFIG
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Auth middleware for Admin
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ success: false, error: 'Authentication required' });
    }
};

/**
 * 5. ROUTES
 */

// POST /api/requests - Submit Project Request
app.post('/api/requests', upload.single('file'), async (req, res) => {
    try {
        console.log('📩 Incoming Request:', req.body);

        const { name, email, whatsapp, projectTitle, projectCategory, projectDescription, budget, deadline } = req.body;

        // Create the request object
        const newRequest = {
            _id: Date.now().toString(),
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
            status: 'pending',
            createdAt: new Date()
        };

        // SAVE TO LOCAL FILE (No MongoDB required!)
        saveRequestToLocal(newRequest);
        console.log('💾 Successfully saved to local database (database.json)');

        // Background Email Task
        sendEmails(newRequest).catch(err => console.error('📧 Email Error:', err.message));

        res.json({
            success: true,
            message: "Project request submitted successfully"
        });

    } catch (error) {
        console.error("API ERROR:", error.message);
        res.status(500).json({
            success: false,
            message: `Submission Error: ${error.message}`
        });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// Admin endpoints (Using local file)
app.get('/api/requests', auth, async (req, res) => {
    res.json(getRequests());
});

app.patch('/api/requests/:id', auth, async (req, res) => {
    const requests = getRequests();
    const index = requests.findIndex(r => r._id === req.params.id);
    if (index !== -1) {
        requests[index].status = req.body.status;
        fs.writeFileSync(DB_FILE, JSON.stringify(requests, null, 2));
        res.json({ success: true, message: 'Status updated' });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/requests/:id', auth, async (req, res) => {
    const requests = getRequests();
    const filtered = requests.filter(r => r._id !== req.params.id);
    fs.writeFileSync(DB_FILE, JSON.stringify(filtered, null, 2));
    res.json({ success: true, message: 'Deleted' });
});

// Email Helper (Task 1-6)
async function sendEmails(data) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Email credentials missing in .env. Skipping notifications.');
        return;
    }

    const adminEmailAddress = 'daggubatibapaiahchowdary@gmail.com';

    // 1. Admin Notification Email
    const adminMailOptions = {
        from: `"StudentMeet Admin" <${process.env.EMAIL_USER}>`,
        to: adminEmailAddress,
        subject: 'New Project Request - StudentMeet',
        text: `You have received a new project request.

Client Name: ${data.name}
Email: ${data.email}
WhatsApp: ${data.whatsapp}
Project Title: ${data.projectTitle}
Budget: ${data.budget}
Deadline: ${data.deadline}

View details in the admin dashboard.`
    };

    // 2. Client Confirmation Email
    const userMailOptions = {
        from: `"StudentMeet Team" <${process.env.EMAIL_USER}>`,
        to: data.email,
        subject: 'StudentMeet - Project Request Received',
        text: `Hello ${data.name},

Thank you for submitting your project request on StudentMeet.

Project Title: ${data.projectTitle}

I will review your request and contact you soon.

Regards
StudentMeet`
    };

    try {
        // Send Admin Email
        await transporter.sendMail(adminMailOptions);
        console.log('📧 Admin notification email sent.');
    } catch (err) {
        console.error('❌ Failed to send Admin email:', err.message);
    }

    try {
        // Send Client Email (Task 2, 4, 5)
        await transporter.sendMail(userMailOptions);
        console.log('📧 Client confirmation email sent.');
    } catch (err) {
        console.error('❌ Failed to send Client confirmation email:', err.message);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 StudentMeet Server: http://localhost:${PORT}`);
});
