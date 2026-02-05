class DocumentScraperBot {
    constructor() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.attachMenu = document.getElementById('attachMenu');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.isProcessing = false;
        this.urls = [];
        this.files = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.addEventListener('click', (e) => {
            if (!this.attachMenu.contains(e.target) && !e.target.closest('.attach-btn')) {
                this.attachMenu.style.display = 'none';
            }
        });
    }

    addMessage(content, isUser = false, type = 'text') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        if (type === 'html') {
            bubble.innerHTML = content;
        } else {
            bubble.textContent = content;
        }
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageContent.appendChild(bubble);
        messageContent.appendChild(time);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addProgressMessage(title, progress = 0) {
        const content = `
            <div class="progress-message">
                <p><strong>${title}</strong></p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <p class="progress-text">${progress}% complete</p>
            </div>
        `;
        this.addMessage(content, false, 'html');
        return this.messagesContainer.lastElementChild;
    }

    updateProgress(messageElement, progress, status) {
        const progressFill = messageElement.querySelector('.progress-fill');
        const progressText = messageElement.querySelector('.progress-text');
        
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = `${progress}% - ${status}`;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showLoading(show = true) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
        this.isProcessing = show;
    }

    async processMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('scrape') && lowerMessage.includes('url')) {
            await this.handleScrapeUrls();
        } else if (lowerMessage.includes('pdf')) {
            await this.handleProcessPdfs();
        } else if (lowerMessage.includes('embedding')) {
            await this.handleGenerateEmbeddings();
        } else if (lowerMessage.includes('status')) {
            await this.handleShowStatus();
        } else if (lowerMessage.includes('clear') || lowerMessage.includes('clean')) {
            await this.handleClearData();
        } else if (lowerMessage.includes('help')) {
            this.showHelp();
        } else {
            this.addMessage("I can help you with:\n• Scraping URLs\n• Processing PDFs\n• Generating embeddings\n• Showing status\n• Clearing data\n\nTry saying 'scrape URLs' or use the quick action buttons!");
        }
    }

    async handleScrapeUrls() {
        if (this.urls.length === 0) {
            this.addMessage("Please add some URLs first. Click the paperclip icon and select 'Add URL'.");
            return;
        }

        this.showLoading(true);
        const progressMsg = this.addProgressMessage("Scraping URLs", 0);
        
        try {
            // Simulate scraping process
            for (let i = 0; i < this.urls.length; i++) {
                const progress = Math.round(((i + 1) / this.urls.length) * 100);
                this.updateProgress(progressMsg, progress, `Scraping ${this.urls[i]}`);
                
                // Simulate API call delay
                await this.delay(1000);
            }
            
            this.addMessage(`✅ Successfully scraped ${this.urls.length} URLs!\n\nFiles saved to: raw_docs_scraped/\nNext step: Process the scraped content or generate embeddings.`);
            
        } catch (error) {
            this.addMessage(`❌ Error during scraping: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async handleProcessPdfs() {
        this.showLoading(true);
        const progressMsg = this.addProgressMessage("Processing PDFs", 0);
        
        try {
            // Simulate PDF processing
            const steps = ['Extracting text', 'Cleaning content', 'Splitting into clauses', 'Classifying content'];
            
            for (let i = 0; i < steps.length; i++) {
                const progress = Math.round(((i + 1) / steps.length) * 100);
                this.updateProgress(progressMsg, progress, steps[i]);
                await this.delay(1500);
            }
            
            this.addMessage("✅ PDF processing complete!\n\n📊 Results:\n• 4 PDFs processed\n• 1,247 clauses extracted\n• Content classified and tagged\n• Files saved to: cleaned_docs/");
            
        } catch (error) {
            this.addMessage(`❌ Error processing PDFs: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async handleGenerateEmbeddings() {
        this.showLoading(true);
        const progressMsg = this.addProgressMessage("Generating Embeddings", 0);
        
        try {
            // Simulate embedding generation
            const totalClauses = 1247;
            const batchSize = 50;
            const batches = Math.ceil(totalClauses / batchSize);
            
            for (let i = 0; i < batches; i++) {
                const progress = Math.round(((i + 1) / batches) * 100);
                const processed = Math.min((i + 1) * batchSize, totalClauses);
                this.updateProgress(progressMsg, progress, `Processing batch ${i + 1}/${batches} (${processed}/${totalClauses} clauses)`);
                await this.delay(800);
            }
            
            this.addMessage("✅ Embeddings generated successfully!\n\n📈 Summary:\n• 1,247 clauses processed\n• 1,024-dimensional vectors\n• Model: mxbai-embed-large\n• Ready for similarity search");
            
        } catch (error) {
            this.addMessage(`❌ Error generating embeddings: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async handleShowStatus() {
        this.showLoading(true);
        await this.delay(500);
        
        const status = `
            📊 <strong>System Status</strong><br><br>
            
            <strong>📁 Files:</strong><br>
            • Raw docs: 12 files<br>
            • Cleaned docs: 8 files<br>
            • Clauses: 1,247 items<br>
            • Metadata: 1,247 JSON files<br><br>
            
            <strong>🔧 Models:</strong><br>
            • Llama 3.1: ✅ Available<br>
            • MXBai Embed: ✅ Available<br><br>
            
            <strong>💾 Storage:</strong><br>
            • Used: 245 MB<br>
            • Available: 15.2 GB<br><br>
            
            <strong>⚡ Last Activity:</strong><br>
            • Embeddings: 2 min ago<br>
            • Classification: 5 min ago
        `;
        
        this.addMessage(status, false, 'html');
        this.showLoading(false);
    }

    async handleClearData() {
        this.addMessage("⚠️ Are you sure you want to clear all processed data? This will remove:\n• Scraped documents\n• Processed clauses\n• Generated embeddings\n• Classification metadata\n\nType 'confirm clear' to proceed.");
    }

    showHelp() {
        const help = `
            🤖 <strong>Document Scraper Bot Help</strong><br><br>
            
            <strong>Quick Actions:</strong><br>
            • "Scrape URLs" - Process web content<br>
            • "Process PDFs" - Extract and clean PDF text<br>
            • "Generate embeddings" - Create vector representations<br>
            • "Show status" - View system information<br><br>
            
            <strong>File Operations:</strong><br>
            • Use 📎 to attach URLs or files<br>
            • Supported: PDF, TXT, URLs<br><br>
            
            <strong>Settings:</strong><br>
            • Click ⚙️ to configure models<br>
            • Adjust output folders<br>
            • Toggle auto-processing
        `;
        
        this.addMessage(help, false, 'html');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the bot
const bot = new DocumentScraperBot();

// Global functions for HTML onclick events
function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message && !bot.isProcessing) {
        bot.addMessage(message, true);
        input.value = '';
        
        setTimeout(() => {
            bot.processMessage(message);
        }, 500);
    }
}

function sendQuickMessage(message) {
    if (!bot.isProcessing) {
        bot.addMessage(message, true);
        setTimeout(() => {
            bot.processMessage(message);
        }, 500);
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function showAttachMenu() {
    const menu = document.getElementById('attachMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function attachFile(type) {
    const menu = document.getElementById('attachMenu');
    menu.style.display = 'none';
    
    switch(type) {
        case 'url':
            const url = prompt('Enter URL to scrape:');
            if (url) {
                bot.urls.push(url);
                bot.addMessage(`📎 URL added: ${url}`, true);
                bot.addMessage(`URL added to scraping queue. You now have ${bot.urls.length} URL(s) ready to process.`);
            }
            break;
            
        case 'pdf':
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    bot.files.push(file);
                    bot.addMessage(`📎 PDF uploaded: ${file.name}`, true);
                    bot.addMessage(`PDF file added. Ready for processing.`);
                }
            };
            input.click();
            break;
            
        case 'text':
            const textInput = document.createElement('input');
            textInput.type = 'file';
            textInput.accept = '.txt,.md';
            textInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    bot.files.push(file);
                    bot.addMessage(`📎 Text file uploaded: ${file.name}`, true);
                    bot.addMessage(`Text file added. Ready for processing.`);
                }
            };
            textInput.click();
            break;
    }
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('active');
}

function clearChat() {
    const container = document.getElementById('messagesContainer');
    // Keep only the first welcome message
    const firstMessage = container.firstElementChild;
    container.innerHTML = '';
    container.appendChild(firstMessage);
    
    bot.addMessage("Chat cleared! How can I help you today?");
}