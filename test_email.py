import os
from dotenv import load_dotenv
from src.tools import send_email

# Load environment variables (make sure RESEND_API_KEY is in your .env)
load_dotenv()

def test_resend():
    # Replace this with the email you signed up to Resend with!
    test_email_address = "rohil.shah.one@gmail.com" 
    
    # We will send a simple HTML email to test delivery
    html_body = """
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Resend API Test 🚀</h2>
        <p>If you are reading this, the Naxera AI migration to the Resend API was a complete success!</p>
    </div>
    """
    
    print("Sending test email...")
    success = send_email(
        to=test_email_address,
        subject="Test: Naxera AI Resend Integration",
        body=html_body,
        attachments=None
    )
    
    if success:
        print(f"✅ Awesome! Check the inbox for {test_email_address}.")
    else:
        print("❌ Test failed. Double check your API key in the .env file.")

if __name__ == "__main__":
    test_resend()
