// ReplyAI Test Webhook Script
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('testForm');
    const responseDiv = document.getElementById('response');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const webhookUrl = document.getElementById('webhookUrl').value;
        const originalPost = document.getElementById('originalPost').value;
        const tone = document.getElementById('tone').value;
        
        // Prepare the payload (same as the extension sends)
        const payload = {
            tone: tone,
            originalPost: originalPost,
            userContext: {
                username: "testuser",
                displayName: "Test User",
                followers: "1000",
                following: "500",
                currentUrl: "https://twitter.com/test",
                pageTitle: "X"
            },
            timestamp: new Date().toISOString(),
            extensionVersion: "1.0.0"
        };
        
        try {
            responseDiv.style.display = 'block';
            responseDiv.className = 'response';
            responseDiv.innerHTML = '<strong>Testing webhook...</strong><br>Sending request to: ' + webhookUrl;
            
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (response.ok && data.reply) {
                responseDiv.className = 'response success';
                responseDiv.innerHTML = `
                    <strong>✅ Success!</strong><br>
                    <strong>Generated Reply:</strong> ${data.reply}<br>
                    <strong>Tone:</strong> ${data.tone}<br>
                    <strong>Response Status:</strong> ${response.status}<br>
                    <strong>Full Response:</strong>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                `;
            } else {
                throw new Error(`HTTP ${response.status}: ${data.message || 'Unknown error'}`);
            }
            
        } catch (error) {
            responseDiv.className = 'response error';
            responseDiv.innerHTML = `
                <strong>❌ Error:</strong> ${error.message}<br>
                <strong>Request Payload:</strong>
                <pre>${JSON.stringify(payload, null, 2)}</pre>
            `;
        }
    });
}); 