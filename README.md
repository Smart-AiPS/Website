# Smart AiPS — Website + Aipsy

Production-ready frontend for Smart AiPS with the Aipsy site assistant.

```
.
├── index.html                 # Main landing page
├── smartaips-assistant.js     # Aipsy (wired for Claude / any LLM endpoint)
├── assets/
│   ├── logo.webp
│   ├── aipsy-mascot.webp
│   └── aipsy-mascot-blink.webp
└── README.md
```

## Quick start

1. **Set your Claude endpoint**  
   Open `smartaips-assistant.js` and find the `CONFIG` block at the top.  
   Paste your API Gateway / Function URL into `apiEndpoint`:

   ```js
   apiEndpoint: "https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/chat",
   ```

2. **Deploy these three things together** (keep the folder structure):
   - `index.html`
   - `smartaips-assistant.js`
   - the entire `assets/` folder

3. **Backend contract** (what your Claude Lambda must accept / return)

   **Request**
   ```json
   {
     "message": "how long does a pilot take?",
     "history": [{ "role": "user", "content": "..." }],
     "section": "how-we-work"
   }
   ```

   **Response**
   ```json
   {
     "reply": "Usually 4–8 weeks for a focused pilot.",
     "target": "#how-we-work",
     "chips": [
       { "label": "What it costs", "ask": "what does a pilot cost" }
     ]
   }
   ```

   - `target` and `chips` are optional.
   - If the endpoint errors or times out, Aipsy silently falls back to the built-in local knowledge so the site never breaks.
   - Lead submissions also POST to the same endpoint as `{ "type": "lead", "lead": {...} }`.

4. **CORS**  
   Your API must allow `POST` + `OPTIONS` and the `Content-Type` header.  
   Origin can be `*` while testing; tighten to your domain later.

## What is already included

- Streaming support (SSE). If your backend returns `text/event-stream`, replies type out live. If it returns normal JSON, that still works.
- Section awareness, rail navigation, lead capture, intro gate, and the corner buddy.
- All required image assets (logo + mascot open/blink).

## Optional next steps

- Put a strong system prompt in your Claude / Bedrock Lambda (see the companion upgrade guide).
- Switch most traffic to a faster model (e.g. Claude Haiku) and escalate only complex questions.
- Add a Bedrock Knowledge Base and retrieve relevant chunks into the prompt (RAG).
- Store leads in DynamoDB or send a Slack/email notification.

## Local testing

Just open `index.html` in a browser (or serve the folder with any static server).  
With `apiEndpoint` empty, Aipsy uses the built-in keyword knowledge.  
Once you set a real endpoint, he will call it.

## Notes

- The standalone single-file HTML is **not** required for the live site.
- Do not rename the files inside `assets/` — the JS looks for these exact names.
- Privacy / Terms links in the footer are still placeholders.
