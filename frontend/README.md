# Document Scraper WhatsApp-Like Frontend

A modern, WhatsApp-inspired chat interface for your document scraping and processing workflow.

## Features

- 🎨 **WhatsApp-like UI** - Familiar chat interface with smooth animations
- 🔍 **Web Scraping** - Extract content from URLs
- 📄 **PDF Processing** - Convert PDFs to text and extract clauses
- 🏷️ **AI Classification** - Classify content using Llama 3.1
- 🔗 **Embeddings** - Generate vector embeddings with MXBai
- 📊 **Real-time Progress** - Track processing with live progress bars
- ⚡ **Quick Actions** - One-click access to common tasks

## Setup

### Prerequisites

1. **Python 3.8+** with the following packages:
   ```bash
   pip install flask flask-cors requests beautifulsoup4 pdfplumber textstat
   ```

2. **Ollama** running locally with models:
   ```bash
   ollama pull llama3.1
   ollama pull mxbai-embed-large
   ```

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd d:\projects\hackathon\frontend
   ```

2. Start the Flask backend:
   ```bash
   python app.py
   ```

3. Open `index.html` in your browser or serve it:
   ```bash
   # Option 1: Direct file
   start index.html
   
   # Option 2: Python HTTP server
   python -m http.server 8000
   # Then visit: http://localhost:8000
   ```

## Usage

### Quick Start

1. **Add URLs**: Click the 📎 paperclip icon → "Add URL" → Enter URL
2. **Start Scraping**: Click "Scrape URLs" or type "scrape URLs"
3. **Process Content**: Use quick action buttons or type commands
4. **View Status**: Click "Status" to see system information

### Available Commands

Type these in the chat:

- `scrape URLs` - Start web scraping
- `process PDFs` - Extract and clean PDF content
- `generate embeddings` - Create vector embeddings
- `full workflow` - Run complete end-to-end process
- `show status` - Display system statistics
- `clear data` - Remove all processed files
- `help` - Show detailed help

### Quick Actions

Use the buttons below the chat:
- 🌐 **Scrape URLs** - Process web content
- 📄 **Process PDFs** - Handle PDF documents
- 🔗 **Embeddings** - Generate vectors
- 📊 **Status** - View system info

### File Attachments

Click the 📎 icon to:
- Add URLs for scraping
- Upload PDF files
- Upload text files

## Architecture

```
frontend/
├── index.html          # Main UI
├── style.css           # WhatsApp-like styling
├── script.js           # Basic frontend logic
├── script_enhanced.js  # Full API integration
├── app.py             # Flask backend server
└── README.md          # This file
```

### Backend API Endpoints

- `POST /api/scrape` - Scrape URLs
- `POST /api/process-pdfs` - Process PDF files
- `POST /api/clean-docs` - Clean documents
- `POST /api/split-clauses` - Split into clauses
- `POST /api/classify-clauses` - Classify content
- `POST /api/generate-embeddings` - Create embeddings
- `GET /api/status` - Get system status
- `POST /api/clear` - Clear all data

## Workflow

### Complete Processing Pipeline

1. **Scrape** → Extract content from URLs
2. **Process** → Clean and normalize text
3. **Split** → Break into individual clauses
4. **Classify** → Tag with AI (Llama 3.1)
5. **Embed** → Generate vectors (MXBai)

### Output Folders

- `raw_docs_scraped/` - Original scraped content
- `raw_docs_combined/` - Combined documents
- `cleaned_docs/` - Cleaned text files
- `clauses/` - Individual clause files
- `metadata/` - JSON files with classifications and embeddings

## Customization

### Settings Panel

Click the ⚙️ gear icon to configure:
- **Model**: Choose AI model
- **Output Folder**: Set save location
- **Auto-process**: Enable automatic processing

### Styling

Edit `style.css` to customize:
- Colors and themes
- Layout and spacing
- Animations and transitions

## Troubleshooting

### Backend Not Connecting

1. Ensure Flask is running: `python app.py`
2. Check console for errors
3. Verify port 5000 is available

### Ollama Errors

1. Start Ollama service
2. Verify models are installed:
   ```bash
   ollama list
   ```
3. Test models:
   ```bash
   ollama run llama3.1 "test"
   ```

### No Files Processing

1. Check folder permissions
2. Verify input files exist
3. Check Flask console for errors

## Tips

- **Batch Processing**: Add multiple URLs before scraping
- **Progress Tracking**: Watch real-time progress bars
- **Status Checks**: Use "show status" frequently
- **Clear Data**: Clean up between runs with "clear data"

## Technologies

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Flask (Python)
- **AI Models**: Ollama (Llama 3.1, MXBai)
- **Libraries**: BeautifulSoup, PDFPlumber, TextStat

## License

Part of the hackathon project.

## Support

For issues or questions, check the Flask console logs and browser console for detailed error messages.