/**
 * Project: Freelance Lead Generation Website
 * Description: Client project requests and Admin Dashboard using Firebase.
 * Version: 1.0.0
 */

// Import necessary Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    deleteDoc, 
    doc, 
    updateDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Import configuration (make sure you update your-config.js first!)
import firebaseConfig from "./firebase-config.js";

// Check if Config is default
if(firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn("Firebase configuration is not set up. Please update firebase-config.js.");
    // Show a warning UI if we're on a page that needs Firebase
    const status = document.getElementById('submitStatus') || document.getElementById('loginStatus');
    if(status) {
        status.innerHTML = `<span style="color: #ffc107;">⚠️ Please configure Firebase in firebase-config.js</span>`;
    }
}

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper for selecting elements
const $ = (id) => document.getElementById(id);

/**
 * PAGE: Request Form (request.html)
 */
const requestForm = $('projectRequestForm');
if (requestForm) {
    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = requestForm.querySelector('button');
        const status = $('submitStatus');

        // Collect Form Data
        const projectData = {
            clientName: $('clientName').value,
            clientEmail: $('clientEmail').value,
            clientWhatsApp: $('clientWhatsApp').value,
            title: $('projectTitle').value,
            description: $('projectDescription').value,
            budget: parseFloat($('projectBudget').value),
            deadline: $('projectDeadline').value || "No deadline set",
            status: "pending", // Default status
            createdAt: serverTimestamp() // Official Firebase timestamp
        };

        try {
            submitBtn.disabled = true;
            status.textContent = "🚀 Sending your request...";

            // Save to Firestore 'projects' collection
            await addDoc(collection(db, "projects"), projectData);

            // Success feedback
            status.innerHTML = `<span style="color: var(--accent);">✅ Project submitted successfully! We'll contact you soon.</span>`;
            requestForm.reset();
        } catch (error) {
            console.error("Submission Error:", error);
            status.innerHTML = `<span style="color: #dc3545;">❌ Error: ${error.message}</span>`;
        } finally {
            submitBtn.disabled = false;
        }
    });
}

/**
 * PAGE: Admin Login (admin-login.html)
 */
const loginForm = $('adminLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = $('adminEmail').value;
        const password = $('adminPassword').value;
        const status = $('loginStatus');

        try {
            status.textContent = "Logging in...";
            await signInWithEmailAndPassword(auth, email, password);
            // Redirection handled by onAuthStateChanged
        } catch (error) {
            console.error("Login Error:", error);
            status.textContent = "Invalid email or password.";
        }
    });
}

/**
 * AUTH WATCHER (Protect Pages & Redirects)
 */
onAuthStateChanged(auth, (user) => {
    const isDashboard = window.location.pathname.includes('dashboard.html');
    const isLogin = window.location.pathname.includes('admin-login.html');

    if (user) {
        // Logged in
        if (isLogin) {
            window.location.href = "dashboard.html";
        }
        if (isDashboard) {
            document.body.style.display = 'block';
            setupDashboard();
        }
    } else {
        // Not logged in
        if (isDashboard) {
            window.location.href = "admin-login.html";
        }
    }
});

/**
 * DASHBOARD LOGIC (dashboard.html)
 */
function setupDashboard() {
    const projectGrid = $('projectGrid');
    const logoutBtn = $('logoutBtn');
    const loadingUI = $('dashboardLoading');
    const countDisplay = $('requestCount');

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.onclick = () => signOut(auth);
    }

    // Real-time Fetching from Firestore
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        if(loadingUI) loadingUI.style.display = 'none';
        projectGrid.innerHTML = ""; // Clear current list
        
        let projects = [];
        snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });

        countDisplay.textContent = `${projects.length} Requests`;

        if (projects.length === 0) {
            projectGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">No project requests yet.</div>`;
            return;
        }

        projects.forEach(project => {
            const date = project.createdAt ? project.createdAt.toDate().toLocaleDateString() : "Just now";
            
            const card = document.createElement('div');
            card.className = "glass-card project-card animate";
            card.innerHTML = `
                <span class="status-badge status-${project.status}">${project.status.toUpperCase()}</span>
                <h3 style="margin-bottom: 0.5rem; color: var(--primary);">${project.title}</h3>
                <p style="margin-bottom: 1rem; font-style: italic;">"${project.description}"</p>
                <div style="border-top: 1px solid var(--glass-border); padding-top: 1rem; margin-top: 1rem; font-size: 0.9rem;">
                    <p><strong>Client:</strong> ${project.clientName}</p>
                    <p><strong>Email:</strong> ${project.clientEmail}</p>
                    <p><strong>WhatsApp:</strong> ${project.clientWhatsApp}</p>
                    <p><strong>Budget:</strong> $${project.budget}</p>
                    <p><strong>Date:</strong> ${date}</p>
                </div>
                <div class="card-actions">
                    <a href="https://wa.me/${project.clientWhatsApp}?text=Hi ${project.clientName}, I'm reaching out about your project: ${project.title}" target="_blank" class="btn btn-small btn-whatsapp" style="text-decoration:none;">Contact</a>
                    ${project.status === 'pending' ? `<button onclick="markAsCompleted('${project.id}')" class="btn btn-small btn-complete">Done</button>` : ''}
                    <button onclick="deleteRequest('${project.id}')" class="btn btn-small btn-delete">Delete</button>
                </div>
            `;
            projectGrid.appendChild(card);
        });
    });
}

// Global scope functions for buttons in dynamic cards
window.markAsCompleted = async (id) => {
    if(confirm("Mark this project as completed?")) {
        const docRef = doc(db, "projects", id);
        await updateDoc(docRef, { status: "completed" });
    }
};

window.deleteRequest = async (id) => {
    if(confirm("Are you sure you want to delete this request?")) {
        const docRef = doc(db, "projects", id);
        await deleteDoc(docRef);
    }
};
