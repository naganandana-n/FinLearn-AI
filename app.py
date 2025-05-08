from flask import Flask, request, jsonify, render_template, session
from dotenv import load_dotenv
import os
import random
import json
from datetime import datetime, timedelta

load_dotenv()

# Import agno framework components for building RAG agents
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.knowledge.pdf_url import PDFUrlKnowledgeBase
from agno.vectordb.lancedb import LanceDb, SearchType
from agno.tools.duckduckgo import DuckDuckGoTools

app = Flask(__name__)

# Set secret key for session management (from environment variable or default)
app.secret_key = os.environ.get("SECRET_KEY", "finance-rag-assistant-secret")

# Path for LanceDB storage; default is local folder if not set in .env
db_uri = os.environ.get("LANCEDB_URI", "tmp/lancedb")


# --- KNOWLEDGE BASE SETUP ---
# List of finance-related PDF URLs from Deriv.com to be used as knowledge source
pdf_urls = [
    "https://static.deriv.com/marketing/ebook-forex-en-hq.pdf",
    "https://static.deriv.com/marketing/ebook-stocks-en-hq.pdf",
    "https://static.deriv.com/marketing/ebook-commodities-en-hq.pdf",
    "https://static.deriv.com/marketing/ebook-7traits-en-hq.pdf",
    "https://static.deriv.com/marketing/ebook-accumulators-en-lq.pdf",
    "https://static.deriv.com/marketing/ebook-crypto-en-hq.pdf",
    "https://static.deriv.com/marketing/ebook-synthetics-en-hq.pdf",
    "https://static.deriv.com/marketing/ebook-10chart-en-hq.pdf"

]

# Initialize the vector-based knowledge base using the PDF URLs and LanceDB
knowledge_base = PDFUrlKnowledgeBase(
    urls=pdf_urls,
    vector_db=LanceDb(table_name="finance_docs", uri=db_uri, search_type=SearchType.vector),
)

# Comment this out after first run to avoid reloading the knowledge base each time
# knowledge_base.load(upsert=True)

# --- AGENT INITIALIZATION ---

# General-purpose agent for answering user queries using the RAG pipeline
rag_agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    agent_id="rag-agent",
    knowledge=knowledge_base,
    tools=[DuckDuckGoTools()],
    show_tool_calls=True,
    markdown=True,
)

# Dedicated agents for quizzes, summaries, and study plans (same model, different prompts)
quiz_agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    agent_id="quiz-agent",
    knowledge=knowledge_base,
    markdown=True,
)

# Initialize summary agent
summary_agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    agent_id="summary-agent",
    knowledge=knowledge_base,
    markdown=True,
)

# Initialize study plan agent
study_plan_agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    agent_id="study-plan-agent",
    knowledge=knowledge_base,
    markdown=True,
)

# --- ROUTES ---

# Render the frontend interface (index.html)
@app.route('/')
def home():
    return render_template('index.html')

# --- API: Handle General Query ---
@app.route('/api/query', methods=['POST'])
def query():
    user_query = request.json.get('query', '')
    if not user_query:
        return jsonify({'error': 'Query is required'}), 400

    # Run the query through the RAG agent
    response = rag_agent.run(user_query)

    # Extract response text safely
    try:
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'text'):
            response_text = response.text
        else:
            response_text = str(response)
    except Exception as e:
        print("Error extracting response text:", e)
        response_text = "Sorry, I couldn't process the response."

    return jsonify({'response': response_text})


# --- API: Generate Quiz from Topic ---
@app.route('/api/generate_quiz', methods=['POST'])
def generate_quiz():
    topic = request.json.get('topic', '')
    num_questions = request.json.get('numQuestions', 5)
    difficulty = request.json.get('difficulty', 'medium')
    
    # Construct prompt for GPT-4o
    quiz_prompt = f"""
    Generate a quiz with {num_questions} questions about {topic} at {difficulty} difficulty level.
    Each question should have 4 options with one correct answer.
    Format the response as JSON with the following structure:
    {{
        "questions": [
            {{
                "question": "Question text here",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "The correct option here",
                "explanation": "Explanation of why this is the correct answer"
            }}
        ]
    }}
    Make the questions informative and educational, covering important concepts from the content.
    Ensure the questions test different aspects of the topic and have varying difficulty.
    """
    
    response = quiz_agent.run(quiz_prompt)
    
    try:
        # Extract text and parse JSON from model response
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'text'):
            response_text = response.text
        else:
            response_text = str(response)
            
        # Find JSON in the response (handling potential markdown code blocks)
        import re
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|(\{[\s\S]*\})', response_text)
        if json_match:
            json_str = next(group for group in json_match.groups() if group is not None)
            quiz_data = json.loads(json_str)
        else:
            quiz_data = json.loads(response_text)
            
        return jsonify(quiz_data)
    except Exception as e:
        print("Error parsing quiz JSON:", e)
        print("Response was:", response_text)
        return jsonify({'error': 'Failed to generate quiz', 'details': str(e)}), 500

