# FinLearn-AI  
Boosting Customer Engagement through Interactive AI Learning

**FinLearn-AI** is an AI-powered Finance Learning Assistant built to demonstrate how financial platforms like **Deriv** can transform static content into personalized, interactive learning journeys that increase user engagement and customer retention.

While Deriv offers high-quality ebooks through its **Deriv Academy**, the learning experience remains passive. FinLearn-AI turns that same content into:
- Targeted quizzes
- Custom study plans
- Summarized key insights
- A GPT-4o-powered finance tutor

Inspired by [Amazon’s strategy](https://aws.amazon.com/marketplace/solutions/generative-ai/what-is/enhancing-customer-retention-strategies-with-ai/#:~:text=Another%20strategy%20involves%20the%20use,enhancing%20the%20overall%20customer%20experience.) of using Generative AI to foster customer loyalty, this project shows how businesses can use RAG-based systems to keep users engaged longer, learning more, and returning often.

## Why This Matters

“I visited Deriv’s website with no prior knowledge of trading. Their ebooks were informative, but I didn’t stay long. If I could quiz myself, plan my learning, and talk to an AI tutor, I’d have stayed much longer.”

FinLearn-AI was born out of this insight:  
- Turn passive readers into active learners  
- Turn static content into personalized experiences  
- Turn information into retention

## Features

- Chat with PDFs: Ask questions about Deriv’s ebooks and get contextual answers
- Quiz Generator: Instantly generate multiple choice quizzes on any finance topic
- Study Plan Creator: Get a personalized multi day study roadmap
- PDF Summarizer: View structured summaries of each ebook with key concepts
- Answer Checker: Test your quiz responses with explanations
- Web Search Fallback: Uses DuckDuckGo tools if answers aren't found in the PDFs

## Knowledge Base

FinLearn-AI is powered by the following official Deriv ebooks:

- Forex Trading  
- Stock Market  
- Commodities  
- 7 Traits of Successful Traders  
- Trading Financial Accumulator Options  
- Cryptocurrency  
- Synthetic Indices  
- Top 10 Chart Patterns

## Tech Stack

| Component       | Technology         |
|----------------|--------------------|
| Backend        | Flask (Python)     |
| LLM            | GPT-4o (via OpenAI)|
| Vector DB      | LanceDB            |
| Knowledge Base | agno + pypdf       |
| Search Fallback| DuckDuckGo Tools   |
| Parsing & DB   | SQLAlchemy + pgvector |

## How It Works: Agents and the RAG Pipeline

FinLearn-AI uses a modular, multi-agent architecture powered by the [Agno](https://github.com/agno-agi/agno) framework. Each **agent** is responsible for a specific type of interaction (chatting, quiz generation, summarization, or study planning), and follows a Retrieval-Augmented Generation (RAG) workflow:

### RAG Pipeline Overview

1. **Query Input**  
   The user submits a prompt (e.g., "What are candlestick patterns?").

2. **Vector Search (via LanceDB)**  
   Relevant excerpts are retrieved from Deriv’s PDFs using vector embeddings.

3. **LLM Processing (via GPT-4o)**  
   The retrieved context is injected into a prompt and passed to GPT-4o.

4. **Response Generation**  
   The model returns a contextualized, human readable answer, quiz, or plan.

5. **Fallback Search (Optional)**  
   If needed, DuckDuckGo is used to fetch additional external information.

### Agents in FinLearn-AI

| Agent Name       | Role                                 |
|------------------|--------------------------------------|
| `rag-agent`      | General Q&A on finance topics        |
| `quiz-agent`     | Creates quizzes based on topics      |
| `summary-agent`  | Summarizes full Deriv ebooks         |
| `study-plan-agent` | Builds multi-day personalized plans |

Each agent has access to the same knowledge base (PDFs + LanceDB) but is guided by a different system prompt tailored to its purpose.

This architecture makes FinLearn-AI **highly extensible**, i.e you can easily plug in new tools, swap vector DBs, or add user specific memory for personalization.

## Setting it up

### 1. Clone the Repository, Setup Virtual Environment & Install Dependencies
```bash
git clone https://github.com/your-username/FinLearn-AI.git
cd FinLearn-AI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Create `.env` File

```env
OPENAI_API_KEY=your_openai_key
```

### 3. Run the App

```bash
python app.py
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

### 4. Find the below line in `app.py` and comment it out after the first run:

```python
knowledge_base.load(upsert=True)
```

## Example Use Cases

- "Explain the difference between forex and stocks."
- "Generate a 5-question quiz on cryptocurrency at medium difficulty."
- "Give me a 7-day study plan to learn chart patterns."
- "Summarize the ebook on commodities."

---

## Acknowledgments

- [Deriv.com](https://deriv.com) – Official source of all trading ebooks  
- [Agno](https://github.com/victordibia/agno) – Modular agent framework  
- [OpenAI](https://platform.openai.com/) – LLM APIs  
- [LanceDB](https://lancedb.github.io/lancedb/) – Fast vector search  

---

## License

This project is for educational and non-commercial use.  
Please do not redistribute Deriv's PDF content without permission.