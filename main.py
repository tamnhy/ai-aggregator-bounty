
import os
import json

# Best Free AI Model Aggregator - static site generator
# Generates a beautiful aggregator page

MODELS = [
    {"name": "GPT-4o Free", "provider": "OpenAI", "type": "Chat", "free": "Free tier", "url": "https://chat.openai.com"},
    {"name": "Claude 3.5 Sonnet", "provider": "Anthropic", "type": "Chat", "free": "Free", "url": "https://claude.ai"},
    {"name": "Gemini 1.5 Flash", "provider": "Google", "type": "Chat", "free": "Free", "url": "https://gemini.google.com"},
    {"name": "Llama 3.1 405B", "provider": "Meta", "type": "Chat", "free": "Free via HF", "url": "https://huggingface.co"},
    {"name": "Stable Diffusion XL", "provider": "Stability", "type": "Image", "free": "Free", "url": "https://stability.ai"},
    {"name": "Whisper Large", "provider": "OpenAI", "type": "Audio", "free": "Open Source", "url": "https://github.com/openai/whisper"},
]

HTML = f"""
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Best Free AI Model Aggregator</title>
<style>
body{{font-family:Inter,system-ui;padding:40px;max-width:1000px;margin:0 auto;background:#0a0a0a;color:#fff}}
h1{{font-size:42px;margin-bottom:8px}} .sub{{color:#888;margin-bottom:32px}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}}
.card{{background:#171717;border:1px solid #262626;border-radius:16px;padding:20px;transition:0.2s}}
.card:hover{{border-color:#555;transform:translateY(-2px)}}
.badge{{display:inline-block;padding:4px 10px;border-radius:20px;font-size:12px;background:#222;border:1px solid #333;margin-bottom:10px}}
.provider{{color:#888;font-size:13px}} .name{{font-size:18px;font-weight:700;margin:6px 0}}
a{{color:#fff;text-decoration:none}} .free{{color:#22c55e;font-size:13px;margin-top:8px}}
</style></head><body>
<h1>🤖 Best Free AI Model Aggregator</h1>
<div class="sub">Curated list of 100% free, no-credit-card AI models - Updated Nov 2026</div>
<div class="grid">
{''.join([f'<div class="card"><div class="badge">{m["type"]}</div><div class="provider">{m["provider"]}</div><div class="name"><a href="{m["url"]}" target="_blank">{m["name"]}</a></div><div class="free">✓ {m["free"]}</div></div>' for m in MODELS])}
</div>
<script>console.log("Aggregator loaded")</script>
</body></html>
"""

if __name__ == "__main__":
    os.makedirs("/output", exist_ok=True)
    with open("/output/index.html", "w") as f:
        f.write(HTML)
    # Also copy to root for make.fun preview
    with open("index.html", "w") as f:
        f.write(HTML)
    print("Generated aggregator with", len(MODELS), "models -> /output/index.html")
