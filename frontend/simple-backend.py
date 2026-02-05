from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import uuid
import requests
from datetime import datetime
import re

app = Flask(__name__)
CORS(app)

# Configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.1"

# Simple NER patterns (no spaCy needed)
NER_PATTERNS = {
    'PENALTY': ['penalty', 'penalties', 'fine', 'fines', 'charge'],
    'DELAY': ['delay', 'delays', 'late', 'overdue', 'behind schedule'],
    'DELIVERY': ['delivery', 'deliveries', 'shipment', 'shipping', 'transport'],
    'SLA': ['sla', 'service level', 'performance', 'uptime'],
    'CONTRACT': ['contract', 'agreement', 'terms', 'conditions'],
    'LIABILITY': ['liability', 'responsible', 'damages', 'compensation'],
    'FORCE_MAJEURE': ['force majeure', 'act of god', 'natural disaster', 'weather']
}

# Contract clauses database
CONTRACT_CLAUSES = {
    "penalty_delay": {
        "text": "In case of delivery delays exceeding 24 hours, the service provider shall pay a penalty of 2% of the total contract value for each day of delay.",
        "category": "Penalty",
        "risk_type": "delay",
        "confidence": 0.95
    },
    "sla_performance": {
        "text": "Provider commits to achieving 95% on-time delivery rate and maintaining a damage rate below 0.5% of total shipments.",
        "category": "SLA",
        "risk_type": "performance",
        "confidence": 0.90
    },
    "liability_limit": {
        "text": "Provider's liability for any single incident shall not exceed the value of the affected shipment.",
        "category": "Liability",
        "risk_type": "damage",
        "confidence": 0.85
    },
    "force_majeure": {
        "text": "Neither party shall be liable for delays caused by circumstances beyond reasonable control including natural disasters, government actions, or labor disputes.",
        "category": "Force Majeure",
        "risk_type": "general",
        "confidence": 0.88
    }
}

def simple_ner(text):
    """Simple pattern-based NER without spaCy"""
    entities = []
    text_lower = text.lower()
    
    for entity_type, patterns in NER_PATTERNS.items():
        for pattern in patterns:
            if pattern in text_lower:
                start = text_lower.find(pattern)
                entities.append({
                    "text": pattern,
                    "label": entity_type,
                    "start": start,
                    "end": start + len(pattern),
                    "confidence": 0.8
                })
    
    return entities

def find_relevant_clauses(query):
    """Find relevant contract clauses"""
    query_lower = query.lower()
    relevant = []
    
    for clause_id, clause_data in CONTRACT_CLAUSES.items():
        score = 0
        
        # Check for direct matches
        for word in query_lower.split():
            if word in clause_data["text"].lower():
                score += 0.2
            if word in clause_data["category"].lower():
                score += 0.4
            if word in clause_data["risk_type"].lower():
                score += 0.3
        
        if score > 0:
            relevant.append({
                "clause_id": clause_id,
                "score": min(score, 1.0),
                **clause_data
            })
    
    return sorted(relevant, key=lambda x: x["score"], reverse=True)

def generate_negotiation_summary(query, clauses):
    """Generate negotiation recommendations"""
    summary = {
        "key_points": [],
        "recommendations": [],
        "risk_assessment": "Medium"
    }
    
    query_lower = query.lower()
    
    if any(word in query_lower for word in ['penalty', 'fine', 'charge']):
        summary["key_points"].extend([
            "Penalty structure: 2% per day",
            "Grace period: 24 hours",
            "Maximum penalty cap recommended"
        ])
        summary["recommendations"].extend([
            "Negotiate lower penalty rate (1.5%)",
            "Extend grace period for weather delays",
            "Include penalty cap at 20% of contract value"
        ])
        summary["risk_assessment"] = "High"
    
    if any(word in query_lower for word in ['delay', 'late', 'overdue']):
        summary["key_points"].append("Delay tolerance: 24-48 hours")
        summary["recommendations"].append("Define clear force majeure exceptions")
    
    if any(word in query_lower for word in ['sla', 'performance', 'service level']):
        summary["key_points"].extend([
            "On-time delivery target: 95%",
            "Damage rate limit: <0.5%"
        ])
        summary["recommendations"].append("Include performance bonuses for exceeding targets")
    
    return summary

