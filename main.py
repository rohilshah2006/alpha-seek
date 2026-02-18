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
    print("--- Starting Alpha Seek Agent (SaaS Mode) ---")
    
    # 1. Fetch all ACTIVE subscriptions
    print("📡 Fetching active subscriptions from Supabase...")
    response = supabase.table("subscriptions").select("*").eq("active", True).execute()
    subscriptions = response.data
    
    if not subscriptions:
        print("⚠️ No active subscriptions found in database.")
    else:
        print(f"✅ Found {len(subscriptions)} tasks.")

    # 2. Loop through each user request
    for sub in subscriptions:
        user_email = sub['email']
        ticker = sub['ticker']
        
        try:
            print(f"\n--- 🤖 Processing: {ticker} for {user_email} ---")
            
            # Run the agent with the user's specific data
            inputs = {
                "ticker": ticker, 
                "user_email": user_email, 
                "retry_count": 0
            }
            run_agent(inputs)
            
            print(f"✅ Finished task for {user_email}")
            
        except Exception as e:
            print(f"❌ Failed to process {ticker}: {e}")
            
    print("\n--- Batch Job Complete ---")