<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1olLQmZU4xBtEN05sLL72GWW4xae_ARvA

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set one of these in `.env.local`:
   - `OPENAI_API_KEY` (preferred, enables GPT)
   - `GEMINI_API_KEY` (fallback)
3. Optional model overrides:
   - `OPENAI_MODEL` (default: `gpt-4o-mini`)
   - `OPENAI_CHAT_MODEL` (defaults to `OPENAI_MODEL`)
4. Run the app:
   `npm run dev`
