import os
from dotenv import load_dotenv
from supabase import create_client, Client
from src.agent import run_agent

load_dotenv()

# Setup Supabase Connection
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

if __name__ == "__main__":
    print("--- Starting Alpha Seek Agent (Portfolio Mode) ---")
    
    # 1. Fetch all ACTIVE subscriptions
    print("📡 Fetching active subscriptions from Supabase...")
    response = supabase.table("subscriptions").select("*").eq("active", True).execute()
    subscriptions = response.data
    
    if not subscriptions:
        print("⚠️ No active subscriptions found in database.")
        exit(0)
    else:
        print(f"✅ Found {len(subscriptions)} total active tickers.")

    # 2. GROUP BY USER
    user_portfolios = {}
    for sub in subscriptions:
        email = sub['email']
        if email not in user_portfolios:
            user_portfolios[email] = []
        
        user_portfolios[email].append({
            "ticker": sub['ticker'],
            "shares": float(sub['shares'])
        })

    print(f"📊 Processing portfolios for {len(user_portfolios)} unique users...\n")

    # 3. Loop through each USER (not each ticker)
    for email, portfolio in user_portfolios.items():
        try:
            print(f"--- 🤖 Processing Portfolio for {email} ---")
            
            inputs = {
                "user_email": email, 
                "portfolio": portfolio, 
                "retry_count": 0
            }
            run_agent(inputs)
            
            print(f"✅ Finished sending to {email}")
            
        except Exception as e:
            print(f"❌ Failed to process {email}: {e}")
            
    print("\n--- Batch Job Complete ---")