"""
api_adapter.py — طبقة موحدة لاستدعاء API (Google Gemini / OpenAI-compatible / Ollama)
"""

from __future__ import annotations

import os
import requests
import time
import logging

logger = logging.getLogger(__name__)


class APIAdapter:
    def __init__(self, config: dict):
        self.provider: str = config['api']['provider']
        self.base_url: str = config['api']['baseUrl']
        self.model: str = config['api']['model']
        api_key_env: str = config['api'].get('apiKeyEnv', '')
        self.api_key: str = os.getenv(api_key_env, '') if api_key_env else ''
        self.rate_limit: int = config['realism']['rateLimitSec']
        self.max_retries: int = config['realism'].get('maxRetries', 2)
        self._resolved_google_model: str | None = None
        self._listed_google_models: list[str] | None = None

        # Ollama is a local server — no API key required.
        if self.provider != 'ollama' and not self.api_key:
            raise ValueError(
                f"API Key not found in environment variable: {api_key_env}\n"
                f"Set it with: export {api_key_env}=YOUR_KEY"
            )

    @staticmethod
    def _normalize_google_model_name(model: str) -> str:
        if model.startswith("models/"):
            return model
        return f"models/{model}"

    def _list_google_generate_models(self, headers: dict) -> list[str]:
        """Return Google models that support generateContent."""
        url = "https://generativelanguage.googleapis.com/v1beta/models"
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()

        models: list[str] = []
        for item in data.get("models", []):
            name = item.get("name", "")
            methods = item.get("supportedGenerationMethods", [])
            if name and "generateContent" in methods:
                models.append(name)
        return models

    def _resolve_google_model(self, headers: dict, force_refresh: bool = False) -> str:
        """
        Resolve configured model to an available generateContent model.
        Falls back to a known Gemini model or the first available one.
        """
        if self._resolved_google_model and not force_refresh:
            return self._resolved_google_model

        configured = self._normalize_google_model_name(self.model)

        if self._listed_google_models is None or force_refresh:
            try:
                self._listed_google_models = self._list_google_generate_models(headers)
            except Exception as e:
                logger.warning(
                    "Could not list Google models (%s). Falling back to configured model '%s'.",
                    e,
                    configured,
                )
                self._resolved_google_model = configured
                return configured

        available = self._listed_google_models or []
        if configured in available:
            chosen = configured
        else:
            preferred = [
                "models/gemini-2.5-flash",
                "models/gemini-2.5-flash-lite",
                "models/gemini-2.0-flash",
                "models/gemini-1.5-flash",
            ]
            chosen = next((m for m in preferred if m in available), None)
            if not chosen:
                chosen = next((m for m in available if m.startswith("models/gemini")), configured)

            logger.warning(
                "Configured model '%s' not available for generateContent. Using '%s' instead.",
                configured,
                chosen,
            )

        self._resolved_google_model = chosen
        return chosen

    @staticmethod
    def _build_google_url(model_name: str) -> str:
        return f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent"

    def call_ai(
        self,
        prompt: str,
        system_prompt: str = "أنت مساعد مفيد.",
        temperature: float = 0.7,
        seed: int | None = None,
        max_output_tokens: int = 2048,
        max_retries: int | None = None,
    ) -> str:
        """
        Call AI API and return generated text.

        Args:
            prompt: User prompt content
            system_prompt: System instruction
            temperature: Sampling temperature (0.0 - 1.0)
            seed: Reproducibility seed
            max_output_tokens: Maximum tokens in response
            max_retries: Override default retry count
        """
        retries = max_retries if max_retries is not None else self.max_retries

        if self.provider == "google":
            # Native Gemini REST API — key in header, NOT query param
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": self.api_key,
            }
            model_name = self._resolve_google_model(headers)
            url = self._build_google_url(model_name)
            gen_config = {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens,
            }
            if seed is not None:
                gen_config["seed"] = seed

            payload = {
                "systemInstruction": {
                    "parts": [{"text": system_prompt}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}]
                    }
                ],
                "generationConfig": gen_config,
            }
        elif self.provider == 'ollama':
            # Ollama — OpenAI-compatible local server, no auth needed.
            url = f"{self.base_url}/chat/completions"
            headers = {"Content-Type": "application/json"}
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_output_tokens,
                "stream": False,
            }
            if seed is not None:
                payload["seed"] = seed
        else:
            # Generic OpenAI-compatible endpoint (e.g. LiteLLM, OpenRouter, etc.)
            url = f"{self.base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_output_tokens,
            }
            if seed is not None:
                payload["seed"] = seed

        # Ollama runs locally — inference can be slow, allow more time.
        request_timeout = 600 if self.provider == 'ollama' else 180

        for attempt in range(retries + 1):
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=request_timeout)
                response.raise_for_status()
                result = response.json()

                # Respect rate limit
                time.sleep(self.rate_limit)

                if self.provider == "google":
                    return result['candidates'][0]['content']['parts'][0]['text']
                else:
                    # Covers both 'ollama' and generic OpenAI-compatible.
                    # Reasoning models (e.g. gpt-oss-120b) may return content=None
                    # and put the answer in the 'reasoning' field instead.
                    msg = result['choices'][0]['message']
                    text = msg.get('content') or msg.get('reasoning') or ''
                    if not text:
                        raise ValueError(
                            "API returned empty content. "
                            "If using a reasoning model, the response may only contain reasoning_details."
                        )
                    return text


            except requests.HTTPError as e:
                response = e.response
                status = response.status_code if response is not None else None

                # If Google model not found, refresh model list and retry with alternate model.
                if self.provider == "google" and status == 404 and attempt < retries:
                    previous = self._resolved_google_model
                    model_name = self._resolve_google_model(headers, force_refresh=True)
                    if model_name != previous:
                        url = self._build_google_url(model_name)
                        logger.warning(
                            "Google model endpoint returned 404. Retrying with alternate model '%s'.",
                            model_name,
                        )
                        continue

                if attempt == retries:
                    if response is not None:
                        logger.error("API Error Response: %s", response.text)
                    raise

                wait_time = 2 ** (attempt + 1)
                logger.warning(
                    "API HTTP error (attempt %s/%s): %s. Retrying in %ss...",
                    attempt + 1,
                    retries + 1,
                    e,
                    wait_time,
                )
                time.sleep(wait_time)

            except Exception as e:
                if attempt == retries:
                    if 'response' in locals():
                        logger.error("API Error Response: %s", response.text)
                    raise
                # Exponential backoff: 2, 4, 8 seconds...
                wait_time = 2 ** (attempt + 1)
                logger.warning(
                    "API error (attempt %s/%s): %s. Retrying in %ss...",
                    attempt + 1,
                    retries + 1,
                    e,
                    wait_time,
                )
                time.sleep(wait_time)

        # Should never reach here, but just in case
        raise RuntimeError("Exceeded max retries")