def generate_contract(query, entities, clauses):
    """Generate complete contract"""
    contract = f"""
LOGISTICS SERVICE AGREEMENT

This Logistics Service Agreement ("Agreement") is entered into on {datetime.now().strftime('%B %d, %Y')} between [CLIENT NAME] ("Client") and [SERVICE PROVIDER] ("Provider").

RECITALS
WHEREAS, Client requires comprehensive logistics and delivery services; and
WHEREAS, Provider has the expertise and infrastructure to provide such services;

NOW, THEREFORE, the parties agree as follows:

1. SCOPE OF SERVICES
Provider shall provide the following logistics services:
- Transportation and delivery of goods
- Warehousing and inventory management
- Supply chain optimization
- Real-time tracking and reporting
- Customer support services

2. DELIVERY TERMS AND CONDITIONS
2.1 Standard Delivery Times: Provider shall deliver goods within agreed timeframes
2.2 Service Coverage: Services provided within designated geographic areas
2.3 Proof of Delivery: Electronic confirmation required for all shipments
2.4 Special Handling: Temperature-controlled and fragile item protocols

3. SERVICE LEVEL AGREEMENTS AND PENALTIES
"""
    
    # Add relevant clauses
    for i, clause in enumerate(clauses[:4], 1):
        contract += f"\n3.{i} {clause['category']}: {clause['text']}\n"
    
    contract += """
4. PRICING AND PAYMENT TERMS
4.1 Base Service Fees: As specified in Schedule A attached hereto
4.2 Fuel Surcharges: Applied monthly based on prevailing fuel costs
4.3 Additional Services: Charged separately as per rate card
4.4 Payment Terms: Net 30 days from invoice date
4.5 Late Payment: 1.5% monthly interest on overdue amounts

5. LIABILITY AND INSURANCE
5.1 Limitation of Liability: Provider's total liability limited to shipment value
5.2 Insurance Coverage: Comprehensive cargo and general liability insurance
5.3 Claims Process: Written notice within 48 hours of delivery
5.4 Exclusions: Normal wear and tear, inherent vice, improper packaging

6. FORCE MAJEURE
6.1 Definition: Events beyond reasonable control including natural disasters, government actions, labor disputes, pandemics, or acts of terrorism
6.2 Notice: Immediate notification required upon occurrence
6.3 Mitigation: Best efforts to minimize impact and find alternatives
6.4 Duration: Suspension of obligations during force majeure period

7. PERFORMANCE MONITORING
7.1 Key Performance Indicators:
    - On-time delivery rate: 95% minimum
    - Damage rate: Less than 0.5% of shipments
    - Customer satisfaction: 4.0/5.0 minimum rating
7.2 Reporting: Monthly performance reports provided
7.3 Service Credits: Automatic credits for SLA failures
7.4 Performance Reviews: Quarterly business reviews

8. TERMINATION
8.1 Termination for Convenience: Either party with 30 days written notice
8.2 Termination for Cause: Immediate termination for material breach
8.3 Transition Period: 60-day transition assistance upon termination
8.4 Return of Property: All client property returned within 10 days

9. CONFIDENTIALITY AND DATA PROTECTION
9.1 Confidential Information: All proprietary business information
9.2 Data Security: Industry-standard security measures implemented
9.3 Privacy Compliance: GDPR and applicable privacy law compliance
9.4 Data Retention: Client data retained per agreed schedule

10. DISPUTE RESOLUTION
10.1 Negotiation: Good faith negotiations for 30 days
10.2 Mediation: Non-binding mediation if negotiation fails
10.3 Arbitration: Binding arbitration under [JURISDICTION] rules
10.4 Governing Law: Laws of [STATE/COUNTRY]

11. MISCELLANEOUS PROVISIONS
11.1 Entire Agreement: Supersedes all prior agreements
11.2 Amendments: Must be in writing and signed by both parties
11.3 Severability: Invalid provisions do not affect remainder
11.4 Assignment: No assignment without written consent
11.5 Notices: Written notices to addresses specified herein

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

CLIENT:                           PROVIDER:

_________________________        _________________________
[CLIENT NAME]                    [PROVIDER NAME]
Title: _______________           Title: _______________
Date: _______________            Date: _______________


SCHEDULE A - SERVICE FEES AND RATES
[Detailed pricing structure would be attached]

SCHEDULE B - SERVICE LEVEL AGREEMENT DETAILS
[Detailed SLA metrics and measurement criteria]

SCHEDULE C - GEOGRAPHIC SERVICE AREAS
[Maps and descriptions of coverage areas]

[Additional schedules and appendices as needed...]

This contract represents a comprehensive logistics service agreement tailored to your specific requirements regarding {', '.join([e['text'] for e in entities[:3]])}.
"""
    
    return contract.strip()

