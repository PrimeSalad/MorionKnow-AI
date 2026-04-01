# MoreYun AI

MoreYun AI is a grounded chatbot about the Moriones Festival. It uses a React frontend and an Express backend powered by the Gemini API.

## Setup

1. Create `backend/.env` from `backend/.env.example`.
2. Add your Gemini API key.
3. Install dependencies with `npm run install:all`.
4. Start both apps with `npm run dev`.

## Notes

- The chatbot only answers from the material in `text/moriones_data.txt`.
- If a question is not supported by the source data, the bot refuses to answer.
