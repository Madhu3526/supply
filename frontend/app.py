from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import json
import uuid
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import pdfplumber
import textstat
import re
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configuration
SAVE_FOLDER = "raw_docs_scraped"
COMBINED_FOLDER = "raw_docs_combined"
CLEANED_FOLDER = "cleaned_docs"
CLAUSE_FOLDER = "clauses"
METADATA_FOLDER = "metadata"

OLLAMA_URL = "http://localhost:11434/api/generate"
EMBED_URL = "http://localhost:11434/api/embed"
MODEL = "llama3.1"
EMBED_MODEL = "mxbai-embed-large"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# Ensure directories exist
for folder in [SAVE_FOLDER, COMBINED_FOLDER, CLEANED_FOLDER, CLAUSE_FOLDER, METADATA_FOLDER]:
    os.makedirs(folder, exist_ok=True)

def sanitize_filename(url):
    parsed = urlparse(url)
    safe = parsed.netloc + parsed.path.replace("/", "_").replace("?", "_")
    return safe if safe else str(uuid.uuid4())

def scrape_url(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=20)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        for tag in soup(["script", "style", "nav", "header", "footer", "img"]):
            tag.decompose()
        
        text = soup.get_text(separator="\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned = "\n".join(lines)
        
        filename = sanitize_filename(url) + ".txt"
        path = os.path.join(SAVE_FOLDER, filename)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(cleaned)
        
        return {"success": True, "filename": filename, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}

def process_pdf(file_path):
    try:
        text = ""
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        
        filename = os.path.basename(file_path).replace(".pdf", ".txt")
        output_path = os.path.join(COMBINED_FOLDER, filename)
        
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        
        return {"success": True, "filename": filename, "path": output_path}
    except Exception as e:
        return {"success": False, "error": str(e)}

def clean_text(text):
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"Page \d+ of \d+", "", text)
    text = re.sub(r"©.*?\n", "", text)
    text = text.replace("•", "- ")
    return text.strip()

def split_into_clauses(text):
    patterns = [
        r"\.\s",
        r";\s",
        r"\n-\s",
        r"\n\d+\.\s",
        r"\n\([a-z]\)\s",
    ]
    
    regex = "|".join(patterns)
    parts = re.split(regex, text)
    clauses = [p.strip() for p in parts if len(p.strip()) > 20]
    return clauses

def classify_clause(clause_text):
    prompt = f"""
You are a legal-logistics contract classifier.

Classify the following clause into:

1. category 
   (SLA, Pricing, Penalty, Liability, Force Majeure, Termination, 
    Confidentiality, Dispute Resolution, Definitions, Exceptions)

2. risk_type 
   (delay, damage, weather, compliance, payment, general)

3. conditions 
   (comma-separated conditions like monsoon, peak hours, fragile, temperature-controlled)

4. jurisdiction 
   (India, Global, or Unknown)

5. summary 
   (1-line description)

Return the output as STRICT JSON only.

Clause:
"{clause_text}"
"""
    
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    }
    
    try:
        response = requests.post(OLLAMA_URL, json=payload)
        result = response.json()["response"]
        
        json_start = result.find("{")
        json_end = result.rfind("}") + 1
        metadata = json.loads(result[json_start:json_end])
        
        return metadata
    except Exception as e:
        return None

def generate_embedding(text):
    try:
        response = requests.post(EMBED_URL, json={
            "model": EMBED_MODEL,
            "input": text
        })
        return response.json()["embeddings"][0]
    except Exception as e:
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scrape', methods=['POST'])
def api_scrape():
    data = request.json
    urls = data.get('urls', [])
    
    results = []
    for url in urls:
        result = scrape_url(url)
        results.append({"url": url, **result})
    
    return jsonify({"results": results})

@app.route('/api/process-pdfs', methods=['POST'])
def api_process_pdfs():
    # This would handle uploaded PDF files
    # For now, simulate processing existing PDFs
    pdf_folder = "raw_pdfs"
    results = []
    
    if os.path.exists(pdf_folder):
        for file in os.listdir(pdf_folder):
            if file.endswith(".pdf"):
                path = os.path.join(pdf_folder, file)
                result = process_pdf(path)
                results.append({"file": file, **result})
    
    return jsonify({"results": results})

@app.route('/api/clean-docs', methods=['POST'])
def api_clean_docs():
    results = []
    
    for file in os.listdir(COMBINED_FOLDER):
        if file.endswith(".txt"):
            input_path = os.path.join(COMBINED_FOLDER, file)
            output_path = os.path.join(CLEANED_FOLDER, file)
            
            try:
                with open(input_path, "r", encoding="utf-8") as f:
                    text = f.read()
                
                cleaned = clean_text(text)
                
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(cleaned)
                
                results.append({"file": file, "success": True})
            except Exception as e:
                results.append({"file": file, "success": False, "error": str(e)})
    
    return jsonify({"results": results})

