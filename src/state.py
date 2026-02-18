import operator
from typing import Annotated, List, TypedDict, Dict, Any, Optional

# This is the "Shared Whiteboard" for our Agent
class AgentState(TypedDict):
    ticker: str                # Input: The stock user wants (e.g., "AAPL")
    user_email: str
    news_results: list[str]    # Internal: The raw news articles found
    financial_data: Dict[str, Any]
    chart_path: Optional[str]
    analysis: str              # Internal: The LLM's summary of the news
    sentiment_score: int       # Internal: A score 1-10
    final_report: str          # Output: The final email body
    retry_count: int