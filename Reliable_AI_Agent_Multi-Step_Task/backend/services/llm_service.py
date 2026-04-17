"""Unified LLM service for OpenAI/Anthropic requests with fallback support."""

from __future__ import annotations

from time import perf_counter

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from agent.reliability import get_fallback_chain
from config import get_settings


async def call_llm(prompt: str) -> dict[str, object]:
    """Call configured LLM providers in fallback order and return normalized output."""
    settings = get_settings()
    openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    for model_name in get_fallback_chain():
        started = perf_counter()
        try:
            if model_name.startswith("claude"):
                message = await anthropic_client.messages.create(
                    model=model_name,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                text = "".join(block.text for block in message.content if hasattr(block, "text"))
                latency_ms = int((perf_counter() - started) * 1000)
                return {"text": text, "tokens_used": 0, "latency_ms": latency_ms, "model_used": model_name}

            response = await openai_client.responses.create(model=model_name, input=prompt)
            text = getattr(response, "output_text", "")
            latency_ms = int((perf_counter() - started) * 1000)
            return {"text": text, "tokens_used": 0, "latency_ms": latency_ms, "model_used": model_name}
        except Exception:
            # TODO: Feed exceptions into circuit breaker + retry policy before moving to next fallback model.
            continue

    return {"text": "", "tokens_used": 0, "latency_ms": 0, "model_used": "", "error": "All LLM providers failed"}
