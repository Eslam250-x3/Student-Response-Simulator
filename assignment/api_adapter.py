import os
import requests
import json
import time

class APIAdapter:
    def __init__(self, config):
        self.provider = config['api']['provider']
        self.base_url = config['api']['baseUrl']
        self.model = config['api']['model']
        self.api_key = os.getenv(config['api']['apiKeyEnv'])
        self.rate_limit = config['realism']['rateLimitSec']
        
        if not self.api_key:
            raise ValueError(f"API Key not found in environment variable: {config['api']['apiKeyEnv']}")

    def call_ai(self, prompt, system_prompt="أنت مساعد مفيد.", temperature=0.7, seed=None, max_retries=2):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature
        }
        if seed is not None:
            payload["seed"] = seed

        for attempt in range(max_retries + 1):
            try:
                response = requests.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=180
                )
                response.raise_for_status()
                result = response.json()
                
                # Respect rate limit
                time.sleep(self.rate_limit)
                
                return result['choices'][0]['message']['content']
            except Exception as e:
                if attempt == max_retries:
                    raise e
                print(f"Error calling API (attempt {attempt+1}): {e}. Retrying...")
                time.sleep(5)
