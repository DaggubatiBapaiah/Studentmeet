/**
 * Project: Full-Stack Freelance Website
 * Logic for Form Submission, Admin Auth, and Dashboard Management.
 */

// Base URL for API requests (Change if backend is on a different port)
const API_URL = "http://localhost:5000/api";

// 1. PROJECT REQUEST FORM HANDLING
const projectForm = document.getElementById('projectForm');
if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const statusMsg = document.getElementById('formMessage');
        const formData = new FormData(projectForm);

        try {
            submitBtn.disabled = true;
            statusMsg.style.display = 'block';
            statusMsg.innerHTML = `<span style="color: var(--primary);">🚀 Submitting your project...</span>`;

            const response = await fetch(`${API_URL}/requests`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                statusMsg.innerHTML = `<span style="color: var(--accent);">✅ Success! Check your email for confirmation.</span>`;
                projectForm.reset();
            } else {
                const errData = await response.json();
                statusMsg.innerHTML = `<span style="color: #dc3545;">❌ Error: ${errData.error}</span>`;
            }
        } catch (error) {
            console.error('Submission Error:', error);
            statusMsg.innerHTML = `<span style="color: #dc3545;">❌ Error: Cannot connect to server.</span>`;
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// 2. ADMIN LOGIN HANDLING
const loginForm = document.getElementById('adminLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const statusMsg = document.getElementById('loginStatus');
        const username = loginForm.username.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const { token } = await response.json();
                localStorage.setItem('adminToken', token); // Store session token
                window.location.href = "dashboard.html";
            } else {
                statusMsg.textContent = "Invalid username or password.";
            }
        } catch (error) {
            statusMsg.textContent = "Cannot connect to server.";
        }
    });
}

// 3. DASHBOARD MANAGEMENT (dashboard.html Only)
if (window.location.pathname.includes('dashboard.html')) {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('adminToken');
            window.location.href = "admin-login.html";
        };
    }

    // AUTH CHECK: Ensure only admin can view
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = "admin-login.html";
    } else {
        fetchRequests();
    }
}

// 4. FETCH AND RENDER DASHBOARD CARDS
async function fetchRequests() {
    const grid = document.getElementById('requestGrid');
    const token = localStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            window.location.href = "admin-login.html";
        }

        const requests = await response.json();
        
        if (requests.length === 0) {
            grid.innerHTML = `<div class="text-center w-full" style="grid-column: 1/-1;">No requests yet.</div>`;
            return;
        }

        grid.innerHTML = ""; // Clear loader
        requests.forEach(req => {
            const card = document.createElement('div');
            card.className = "glass-card animate";
            card.innerHTML = `
                <div class="flex-between">
                    <span class="status-badge ${req.status}">${req.status.toUpperCase()}</span>
                    <small style="color: var(--text-muted);">${new Date(req.createdAt).toLocaleDateString()}</small>
                </div>
                <h3 style="margin: 1rem 0 0.5rem; color: var(--primary);">${req.title}</h3>
                <p style="font-size: 0.95rem; margin-bottom: 1.5rem;">${req.description}</p>
                
                <div style="border-top: 1px solid var(--glass-border); padding-top: 1rem; font-size: 0.9rem;">
                    <p><strong>Client:</strong> ${req.name}</p>
                    <p><strong>Email:</strong> ${req.email}</p>
                    <p><strong>WhatsApp:</strong> <a href="https://wa.me/${req.whatsapp}" target="_blank" style="color: #25d366;"><i class="fab fa-whatsapp"></i> ${req.whatsapp}</a></p>
                    <p><strong>Budget:</strong> ₹${req.budget}</p>
                    <p><strong>Deadline:</strong> ${req.deadline || 'Flexible'}</p>
                    ${req.fileName ? `<p><strong>File:</strong> <a href="http://localhost:5000${req.fileUrl}" target="_blank" style="color: var(--accent);"><i class="fas fa-file-download"></i> View File</a></p>` : ''}
                </div>

                <div class="card-actions mt-2" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button onclick="updateStatus('${req._id}', 'in-progress')" class="btn btn-outline" style="font-size: 0.8rem; padding: 0.5rem 1rem;">Working</button>
                    <button onclick="updateStatus('${req._id}', 'completed')" class="btn btn-outline" style="font-size: 0.8rem; padding: 0.5rem 1rem;">Done</button>
                    <button onclick="deleteRequest('${req._id}')" class="btn btn-outline border-danger" style="font-size: 0.8rem; padding: 0.5rem 1rem;">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

// 5. STATUS UPDATES AND DELETION (Global Functions for Cards)
window.updateStatus = async (id, status) => {
    const token = localStorage.getItem('adminToken');
    try {
        await fetch(`${API_URL}/requests/${id}`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        fetchRequests(); // Refresh
    } catch (err) { console.error('Update failed'); }
};

window.deleteRequest = async (id) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    const token = localStorage.getItem('adminToken');
    try {
        await fetch(`${API_URL}/requests/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchRequests(); // Refresh
    } catch (err) { console.error('Delete failed'); }
};
