import os
import json
from typing import TypedDict, Literal
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from tavily import TavilyClient
from langchain_core.messages import HumanMessage
from src.state import AgentState
# Import the new chart tool
from src.tools import get_financial_metrics, send_email, generate_stock_chart 

load_dotenv()

# --- SETUP ---
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY")
)

# --- NODE 1: RESEARCHER ---
def search_node(state: AgentState):
    ticker = state["ticker"]
    count = state.get("retry_count", 0)
    
    if count == 0:
        query = f"{ticker} stock news analysis"
    else:
        query = f"{ticker} financial sentiment"

    try:
        response = tavily.search(query=query, topic="news", days=3)
        news_text = ""
        for result in response.get('results', [])[:3]:
            news_text += f"<li><a href='{result['url']}'>{result['title']}</a></li>"
    except Exception:
        news_text = "NO_NEWS_FOUND"

    return {"news_results": [news_text]}

# --- NODE 2: DATA COLLECTOR (+ CHART!) ---
def data_collection_node(state: AgentState):
    ticker = state["ticker"]
    print(f"📊 Fetching data & drawing chart for {ticker}...")
    
    # Get Numbers
    data = get_financial_metrics(ticker)
    
    # Get Picture
    chart_file = generate_stock_chart(ticker)
    
    return {"financial_data": data, "chart_path": chart_file}

# --- NODE 3: ANALYST (HTML + STYLING) ---
# --- NODE 3: ANALYST (COMPACT HTML MODE) ---
# --- NODE 3: ANALYST (TABLE LAYOUT MODE) ---
def analyze_node(state: AgentState):
    news_content = state.get("news_results", ["NO_NEWS_FOUND"])[0]
    financials = state.get("financial_data", {})
    ticker = state["ticker"]

    print("🧠  Synthesizing report...")

    # 1. Ask LLM for CONTENT ONLY (JSON format)
    # We strip away all formatting instructions so it focuses on the writing.
    prompt = f"""
    You are a Senior Investment Analyst at Goldman Sachs.
    Ticker: {ticker}
    News: {news_content}
    Financials: Price ${financials.get('current_price')}, PE {financials.get('pe_ratio')}
    
    Output a JSON object with 3 fields:
    1. "summary": A detailed 4-5 sentence analysis of why the stock is moving.
    2. "verdict": A single word: "Buy", "Sell", or "Hold".
    3. "rationale": A 2-sentence explanation of the verdict.
    
    Do not use Markdown. Return ONLY the JSON string.
    """
    
    raw_response = llm.invoke([HumanMessage(content=prompt)]).content
    
    # Clean up the response to ensure valid JSON
    try:
        # Sometimes LLMs wrap JSON in ```json ... ```
        cleaned_response = raw_response.replace("```json", "").replace("```", "").strip()
        analysis = json.loads(cleaned_response)
    except Exception as e:
        print(f"⚠️ JSON Parse Error: {e}")
        # Fallback if AI messes up JSON
        analysis = {
            "summary": "Analysis data unavailable due to formatting error.",
            "verdict": "Hold",
            "rationale": "Please review manual data."
        }

    # 2. Python HTML Template (The "Professional" Layout)
    # We define the styling here, so it is 100% consistent.
    
    # Determine Color for Verdict
    verdict = analysis.get('verdict', 'Hold').upper()
    verdict_color = "#166534" if verdict == "BUY" else "#991b1b" if verdict == "SELL" else "#854d0e"
    
    html_template = f"""
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="background-color: #111827; color: #ffffff; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Alpha Seek</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Daily Briefing: {ticker}</p>
            </div>
            
            <div style="padding: 25px;">
                
                <h2 style="margin-top: 0; color: #374151; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Executive Summary</h2>
                <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
                    {analysis.get('summary')}
                </p>

                <h2 style="margin-top: 0; color: #374151; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Key Metrics</h2>
                <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Price</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; color: #111827;">${financials.get('current_price', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Target</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; color: #111827;">${financials.get('target_mean_price', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">P/E Ratio</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; color: #111827;">{financials.get('pe_ratio', 'N/A')}</td>
                    </tr>
                </table>

                <div style="background-color: {verdict_color}15; border-left: 4px solid {verdict_color}; padding: 15px;">
                    <strong style="color: {verdict_color}; font-size: 16px; display: block; margin-bottom: 5px;">VERDICT: {verdict}</strong>
                    <span style="color: #374151; font-size: 14px;">{analysis.get('rationale')}</span>
                </div>
                
            </div>
            
            <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                Generated by Alpha Seek AI • Goldman Sachs Analysis Logic
            </div>
        </div>
    </div>
    """
    
    return {"final_report": html_template}

# --- NODE 4: PUBLISHER (With Attachments) ---
def publisher_node(state: AgentState):
    report = state["final_report"]
    ticker = state["ticker"]
    recipient = state["user_email"]
    chart = state.get("chart_path") # Get the image path
    
    if "MISSING_DATA" not in report:
        print(f"📧 Sending email with chart to {recipient}...")
        
        # Yagmail makes attachments super easy: just pass the list
        attachments = [chart] if chart else []
        
        send_email(
            to=recipient, 
            subject=f"Alpha Seek: {ticker} Report", 
            body=report,        # The HTML string
            attachments=attachments # The Chart
        )
        
        # Cleanup: Delete the image after sending so your folder doesn't explode
        if chart and os.path.exists(chart):
            os.remove(chart)
            
    return {"final_report": report}

# --- LOGIC ---
def should_continue(state: AgentState) -> Literal["researcher", "publisher"]:
    report = state["final_report"]
    count = state.get("retry_count", 0)
    if "MISSING_DATA" in report and count < 2:
        return "researcher"
    return "publisher"

def increment_retry(state: AgentState):
    return {"retry_count": state.get("retry_count", 0) + 1}

# --- GRAPH BUILDER ---
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("researcher", search_node)
    workflow.add_node("data_collector", data_collection_node)
    workflow.add_node("analyst", analyze_node)
    workflow.add_node("publisher", publisher_node)
    workflow.add_node("increment_retry", increment_retry)

    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "data_collector")
    workflow.add_edge("data_collector", "analyst")
    
    workflow.add_conditional_edges(
        "analyst",
        should_continue,
        {
            "researcher": "increment_retry",
            "publisher": "publisher"
        }
    )
    
    workflow.add_edge("increment_retry", "researcher")
    workflow.add_edge("publisher", END)

    return workflow.compile()

def run_agent(inputs: dict):
    app = build_graph()
    result = app.invoke(inputs)
    return result["final_report"]