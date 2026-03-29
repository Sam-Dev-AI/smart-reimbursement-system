import os
import json
import google.generativeai as genai
from PIL import Image
import io
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY not found in environment.")
        genai.configure(api_key=api_key)

        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def extract_expense_details(self, image_data):
        """
        Extracts expense information from a receipt image using Gemini Flash.
        image_data: bytes of the image file.
        """
        try:
            # Prepare the image
            img = Image.open(io.BytesIO(image_data))
            
            prompt = """
            Analyze this receipt image and extract the following information in strict JSON format:
            {
                "amount": "floating point number as string",
                "currency": "3-letter ISO code e.g. USD, EUR, GBP, INR",
                "category": "Travel, Food, Office Supplies, or Other",
                "date": "YYYY-MM-DD",
                "description": "Short summary of the expense"
            }
            Important: 
            1. If the currency symbol is $, default to USD unless context suggests otherwise.
            2. For €, use EUR. For ₹, use INR.
            3. Return ONLY the JSON object.
            """
            
            response = self.model.generate_content([prompt, img])
            text_response = response.text.strip()
            
            # Extract JSON from potential markdown blocks
            if "```json" in text_response:
                text_response = text_response.split("```json")[1].split("```")[0].strip()
            elif "```" in text_response:
                text_response = text_response.split("```")[1].split("```")[0].strip()
            
            return json.loads(text_response)
        except Exception as e:
            print(f"OCR Error: {e}")
            return None

ai_service = AIService()
