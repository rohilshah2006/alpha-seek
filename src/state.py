from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    user_email: str
    portfolio: List[Dict[str, Any]]      # Input: [{'ticker': 'AAPL', 'shares': 10}, ...]
    
    news_results: List[str]              # Internal: Broad market news
    portfolio_data: List[Dict[str, Any]] # Internal: Financials for each stock
    total_value: float                   # Internal: Sum of all shares * price
    chart_paths: List[str]               # Internal: List of image files to attach
    
    final_report: str                    # Output: HTML email body
    retry_count: int