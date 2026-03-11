const API_BASE = "http://localhost:5000/api";

// 0. Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    });

    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        });
    });
}

// 1. Session & Auth Guards
if (window.location.pathname.includes('request.html')) {
    const user = JSON.parse(localStorage.getItem('sm_user'));
    if (!user) {
        window.location.href = 'user-signin.html';
    }
}

// 2. User Sign In (Pre-Request)
const userLoginForm = document.getElementById('userLoginForm');
if (userLoginForm) {
    userLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = {
            email: document.getElementById('userEmail').value,
            name: document.getElementById('userName').value
        };
        localStorage.setItem('sm_user', JSON.stringify(user));
        window.location.href = 'request.html';
    });
}

// 3. PROJECT REQUEST FORM SUBMISSION (TASK 1, 7)
const requestForm = document.getElementById('requestForm');
if (requestForm) {
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submitBtn');
        const msg = document.getElementById('statusMessage');
        const formData = new FormData(requestForm);

        try {
            btn.disabled = true;
            btn.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Submitting...";
            msg.innerHTML = "Processing your request...";
            
            // Task 1: Ensure Fetch API usage and correct endpoint
            const res = await fetch(`${API_BASE}/requests`, {
                method: 'POST',
                body: formData // Automatically sets correct multipart/form-data boundary
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Task 7: Show specific success message
                msg.innerHTML = `<span style="color: #2ecc71; font-weight: 600;">✅ Project request submitted successfully.</span>`;
                requestForm.reset();
                setTimeout(() => {
                    alert("Success! Check your email for confirmation.");
                }, 500);
            } else {
                msg.innerHTML = `<span class="text-danger">❌ ${data.message || 'Submission failed.'}</span>`;
            }
        } catch (err) {
            console.error("Frontend Submission Error:", err);
            msg.innerHTML = `<span class="text-danger">❌ Server connection failed. Please ensure backend is running.</span>`;
        } finally {
            btn.disabled = false;
            btn.innerHTML = "Submit Request";
        }
    });
}

// 4. Admin Login Logic
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = loginForm.username.value;
        const password = loginForm.password.value;
        const err = document.getElementById('loginError');

        try {
            console.log("Admin login attempt for:", username);
            const res = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                localStorage.setItem('sm_token', data.token);
                window.location.href = 'dashboard.html';
            } else {
                err.textContent = data.error || "Invalid username or password.";
            }
        } catch (err) {
            console.error("Admin Login Error:", err);
            err.textContent = "Server connection failed.";
        }
    });
}

// 5. Dashboard Management
if (window.location.pathname.includes('dashboard.html')) {
    const token = localStorage.getItem('sm_token');
    if (!token) {
        window.location.href = 'admin-login.html';
    } else {
        document.body.classList.remove('hidden');
        renderDashboard();
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('sm_token');
            window.location.href = 'admin-login.html';
        };
    }
}

async function renderDashboard() {
    const grid = document.getElementById('requestGrid');
    const token = localStorage.getItem('sm_token');

    try {
        if (!grid) return;

        const res = await fetch(`${API_BASE}/requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            localStorage.removeItem('sm_token');
            window.location.href = 'admin-login.html';
            return;
        }

        const data = await res.json();
        
        const stats = document.getElementById('requestStats');
        if (stats) stats.textContent = `${data.length} Total Requests`;
        
        if (data.length === 0) {
            grid.innerHTML = `<div class="text-center w-full" style="grid-column: 1/-1; padding: 2rem; color: var(--text-muted);"><i class="fas fa-folder-open" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i> No project requests yet.</div>`;
            return;
        }

        grid.innerHTML = data.map(req => `
            <div class="glass-card">
                <div class="flex-between">
                    <span class="status-badge ${req.status}">${req.status}</span>
                    <small>${new Date(req.createdAt).toLocaleDateString()}</small>
                </div>
                <h3 style="margin: 1rem 0 0.5rem; color: var(--primary);">${req.projectTitle}</h3>
                <p style="font-size: 0.8rem; font-weight: 600; color: var(--accent); margin-bottom: 0.5rem;">[${req.projectCategory.toUpperCase()}]</p>
                <p style="font-size: 0.9rem; margin-bottom: 1rem;">${req.projectDescription}</p>
                
                <div style="font-size: 0.85rem; border-top: 1px solid var(--glass-border); padding-top: 1rem;">
                    <p><strong>Client:</strong> ${req.name}</p>
                    <p><strong>WhatsApp:</strong> <a href="https://wa.me/${req.whatsapp}" target="_blank" style="color:#25d366;"><i class="fab fa-whatsapp"></i> ${req.whatsapp}</a></p>
                    <p><strong>Budget:</strong> ₹${req.budget}</p>
                    <p><strong>Deadline:</strong> ${req.deadline}</p>
                    ${req.fileUrl ? `<p><strong>File:</strong> <a href="${window.location.protocol}//${window.location.host}${req.fileUrl}" target="_blank" style="color:var(--primary);">View Attachment</a></p>` : ''}
                </div>

                <div style="margin-top: 1.5rem; display: flex; gap: 5px; flex-wrap: wrap;">
                    <button onclick="updateStatus('${req._id}', 'pending')" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Pending</button>
                    <button onclick="updateStatus('${req._id}', 'in-progress')" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">In Progress</button>
                    <button onclick="updateStatus('${req._id}', 'completed')" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Complete</button>
                    <button onclick="deleteRequest('${req._id}')" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-color: #ff4d4d; color: #ff4d4d;">Delete</button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

window.updateStatus = async (id, status) => {
    const token = localStorage.getItem('sm_token');
    await fetch(`${API_BASE}/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
    });
    renderDashboard();
};

window.deleteRequest = async (id) => {
    if (!confirm("Are you sure?")) return;
    const token = localStorage.getItem('sm_token');
    await fetch(`${API_BASE}/requests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    renderDashboard();
};
