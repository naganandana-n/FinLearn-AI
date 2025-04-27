from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
load_dotenv()

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.knowledge.pdf_url import PDFUrlKnowledgeBase
from agno.vectordb.lancedb import LanceDb, SearchType
from agno.tools.duckduckgo import DuckDuckGoTools
import os

app = Flask(__name__)

# Use environment variable for LanceDB path or default to local tmp directory
db_uri = os.environ.get("LANCEDB_URI", "tmp/lancedb")

# Initialize the RAG agent
knowledge_base = PDFUrlKnowledgeBase(
    urls=[
        "https://static.deriv.com/marketing/ebook-forex-en-hq.pdf",
        "https://static.deriv.com/marketing/ebook-stocks-en-hq.pdf"
    ],
    vector_db=LanceDb(table_name="recipes", uri=db_uri, search_type=SearchType.vector),
)

# Comment this out after first run to avoid reloading the knowledge base each time
#knowledge_base.load(upsert=True)

rag_agent = Agent(
    model=OpenAIChat(id="gpt-4o"),
    agent_id="rag-agent",
    knowledge=knowledge_base,
    tools=[DuckDuckGoTools()],
    show_tool_calls=True,
    markdown=True,
)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/query', methods=['POST'])
def query():
    user_query = request.json.get('query', '')
    if not user_query:
        return jsonify({'error': 'Query is required'}), 400

    response = rag_agent.run(user_query)

    # Handle non-serializable response
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
