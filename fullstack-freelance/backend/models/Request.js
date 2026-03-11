const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    whatsapp: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    budget: { type: String, required: true },
    deadline: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    status: { 
        type: String, 
        enum: ['pending', 'in-progress', 'completed'], 
        default: 'pending' 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