@app.route('/api/split-clauses', methods=['POST'])
def api_split_clauses():
    results = []
    total_clauses = 0
    
    for file in os.listdir(CLEANED_FOLDER):
        if file.endswith(".txt"):
            path = os.path.join(CLEANED_FOLDER, file)
            
            try:
                with open(path, "r", encoding="utf-8") as f:
                    text = f.read()
                
                clauses = split_into_clauses(text)
                
                for clause in clauses:
                    clause_id = str(uuid.uuid4())
                    clause_path = os.path.join(CLAUSE_FOLDER, clause_id + ".txt")
                    
                    with open(clause_path, "w", encoding="utf-8") as f:
                        f.write(clause)
                    
                    total_clauses += 1
                
                results.append({"file": file, "clauses": len(clauses), "success": True})
            except Exception as e:
                results.append({"file": file, "success": False, "error": str(e)})
    
    return jsonify({"results": results, "total_clauses": total_clauses})

@app.route('/api/classify-clauses', methods=['POST'])
def api_classify_clauses():
    results = []
    processed = 0
    
    for file in os.listdir(CLAUSE_FOLDER):
        if file.endswith(".txt"):
            clause_path = os.path.join(CLAUSE_FOLDER, file)
            
            try:
                with open(clause_path, "r", encoding="utf-8") as f:
                    clause_text = f.read().strip()
                
                clause_id = file.replace(".txt", "")
                metadata = classify_clause(clause_text)
                
                if metadata:
                    metadata["clause_id"] = clause_id
                    metadata["text"] = clause_text
                    metadata["flesch_score"] = textstat.flesch_reading_ease(clause_text)
                    metadata["industry"] = "Logistics"
                    metadata["timestamp"] = datetime.now().isoformat()
                    
                    output_path = os.path.join(METADATA_FOLDER, clause_id + ".json")
                    with open(output_path, "w", encoding="utf-8") as f:
                        json.dump(metadata, f, indent=4)
                    
                    processed += 1
                    results.append({"clause_id": clause_id, "success": True})
                else:
                    results.append({"clause_id": clause_id, "success": False, "error": "Classification failed"})
                    
            except Exception as e:
                results.append({"clause_id": file, "success": False, "error": str(e)})
    
    return jsonify({"results": results, "processed": processed})

@app.route('/api/generate-embeddings', methods=['POST'])
def api_generate_embeddings():
    results = []
    processed = 0
    
    for file in os.listdir(METADATA_FOLDER):
        if file.endswith(".json"):
            metadata_path = os.path.join(METADATA_FOLDER, file)
            
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                
                text = metadata.get("text", "")
                embedding = generate_embedding(text)
                
                if embedding:
                    metadata["embedding"] = embedding
                    metadata["embedding_model"] = EMBED_MODEL
                    metadata["embedding_timestamp"] = datetime.now().isoformat()
                    
                    with open(metadata_path, "w", encoding="utf-8") as f:
                        json.dump(metadata, f, indent=4)
                    
                    processed += 1
                    results.append({"file": file, "success": True})
                else:
                    results.append({"file": file, "success": False, "error": "Embedding generation failed"})
                    
            except Exception as e:
                results.append({"file": file, "success": False, "error": str(e)})
    
    return jsonify({"results": results, "processed": processed})

@app.route('/api/status', methods=['GET'])
def api_status():
    status = {
        "files": {
            "raw_docs": len([f for f in os.listdir(SAVE_FOLDER) if f.endswith('.txt')]) if os.path.exists(SAVE_FOLDER) else 0,
            "combined_docs": len([f for f in os.listdir(COMBINED_FOLDER) if f.endswith('.txt')]) if os.path.exists(COMBINED_FOLDER) else 0,
            "cleaned_docs": len([f for f in os.listdir(CLEANED_FOLDER) if f.endswith('.txt')]) if os.path.exists(CLEANED_FOLDER) else 0,
            "clauses": len([f for f in os.listdir(CLAUSE_FOLDER) if f.endswith('.txt')]) if os.path.exists(CLAUSE_FOLDER) else 0,
            "metadata": len([f for f in os.listdir(METADATA_FOLDER) if f.endswith('.json')]) if os.path.exists(METADATA_FOLDER) else 0,
        },
        "models": {
            "llama": MODEL,
            "embedding": EMBED_MODEL
        },
        "timestamp": datetime.now().isoformat()
    }
    
    return jsonify(status)

@app.route('/api/clear', methods=['POST'])
def api_clear():
    try:
        folders_to_clear = [SAVE_FOLDER, COMBINED_FOLDER, CLEANED_FOLDER, CLAUSE_FOLDER, METADATA_FOLDER]
        
        for folder in folders_to_clear:
            if os.path.exists(folder):
                for file in os.listdir(folder):
                    file_path = os.path.join(folder, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
        
        return jsonify({"success": True, "message": "All data cleared successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5000)