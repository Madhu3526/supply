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
        this.apiBase = 'http://localhost:5000/api';
        
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
        
        return messageDiv;
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
        return this.addMessage(content, false, 'html');
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

    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${this.apiBase}${endpoint}`, options);
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
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
        } else if (lowerMessage.includes('full process') || lowerMessage.includes('complete workflow')) {
            await this.handleFullWorkflow();
        } else {
            this.addMessage("I can help you with:\n• Scraping URLs\n• Processing PDFs\n• Generating embeddings\n• Showing status\n• Full workflow\n• Clearing data\n\nTry saying 'scrape URLs' or use the quick action buttons!");
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
            const response = await this.apiCall('/scrape', 'POST', { urls: this.urls });
            
            let successCount = 0;
            let errorCount = 0;
            
            response.results.forEach((result, index) => {
                const progress = Math.round(((index + 1) / response.results.length) * 100);
                
                if (result.success) {
                    successCount++;
                    this.updateProgress(progressMsg, progress, `Scraped: ${result.url}`);
                } else {
                    errorCount++;
                    this.updateProgress(progressMsg, progress, `Failed: ${result.url}`);
                }
            });
            
            this.addMessage(`✅ Scraping complete!\n\n📊 Results:\n• Successfully scraped: ${successCount} URLs\n• Failed: ${errorCount} URLs\n• Files saved to: raw_docs_scraped/\n\nNext: Process the content or run full workflow.`);
            
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
            // Step 1: Process PDFs
            this.updateProgress(progressMsg, 25, "Processing PDF files");
            const pdfResponse = await this.apiCall('/process-pdfs', 'POST');
            
            // Step 2: Clean documents
            this.updateProgress(progressMsg, 50, "Cleaning documents");
            const cleanResponse = await this.apiCall('/clean-docs', 'POST');
            
            // Step 3: Split into clauses
            this.updateProgress(progressMsg, 75, "Splitting into clauses");
            const clauseResponse = await this.apiCall('/split-clauses', 'POST');
            
            this.updateProgress(progressMsg, 100, "Complete");
            
            this.addMessage(`✅ PDF processing complete!\n\n📊 Results:\n• PDFs processed: ${pdfResponse.results.length}\n• Documents cleaned: ${cleanResponse.results.length}\n• Clauses extracted: ${clauseResponse.total_clauses}\n• Files saved to: cleaned_docs/ and clauses/`);
            
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
            // Step 1: Classify clauses
            this.updateProgress(progressMsg, 30, "Classifying clauses");
            const classifyResponse = await this.apiCall('/classify-clauses', 'POST');
            
            // Step 2: Generate embeddings
            this.updateProgress(progressMsg, 70, "Generating embeddings");
            const embedResponse = await this.apiCall('/generate-embeddings', 'POST');
            
            this.updateProgress(progressMsg, 100, "Complete");
            
            this.addMessage(`✅ Embeddings generated successfully!\n\n📈 Summary:\n• Clauses classified: ${classifyResponse.processed}\n• Embeddings created: ${embedResponse.processed}\n• Model: mxbai-embed-large\n• Ready for similarity search and analysis`);
            
        } catch (error) {
            this.addMessage(`❌ Error generating embeddings: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async handleFullWorkflow() {
        if (this.urls.length === 0) {
            this.addMessage("Please add some URLs first for the complete workflow.");
            return;
        }

        this.addMessage("🚀 Starting complete workflow...");
        
        try {
            await this.handleScrapeUrls();
            await this.delay(1000);
            await this.handleProcessPdfs();
            await this.delay(1000);
            await this.handleGenerateEmbeddings();
            
            this.addMessage("🎉 Complete workflow finished! Your documents are now scraped, processed, classified, and embedded. Ready for analysis!");
            
        } catch (error) {
            this.addMessage(`❌ Workflow failed: ${error.message}`);
        }
    }

    async handleShowStatus() {
        this.showLoading(true);
        
        try {
            const response = await this.apiCall('/status');
            
            const status = `
                📊 <strong>System Status</strong><br><br>
                
                <strong>📁 Files:</strong><br>
                • Raw docs: ${response.files.raw_docs} files<br>
                • Combined docs: ${response.files.combined_docs} files<br>
                • Cleaned docs: ${response.files.cleaned_docs} files<br>
                • Clauses: ${response.files.clauses} items<br>
                • Metadata: ${response.files.metadata} JSON files<br><br>
                
                <strong>🔧 Models:</strong><br>
                • Classification: ${response.models.llama}<br>
                • Embeddings: ${response.models.embedding}<br><br>
                
                <strong>📊 Queue Status:</strong><br>
                • URLs pending: ${this.urls.length}<br>
                • Files pending: ${this.files.length}<br><br>
                
                <strong>⚡ Last Updated:</strong><br>
                ${new Date(response.timestamp).toLocaleString()}
            `;
            
            this.addMessage(status, false, 'html');
            
        } catch (error) {
            this.addMessage(`❌ Error fetching status: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async handleClearData() {
        const confirmed = confirm("⚠️ Are you sure you want to clear all processed data?\n\nThis will remove:\n• Scraped documents\n• Processed clauses\n• Generated embeddings\n• Classification metadata");
        
        if (!confirmed) return;
        
        this.showLoading(true);
        
        try {
            const response = await this.apiCall('/clear', 'POST');
            
            if (response.success) {
                this.addMessage("✅ All data cleared successfully!");
                this.urls = [];
                this.files = [];
            } else {
                this.addMessage(`❌ Error clearing data: ${response.error}`);
            }
            
        } catch (error) {
            this.addMessage(`❌ Error clearing data: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    showHelp() {
        const help = `
            🤖 <strong>Document Scraper Bot Help</strong><br><br>
            
            <strong>Quick Commands:</strong><br>
            • "Scrape URLs" - Process web content<br>
            • "Process PDFs" - Extract and clean PDF text<br>
            • "Generate embeddings" - Create vector representations<br>
            • "Full workflow" - Complete end-to-end processing<br>
            • "Show status" - View system information<br>
            • "Clear data" - Remove all processed files<br><br>
            
            <strong>File Operations:</strong><br>
            • Use 📎 to attach URLs or files<br>
            • Supported: PDF, TXT, URLs<br>
            • Batch processing available<br><br>
            
            <strong>Settings:</strong><br>
            • Click ⚙️ to configure models<br>
            • Adjust output folders<br>
            • Toggle auto-processing<br><br>
            
            <strong>API Status:</strong><br>
            • Backend: Flask server on port 5000<br>
            • Models: Ollama (Llama 3.1 + MXBai)<br>
            • Real-time processing with progress tracking
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
            if (url && url.startsWith('http')) {
                bot.urls.push(url);
                bot.addMessage(`📎 URL added: ${url}`, true);
                bot.addMessage(`URL added to scraping queue. You now have ${bot.urls.length} URL(s) ready to process.`);
            } else if (url) {
                bot.addMessage("❌ Please enter a valid URL starting with http:// or https://");
            }
            break;
            
        case 'pdf':
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.pdf';
            input.multiple = true;
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    bot.files.push(file);
                    bot.addMessage(`📎 PDF uploaded: ${file.name} (${(file.size/1024/1024).toFixed(1)}MB)`, true);
                });
                if (files.length > 0) {
                    bot.addMessage(`${files.length} PDF file(s) added. Ready for processing.`);
                }
            };
            input.click();
            break;
            
        case 'text':
            const textInput = document.createElement('input');
            textInput.type = 'file';
            textInput.accept = '.txt,.md';
            textInput.multiple = true;
            textInput.onchange = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    bot.files.push(file);
                    bot.addMessage(`📎 Text file uploaded: ${file.name}`, true);
                });
                if (files.length > 0) {
                    bot.addMessage(`${files.length} text file(s) added. Ready for processing.`);
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

// Add a quick action for full workflow
document.addEventListener('DOMContentLoaded', function() {
    const quickActions = document.querySelector('.quick-actions');
    const fullWorkflowBtn = document.createElement('button');
    fullWorkflowBtn.className = 'quick-btn';
    fullWorkflowBtn.onclick = () => sendQuickMessage('Full workflow');
    fullWorkflowBtn.innerHTML = '<i class="fas fa-play-circle"></i> Full Workflow';
    quickActions.appendChild(fullWorkflowBtn);
});