# --- API: Generate Study Plan ---
@app.route('/api/create_study_plan', methods=['POST'])
def create_study_plan():
    topics = request.json.get('topics', [])
    days = request.json.get('days', 7)
    hours_per_day = request.json.get('hoursPerDay', 2)
    
    # Convert topic list to string for the prompt
    topics_str = ", ".join(topics) if topics else "all finance topics from the PDFs"
    
    # Prompt GPT to generate a multi-day study plan
    study_prompt = f"""
    Create a detailed {days}-day study plan for learning about {topics_str}.
    The student can dedicate {hours_per_day} hours per day.
    Include specific topics to focus on each day, recommended activities, and learning objectives.
    Format the response as JSON with the following structure:
    {{
        "plan": [
            {{
                "day": 1,
                "topics": ["Topic 1", "Topic 2"],
                "activities": ["Activity 1", "Activity 2"],
                "objectives": ["Objective 1", "Objective 2"],
                "resources": ["Resource 1", "Resource 2"]
            }}
        ],
        "overall_objectives": ["Overall objective 1", "Overall objective 2"]
    }}
    Ensure the plan is progressive, builds on previous knowledge, and covers all requested topics within the timeframe.
    """
    
    response = study_plan_agent.run(study_prompt)
    
    try:
        # Extract JSON from the response
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'text'):
            response_text = response.text
        else:
            response_text = str(response)
            
        # Find JSON in the response (handling potential markdown code blocks)
        import re
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```|```\s*([\s\S]*?)\s*```|(\{[\s\S]*\})', response_text)
        if json_match:
            json_str = next(group for group in json_match.groups() if group is not None)
            plan_data = json.loads(json_str)
        else:
            plan_data = json.loads(response_text)
            
        return jsonify(plan_data)
    except Exception as e:
        print("Error parsing study plan JSON:", e)
        print("Response was:", response_text)
        return jsonify({'error': 'Failed to create study plan', 'details': str(e)}), 500


# --- API: Summarize Selected PDF ---
@app.route('/api/summarize_pdf', methods=['POST'])
def summarize_pdf():
    pdf_index = request.json.get('pdfIndex', 0)
    if pdf_index < 0 or pdf_index >= len(pdf_urls):
        return jsonify({'error': 'Invalid PDF index'}), 400
        
    pdf_url = pdf_urls[pdf_index]
    pdf_name = pdf_url.split('/')[-1]
    
    summary_prompt = f"""
    Provide a comprehensive summary of the PDF: {pdf_name}.
    The summary should include:
    1. Main topics covered
    2. Key concepts and definitions
    3. Important points to remember
    4. How this material connects to other finance topics
    
    Structure the summary with clear headings and bullet points where appropriate.
    """
    
    response = summary_agent.run(summary_prompt)
    
    try:
        # Extract text from the response
        if hasattr(response, 'content'):
            response_text = response.content
        elif hasattr(response, 'text'):
            response_text = response.text
        else:
            response_text = str(response)
            
        return jsonify({'summary': response_text, 'pdf_name': pdf_name})
    except Exception as e:
        print("Error extracting summary:", e)
        return jsonify({'error': 'Failed to summarize PDF', 'details': str(e)}), 500

# --- API: Check Quiz Answer ---
@app.route('/api/check_answer', methods=['POST'])
def check_answer():
    question = request.json.get('question', '')
    user_answer = request.json.get('userAnswer', '')
    correct_answer = request.json.get('correctAnswer', '')
    explanation = request.json.get('explanation', '')
    
    # Compare answers to determine if user is correct
    is_correct = user_answer.strip() == correct_answer.strip()
    
    return jsonify({
        'correct': is_correct,
        'explanation': explanation
    })

# --- APP ENTRY POINT ---
if __name__ == '__main__':
    # Start Flask development server on port 8000
    app.run(debug=True, host='0.0.0.0', port=8000)