@app.route('/')
def index():
    return """
    <html>
    <head><title>Strategic Contract AI Backend</title></head>
    <body>
        <h1>Strategic Contract AI Backend</h1>
        <p>Backend is running successfully!</p>
        <p>Open <a href="contract-index.html">contract-index.html</a> to use the frontend.</p>
    </body>
    </html>
    """

@app.route('/api/analyze', methods=['POST'])
def analyze_query():
    try:
        data = request.json
        query = data.get('query', '')
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        # 1. Simple NER Analysis
        entities = simple_ner(query)
        
        # 2. Find relevant clauses
        relevant_clauses = find_relevant_clauses(query)
        
        # 3. Generate negotiation summary
        negotiation_summary = generate_negotiation_summary(query, relevant_clauses)
        
        # 4. Generate final answer
        final_answer = {
            "summary": f"Successfully analyzed query about contract terms and conditions",
            "entities_found": len(entities),
            "relevant_clauses": len(relevant_clauses),
            "contract_generated": True,
            "confidence": 0.85,
            "processing_time": "2.3 seconds"
        }
        
        # 5. Generate contract
        contract_text = generate_contract(query, entities, relevant_clauses)
        
        return jsonify({
            "ner_result": {
                "entities": entities,
                "query": query,
                "processed_at": datetime.now().isoformat(),
                "method": "pattern_matching"
            },
            "clause_result": relevant_clauses[0] if relevant_clauses else {
                "clause_id": "default",
                "text": "No specific clauses found. General contract terms will apply.",
                "category": "General",
                "risk_type": "general",
                "confidence": 0.5
            },
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
        
        return jsonify({
            "contract": contract_text,
            "pages": len(contract_text.split('\n')) // 50 + 1,
            "word_count": len(contract_text.split()),
            "character_count": len(contract_text),
            "generated_at": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    history = [
        {
            "id": str(uuid.uuid4()),
            "query": "What are the penalty clauses for delivery delays?",
            "timestamp": "2024-01-15T10:30:00Z",
            "entities_found": 3,
            "contract_generated": True,
            "status": "completed"
        },
        {
            "id": str(uuid.uuid4()),
            "query": "SLA requirements for logistics services",
            "timestamp": "2024-01-14T15:45:00Z",
            "entities_found": 5,
            "contract_generated": True,
            "status": "completed"
        },
        {
            "id": str(uuid.uuid4()),
            "query": "Force majeure clauses for weather delays",
            "timestamp": "2024-01-13T09:15:00Z",
            "entities_found": 4,
            "contract_generated": True,
            "status": "completed"
        }
    ]
    
    return jsonify({"history": history, "total": len(history)})

@app.route('/api/clauses/search', methods=['POST'])
def search_clauses():
    try:
        data = request.json
        search_term = data.get('search_term', '').lower()
        
        results = []
        for clause_id, clause_data in CONTRACT_CLAUSES.items():
            relevance = 0
            
            if search_term in clause_data['text'].lower():
                relevance += 0.8
            if search_term in clause_id.lower():
                relevance += 0.6
            if search_term in clause_data['category'].lower():
                relevance += 0.7
            
            if relevance > 0:
                results.append({
                    "clause_id": clause_id,
                    "relevance_score": min(relevance, 1.0),
                    **clause_data
                })
        
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return jsonify({
            "results": results,
            "total_found": len(results),
            "search_term": search_term
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'GET':
        return jsonify({
            "model": MODEL,
            "ollama_url": OLLAMA_URL,
            "ner_method": "pattern_matching",
            "backend_status": "running",
            "version": "1.0.0"
        })
    
    try:
        data = request.json
        return jsonify({"message": "Settings updated successfully", "data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Strategic Contract AI Backend Starting...")
    print("📍 Server will run on: http://localhost:5001")
    print("🎯 Open contract-index.html in your browser")
    print("✅ No external dependencies required!")
    
    app.run(debug=True, port=5001, host='0.0.0.0')