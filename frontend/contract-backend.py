from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import json
import uuid
import requests
import spacy
from datetime import datetime
import re

app = Flask(__name__)
CORS(app)

# Configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
EMBED_URL = "http://localhost:11434/api/embed"
MODEL = "llama3.1"
EMBED_MODEL = "mxbai-embed-large"

# Load spaCy model for NER
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("spaCy model not found. Install with: python -m spacy download en_core_web_sm")
    nlp = None

# Contract templates and clauses
CONTRACT_CLAUSES = {
    "penalty": {
        "text": "In case of delivery delays exceeding 24 hours, the service provider shall pay a penalty of 2% of the total contract value for each day of delay.",
        "category": "Penalty",
        "risk_type": "delay"
    },
    "sla": {
        "text": "Provider commits to achieving 95% on-time delivery rate and maintaining a damage rate below 0.5% of total shipments.",
        "category": "SLA",
        "risk_type": "performance"
    },
    "liability": {
        "text": "Provider's liability for any single incident shall not exceed the value of the affected shipment.",
        "category": "Liability",
        "risk_type": "damage"
    }
}

def extract_entities(text):
    """Extract named entities from text using spaCy"""
    if not nlp:
        return []
    
    doc = nlp(text)
    entities = []
    
    for ent in doc.ents:
        entities.append({
            "text": ent.text,
            "label": ent.label_,
            "start": ent.start_char,
            "end": ent.end_char,
            "description": spacy.explain(ent.label_)
        })
    
    # Add custom contract-specific entities
    contract_keywords = {
        "penalty": "PENALTY",
        "delay": "RISK_FACTOR", 
        "delivery": "SERVICE_TYPE",
        "sla": "SLA",
        "surcharge": "FEE",
        "agreement": "CONTRACT_TYPE"
    }
    
    text_lower = text.lower()
    for keyword, label in contract_keywords.items():
        if keyword in text_lower:
            start = text_lower.find(keyword)
            entities.append({
                "text": keyword,
                "label": label,
                "start": start,
                "end": start + len(keyword),
                "description": f"Contract-specific {label}"
            })
    
    return entities

def find_relevant_clauses(query):
    """Find relevant contract clauses based on query"""
    query_lower = query.lower()
    relevant = []
    
    for clause_id, clause_data in CONTRACT_CLAUSES.items():
        score = 0
        if clause_id in query_lower:
            score += 0.8
        if clause_data["category"].lower() in query_lower:
            score += 0.6
        if clause_data["risk_type"] in query_lower:
            score += 0.4
            
        if score > 0:
            relevant.append({
                "clause_id": clause_id,
                "score": score,
                **clause_data
            })
    
    return sorted(relevant, key=lambda x: x["score"], reverse=True)

def generate_negotiation_summary(query, clauses):
    """Generate negotiation points based on query and clauses"""
    summary = {
        "key_points": [],
        "recommendations": [],
        "risk_assessment": "Medium"
    }
    
    query_lower = query.lower()
    
    if "penalty" in query_lower:
        summary["key_points"].extend([
            "Penalty rate: 2% per day",
            "Grace period: 24 hours",
            "Maximum penalty cap needed"
        ])
        summary["recommendations"].extend([
            "Consider reducing penalty rate to 1.5%",
            "Extend grace period to 48 hours for weather delays"
        ])
    
    if "delay" in query_lower:
        summary["key_points"].append("Delay tolerance: 24 hours")
        summary["recommendations"].append("Define force majeure exceptions")
    
    if "sla" in query_lower:
        summary["key_points"].extend([
            "On-time delivery: 95%",
            "Damage rate: <0.5%"
        ])
        summary["recommendations"].append("Include performance bonuses for exceeding SLA")
    
    return summary

