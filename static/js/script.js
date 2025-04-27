document.getElementById('query-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const input = document.getElementById('query-input');
    const query = input.value.trim();
    if (!query) return;
    
    // Add user message to chat
    const chatContainer = document.getElementById('chat-container');
    const userDiv = document.createElement('div');
    userDiv.className = 'user-message';
    userDiv.textContent = query;
    chatContainer.appendChild(userDiv);
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'bot-message';
    loadingDiv.innerHTML = '<span class="loading"></span> Thinking...';
    chatContainer.appendChild(loadingDiv);
    
    // Clear input
    input.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    try {
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        
        // Remove loading indicator
        chatContainer.removeChild(loadingDiv);
        
        // Add bot response
        const botDiv = document.createElement('div');
        botDiv.className = 'bot-message';
        
        // If response is markdown enabled, render it properly
        if (typeof data.response === 'string') {
            botDiv.textContent = data.response;
        } else {
            botDiv.innerHTML = data.response;
        }
        
        chatContainer.appendChild(botDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        
    } catch (error) {
        // Remove loading indicator
        chatContainer.removeChild(loadingDiv);
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bot-message text-danger';
        errorDiv.textContent = 'Sorry, there was an error processing your request.';
        chatContainer.appendChild(errorDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        console.error('Error:', error);
    }
});