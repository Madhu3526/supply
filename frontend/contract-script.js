class ContractAI {
    constructor() {
        this.currentTab = 'ner';
        this.currentSection = 'query';
        this.contractData = null;
        this.apiBase = 'http://localhost:5001/api';
    }

    showTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');
        document.getElementById(`${tabName}-content`).classList.add('active');
        
        this.currentTab = tabName;
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        
        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.add('active');
        document.querySelector(`[onclick="showSection('${sectionName}')"]`).classList.add('active');
        
        this.currentSection = sectionName;
        
        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        switch(sectionName) {
            case 'history':
                await this.loadHistory();
                break;
            case 'contract':
                await this.loadContracts();
                break;
            case 'settings':
                await this.loadSettings();
                break;
        }
    }

    async startNegotiation() {
        const topic = document.getElementById('negotiationTopic').value.trim();
        if (!topic) {
            this.showNotification('Please enter a negotiation topic', 'error');
            return;
        }

        this.showLoading(true);
        try {
            const response = await this.apiCall('/analyze', 'POST', { query: `Negotiate ${topic}` });
            
            const results = `
                <h3>Negotiation Analysis: ${topic}</h3>
                <div class="negotiation-points">
                    <h4>Key Points:</h4>
                    <ul>
                        ${response.negotiation_result.key_points.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                    <h4>Recommendations:</h4>
                    <ul>
                        ${response.negotiation_result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                    <p><strong>Risk Assessment:</strong> ${response.negotiation_result.risk_assessment}</p>
                </div>
            `;
            
            document.getElementById('negotiationResults').innerHTML = results;
            this.showNotification('Negotiation analysis complete!', 'success');
            
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async searchClauses() {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (!searchTerm) {
            this.showNotification('Please enter a search term', 'error');
            return;
        }

        this.showLoading(true);
        try {
            const response = await this.apiCall('/clauses/search', 'POST', { search_term: searchTerm });
            
            let resultsHTML = `<h3>Search Results for "${searchTerm}"</h3>`;
            
            if (response.results.length === 0) {
                resultsHTML += '<p>No clauses found matching your search.</p>';
            } else {
                resultsHTML += '<div class="search-results">';
                response.results.forEach(result => {
                    resultsHTML += `
                        <div class="clause-result">
                            <h4>${result.category} (Score: ${(result.relevance_score * 100).toFixed(0)}%)</h4>
                            <p>${result.text}</p>
                            <small>Risk Type: ${result.risk_type}</small>
                        </div>
                    `;
                });
                resultsHTML += '</div>';
            }
            
            document.getElementById('searchResults').innerHTML = resultsHTML;
            this.showNotification(`Found ${response.results.length} matching clauses`, 'success');
            
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadContracts() {
        const contractsHTML = `
            <div class="contract-item">
                <h4>Logistics Service Agreement</h4>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
                <small>42 pages • Penalty clauses included</small>
            </div>
            <div class="contract-item">
                <h4>Delivery Terms Contract</h4>
                <p>Generated on ${new Date(Date.now() - 86400000).toLocaleDateString()}</p>
                <small>38 pages • SLA terms included</small>
            </div>
        `;
        
        document.getElementById('contractList').innerHTML = contractsHTML;
    }

    async loadHistory() {
        try {
            const response = await this.apiCall('/history');
            
            let historyHTML = '';
            response.history.forEach(item => {
                historyHTML += `
                    <div class="history-item" onclick="loadHistoryItem('${item.id}')">
                        <h4>${item.query}</h4>
                        <p>Entities: ${item.entities_found} • Status: ${item.status}</p>
                        <small>${new Date(item.timestamp).toLocaleString()}</small>
                    </div>
                `;
            });
            
            document.getElementById('historyList').innerHTML = historyHTML;
            
        } catch (error) {
            document.getElementById('historyList').innerHTML = '<p>Error loading history</p>';
        }
    }

    async saveSettings() {
        const settings = {
            model: document.getElementById('modelSelect').value,
            language: document.getElementById('languageSelect').value,
            autoSave: document.getElementById('autoSave').checked
        };
        
        try {
            await this.apiCall('/settings', 'POST', settings);
            this.showNotification('Settings saved successfully!', 'success');
        } catch (error) {
            this.showNotification(`Error saving settings: ${error.message}`, 'error');
        }
    }

    showLoading(show = true) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
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
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    async analyzeQuery() {
        const query = document.getElementById('queryInput').value.trim();
        if (!query) {
            alert('Please enter a query first.');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiCall('/analyze', 'POST', { query });
            
            // Update NER results
            document.getElementById('nerResult').textContent = JSON.stringify(response.ner_result, null, 2);
            
            // Update clause results
            if (response.clause_result) {
                document.getElementById('clauseResult').textContent = JSON.stringify(response.clause_result, null, 2);
            } else {
                document.getElementById('clauseResult').textContent = 'No relevant clauses found.';
            }
            
            // Update negotiation results
            document.getElementById('negotiationResult').textContent = JSON.stringify(response.negotiation_result, null, 2);
            
            // Update final answer
            document.getElementById('answerResult').textContent = JSON.stringify(response.answer_result, null, 2);
            
            // Store contract data
            this.contractData = response.contract_text;
            
            // Show success message
            this.showNotification('Analysis complete! Check the tabs for results.', 'success');

        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async previewContract() {
        if (!this.contractData) {
            alert('No contract generated yet. Please analyze a query first.');
            return;
        }

        try {
            const response = await this.apiCall('/contract/preview', 'POST', { 
                contract_text: this.contractData 
            });
            
            document.getElementById('contractPreview').innerHTML = `<pre>${response.contract}</pre>`;
            document.getElementById('contractModal').style.display = 'block';
            
        } catch (error) {
            this.showNotification(`Error previewing contract: ${error.message}`, 'error');
        }
    }

    closeModal() {
        document.getElementById('contractModal').style.display = 'none';
    }

    async copyContract() {
        if (!this.contractData) return;
        
        try {
            await navigator.clipboard.writeText(this.contractData);
            this.showNotification('Contract copied to clipboard!', 'success');
        } catch (error) {
            this.showNotification('Failed to copy contract.', 'error');
        }
    }

    downloadPDF() {
        if (!this.contractData) return;
        
        // Create a blob with the contract content
        const blob = new Blob([this.contractData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `contract_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Contract downloaded successfully!', 'success');
    }

    async loadHistory() {
        try {
            const response = await this.apiCall('/history');
            console.log('History loaded:', response.history);
            // Update UI with history data
        } catch (error) {
            this.showNotification(`Error loading history: ${error.message}`, 'error');
        }
    }

    async searchClauses(searchTerm) {
        try {
            const response = await this.apiCall('/clauses/search', 'POST', { search_term: searchTerm });
            console.log('Search results:', response.results);
            // Update UI with search results
        } catch (error) {
            this.showNotification(`Error searching clauses: ${error.message}`, 'error');
        }
    }

    async loadSettings() {
        try {
            const response = await this.apiCall('/settings');
            console.log('Settings loaded:', response);
            // Update settings UI
        } catch (error) {
            this.showNotification(`Error loading settings: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 3000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    toggleSettings() {
        this.loadSettings();
        this.showNotification('Settings panel - Feature coming soon!', 'info');
    }

    // Initialize the app
    init() {
        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Test backend connection
        this.testConnection();
    }

    async testConnection() {
        try {
            await this.apiCall('/settings');
            this.showNotification('Backend connected successfully!', 'success');
        } catch (error) {
            this.showNotification('Backend connection failed. Please start the Flask server.', 'error');
        }
    }
}

// Initialize the application
const contractAI = new ContractAI();

// Global functions for HTML onclick events
function showTab(tabName) {
    contractAI.showTab(tabName);
}

function showSection(sectionName) {
    contractAI.showSection(sectionName);
}

function startNegotiation() {
    contractAI.startNegotiation();
}

function searchClauses() {
    contractAI.searchClauses();
}

function saveSettings() {
    contractAI.saveSettings();
}

function loadHistoryItem(itemId) {
    contractAI.showNotification(`Loading history item: ${itemId}`, 'info');
}

function analyzeQuery() {
    contractAI.analyzeQuery();
}

function previewContract() {
    contractAI.previewContract();
}

function closeModal() {
    contractAI.closeModal();
}

function copyContract() {
    contractAI.copyContract();
}

function downloadPDF() {
    contractAI.downloadPDF();
}

function toggleSettings() {
    contractAI.toggleSettings();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('contractModal');
    if (event.target === modal) {
        contractAI.closeModal();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    contractAI.init();
});