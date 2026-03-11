const fetch = require('node-fetch');

async function testSubmit() {
    try {
        const res = await fetch('http://localhost:5000/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Bot',
                email: 'test@example.com',
                whatsapp: '1234567890',
                projectTitle: 'Test Project Title',
                projectCategory: 'Software',
                projectDescription: 'Test Project Description',
                budget: '1000-2000',
                deadline: '2026-12-31'
            })
        });

        console.log('Status Code:', res.status);
        const data = await res.json();
        console.log('Response JSON:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Fetch Error:', err.message);
    }
}

testSubmit();
