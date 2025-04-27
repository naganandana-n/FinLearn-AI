# RAG Agent Project


It currently uses a **local LanceDB** database at `tmp/lancedb/recipes`.

---

##  Setup Instructions



1. **Clone the repository**:

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
##find the below line in app.py and comment it out after the first run for your subsequent runs
knowledge_base.load(upsert=True)
python app.py