def generate_contract(query, entities, clauses):
    """Generate a full contract based on analysis"""
    contract_template = f"""
LOGISTICS SERVICE AGREEMENT

This Logistics Service Agreement ("Agreement") is entered into on {datetime.now().strftime('%B %d, %Y')} between [CLIENT NAME] ("Client") and [SERVICE PROVIDER] ("Provider").

RECITALS
WHEREAS, Client requires logistics and delivery services; and
WHEREAS, Provider has the capability and expertise to provide such services;

NOW, THEREFORE, the parties agree as follows:

1. SCOPE OF SERVICES
Provider shall provide the following services:
- Transportation and delivery of goods
- Warehousing and storage services
- Supply chain management
- Customer support and tracking

2. DELIVERY TERMS AND CONDITIONS
2.1 Standard Delivery: Provider shall deliver goods within agreed timeframes
2.2 Service Areas: Services provided within designated geographic regions
2.3 Proof of Delivery: Electronic confirmation required for all deliveries

3. PENALTIES AND SERVICE LEVEL AGREEMENTS
"""
    
    # Add relevant clauses
    for clause in clauses[:3]:  # Top 3 relevant clauses
        contract_template += f"\n3.{len(clauses)} {clause['category']}: {clause['text']}\n"
    
    contract_template += """
4. PRICING AND PAYMENT
4.1 Service Fees: As specified in Schedule A
4.2 Fuel Surcharges: Applied based on current fuel prices
4.3 Payment Terms: Net 30 days from invoice date

5. LIABILITY AND INSURANCE
5.1 Limitation of Liability: Provider's liability limited to shipment value
5.2 Insurance: Comprehensive coverage maintained by Provider

6. FORCE MAJEURE
Neither party shall be liable for delays caused by circumstances beyond reasonable control.

7. TERMINATION
7.1 Convenience: 30 days written notice
7.2 Cause: Immediate termination for material breach

8. DISPUTE RESOLUTION
Disputes resolved through binding arbitration under [JURISDICTION] law.

9. CONFIDENTIALITY
Both parties maintain confidentiality of proprietary information.

10. ENTIRE AGREEMENT
This Agreement supersedes all prior agreements and constitutes the entire agreement.

IN WITNESS WHEREOF, the parties execute this Agreement.

CLIENT:                    PROVIDER:
_________________         _________________
[Name]                    [Name]
Date: ___________         Date: ___________

[Additional 30+ pages of detailed terms, schedules, and appendices would follow...]
"""
    
    return contract_template.strip()

@app.route('/')
def index():
    return app.send_static_file('contract-index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_query():
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        # 1. NER Analysis
        entities = extract_entities(query)
        
        # 2. Find relevant clauses
        relevant_clauses = find_relevant_clauses(query)
        
        # 3. Generate negotiation summary
        negotiation_summary = generate_negotiation_summary(query, relevant_clauses)
        
        # 4. Generate final answer
        final_answer = {
            "summary": f"Analyzed query about {', '.join([e['text'] for e in entities[:3]])}",
            "entities_found": len(entities),
            "relevant_clauses": len(relevant_clauses),
            "contract_generated": True,
            "confidence": 0.85
        }
        
        # 5. Generate contract
        contract_text = generate_contract(query, entities, relevant_clauses)
        
        return jsonify({
            "ner_result": {
                "entities": entities,
                "query": query,
                "processed_at": datetime.now().isoformat()
            },
            "clause_result": relevant_clauses[0] if relevant_clauses else None,
            "negotiation_result": negotiation_summary,
            "answer_result": final_answer,
            "contract_text": contract_text
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/contract/preview', methods=['POST'])
def preview_contract():
    try:
        data = request.json
        contract_text = data.get('contract_text', '')
        
        if not contract_text:
            return jsonify({"error": "Contract text is required"}), 400
        
        # Return formatted contract for preview
        return jsonify({
            "contract": contract_text,
            "pages": len(contract_text.split('\n')) // 50 + 1,  # Estimate pages
            "word_count": len(contract_text.split()),
            "generated_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    # Mock history data
    history = [
        {
            "id": str(uuid.uuid4()),
            "query": "What are the penalty clauses for delivery delays?",
            "timestamp": "2024-01-15T10:30:00Z",
            "entities_found": 3,
            "contract_generated": True
        },
        {
            "id": str(uuid.uuid4()),
            "query": "SLA requirements for logistics services",
            "timestamp": "2024-01-14T15:45:00Z",
            "entities_found": 5,
            "contract_generated": True
        }
    ]
    
    return jsonify({"history": history})

@app.route('/api/clauses/search', methods=['POST'])
def search_clauses():
    try:
        data = request.json
        search_term = data.get('search_term', '').lower()
        
        results = []
        for clause_id, clause_data in CONTRACT_CLAUSES.items():
            if search_term in clause_data['text'].lower() or search_term in clause_id:
                results.append({
                    "clause_id": clause_id,
                    "relevance_score": 0.8,
                    **clause_data
                })
        
        return jsonify({"results": results})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'GET':
        return jsonify({
            "model": MODEL,
            "embed_model": EMBED_MODEL,
            "ollama_url": OLLAMA_URL,
            "ner_enabled": nlp is not None
        })
    
    # POST - update settings
    try:
        data = request.json
        # In a real app, you'd update configuration here
        return jsonify({"message": "Settings updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)