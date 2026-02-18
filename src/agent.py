import os
import json
from typing import TypedDict, Literal
from dotenv import load_dotenv

from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from tavily import TavilyClient
from langchain_core.messages import HumanMessage
from src.state import AgentState
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
    print("📰 Fetching broad market news...")
    try:
        # For a portfolio, broad market news is better
        response = tavily.search(query="US stock market pre-market news today", topic="news", days=1)
        news_text = " ".join([res['title'] for res in response.get('results', [])[:4]])
    except Exception:
        news_text = "Standard market conditions."

    return {"news_results": [news_text]}

# --- NODE 2: DATA COLLECTOR ---
def data_collection_node(state: AgentState):
    portfolio = state["portfolio"]
    portfolio_data = []
    chart_paths = []
    total_value = 0.0

    print(f"📊 Fetching data & charts for {len(portfolio)} assets...")
    
    for item in portfolio:
        ticker = item["ticker"]
        shares = item["shares"]
        
        # Get Data & Chart
        data = get_financial_metrics(ticker)
        chart_file = generate_stock_chart(ticker)
        if chart_file:
            chart_paths.append(chart_file)
            
        # Calculate Value
        price = data.get("current_price") or 0
        value = price * shares
        total_value += value
        
        # Save EVERYTHING, including PE and Target
        portfolio_data.append({
            "ticker": ticker,
            "shares": shares,
            "price": price,
            "value": value,
            "pe_ratio": data.get("pe_ratio", "N/A"),
            "target_mean_price": data.get("target_mean_price", "N/A")
        })
        
    return {
        "portfolio_data": portfolio_data, 
        "total_value": total_value, 
        "chart_paths": chart_paths
    }

# --- NODE 3: ANALYST ---
def analyze_node(state: AgentState):
    news_content = state.get("news_results", [""])[0]
    portfolio_data = state.get("portfolio_data", [])
    total_value = state.get("total_value", 0)
    
    print("🧠 Synthesizing Portfolio Report (Goldman Style)...")

    cards_html = ""
    
    # 1. Loop through each stock to get a specific AI Verdict
    for stock in portfolio_data:
        ticker = stock['ticker']
        
        prompt = f"""
        You are a Senior Investment Analyst at Goldman Sachs.
        Ticker: {ticker}
        Broad Market News: {news_content}
        Financials: Price ${stock['price']}, PE {stock['pe_ratio']}
        
        Output a JSON object with 3 fields:
        1. "summary": A 3-sentence analysis of why the stock is moving.
        2. "verdict": A single word: "Buy", "Sell", or "Hold".
        3. "rationale": A 1-sentence explanation of the verdict.
        
        Do not use Markdown. Return ONLY the JSON string.
        """
        
        raw_response = llm.invoke([HumanMessage(content=prompt)]).content
        
        try:
            cleaned_response = raw_response.replace("```json", "").replace("```", "").strip()
            analysis = json.loads(cleaned_response)
        except Exception as e:
            print(f"⚠️ JSON Parse Error for {ticker}: {e}")
            analysis = {
                "summary": "Analysis data temporarily unavailable.",
                "verdict": "Hold",
                "rationale": "Pending manual review."
            }

        verdict = analysis.get('verdict', 'Hold').upper()
        verdict_color = "#166534" if verdict == "BUY" else "#991b1b" if verdict == "SELL" else "#854d0e"

        # 2. Build the classic white card for this specific stock
        cards_html += f"""
        <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px;">
            <div style="padding: 15px 25px; border-bottom: 1px solid #e5e7eb; background-color: #f9fafb; display: flex; justify-content: space-between; align-items: center;">
                <h2 style="margin: 0; font-size: 20px; color: #111827; font-weight: bold;">{ticker} <span style="font-size: 14px; color: #6b7280; font-weight: normal; margin-left: 8px;">({stock['shares']} shares)</span></h2>
                <h2 style="margin: 0; font-size: 20px; color: #111827;">${stock['value']:,.2f}</h2>
            </div>
            
            <div style="padding: 25px;">
                <h3 style="margin-top: 0; color: #374151; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Executive Summary</h3>
                <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px; font-size: 14px;">
                    {analysis.get('summary')}
                </p>

                <h3 style="margin-top: 0; color: #374151; font-size: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Key Metrics</h3>
                <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <td style="padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 30%;">Price</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; color: #111827;">${stock['price']:,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Target</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; color: #111827;">${stock['target_mean_price']}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #374151;">P/E Ratio</td>
                        <td style="padding: 10px; border: 1px solid #e5e7eb; color: #111827;">{stock['pe_ratio']}</td>
                    </tr>
                </table>

                <div style="background-color: {verdict_color}15; border-left: 4px solid {verdict_color}; padding: 15px;">
                    <strong style="color: {verdict_color}; font-size: 16px; display: block; margin-bottom: 5px;">VERDICT: {verdict}</strong>
                    <span style="color: #374151; font-size: 14px;">{analysis.get('rationale')}</span>
                </div>
            </div>
        </div>
        """

    # 3. Assemble the Final Email with the Navy Header
    html_template = f"""
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
            
            <div style="background-color: #111827; color: #ffffff; padding: 25px; text-align: center; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h1 style="margin: 0; font-size: 26px; font-weight: bold;">Alpha Seek</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Daily Portfolio Wrap</p>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #374151;">
                    <span style="font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #9ca3af;">TOTAL VALUE</span><br/>
                    <span style="font-size: 40px; font-weight: bold; color: #4ade80;">${total_value:,.2f}</span>
                </div>
            </div>
            
            {cards_html}
            
            <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 30px; padding: 20px; border-top: 1px solid #d1d5db;">
                Generated by Alpha Seek AI • Goldman Sachs Analysis Logic
            </div>
        </div>
    </div>
    """
    
    return {"final_report": html_template}

# --- NODE 4: PUBLISHER ---
def publisher_node(state: AgentState):
    report = state["final_report"]
    recipient = state["user_email"]
    charts = state.get("chart_paths", [])
    total_val = state.get("total_value", 0)
    
    print(f"📧 Sending Portfolio Wrap to {recipient} with {len(charts)} charts...")
    
    send_email(
        to=recipient, 
        subject=f"Market Wrap: Your ${total_val:,.2f} Portfolio", 
        body=report,
        attachments=charts 
    )
    
    # Cleanup all charts
    for chart in charts:
        if os.path.exists(chart):
            os.remove(chart)
            
    return {"final_report": report}

# --- LOGIC & GRAPH ---
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("researcher", search_node)
    workflow.add_node("data_collector", data_collection_node)
    workflow.add_node("analyst", analyze_node)
    workflow.add_node("publisher", publisher_node)

    workflow.set_entry_point("researcher")
    workflow.add_edge("researcher", "data_collector")
    workflow.add_edge("data_collector", "analyst")
    workflow.add_edge("analyst", "publisher")
    workflow.add_edge("publisher", END)

    return workflow.compile()

def run_agent(inputs: dict):
    app = build_graph()
    result = app.invoke(inputs)
    return result["final_report"]