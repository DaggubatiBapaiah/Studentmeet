require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Request = require('./models/Request');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/freelance_db')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Email Configuration (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Admin Auth Middleware
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate as admin.' });
    }
};

/**
 * ROUTES
 */

// 1. Submit Project Request (Public)
app.post('/api/requests', upload.single('file'), async (req, res) => {
    try {
        const { name, email, whatsapp, title, description, budget, deadline } = req.body;
        
        const newRequest = new Request({
            name, email, whatsapp, title, description, budget, deadline,
            fileName: req.file ? req.file.filename : null,
            fileUrl: req.file ? `/uploads/${req.file.filename}` : null
        });

        await newRequest.save();

        // Send Emails
        sendConfirmationEmails(newRequest);

        res.status(201).json({ message: 'Request submitted successfully!', id: newRequest._id });
    } catch (error) {
        console.error('Submission Error:', error);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// 2. Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple verification from .env for demo purposes
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '2h' });
        return res.json({ token, message: 'Login successful' });
    }
    
    res.status(401).json({ error: 'Invalid username or password' });
});

// 3. Get All Requests (Admin Only)
app.get('/api/requests', auth, async (req, res) => {
    try {
        const requests = await Request.find().sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching requests' });
    }
});

// 4. Update Request Status (Admin Only)
app.patch('/api/requests/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const request = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json(request);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// 5. Delete Request (Admin Only)
app.delete('/api/requests/:id', auth, async (req, res) => {
    try {
        await Request.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Helper Function: Send Emails
async function sendConfirmationEmails(data) {
    // 1. To Client
    const clientMailOptions = {
        from: process.env.EMAIL_USER,
        to: data.email,
        subject: 'Project Request Received',
        text: `Hello ${data.name},\n\nThank you for submitting your project request.\n\nProject Title: ${data.title}\n\nI will review your request and contact you soon.\n\nRegards,\nProject Builder`
    };

    // 2. To Admin
    const adminMailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `New Project Request: ${data.title}`,
        text: `New request from ${data.name} (${data.email})\nWhatsApp: ${data.whatsapp}\nBudget: ${data.budget}\nTitle: ${data.title}\nDescription: ${data.description}`
    };

    try {
        await transporter.sendMail(clientMailOptions);
        await transporter.sendMail(adminMailOptions);
        console.log('✅ Confirmation emails sent.');
    } catch (err) {
        console.error('❌ Email failed (check your .env credentials):', err.message);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
