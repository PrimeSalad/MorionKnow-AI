# MorionKnow AI

MorionKnow AI is a grounded chatbot about the Moriones Lenten rites. It uses a React frontend and an Express backend powered by the Gemini API with real-time web search for credible sources.

## Features

- Grounded responses using verified knowledge base
- Real-time web search integration (Tavily API) for credible sources
- Prioritizes official sources: .gov.ph, UNESCO, academic institutions
- Bilingual support (English/Tagalog)
- Source citation for all answers

## Setup

1. Create `backend/.env` from `backend/.env.example`
2. Add your Gemini API key
3. (Optional) Add Tavily API key for real web search - get free key at https://tavily.com
4. Install dependencies: `npm run install:all`
5. Start both apps: `npm run dev`

## Source Credibility

The chatbot ensures accuracy by:
- Using verified knowledge base from UNESCO and Philippine government sources
- Searching only credible domains (.gov.ph, unesco.org, academic sites)
- Always citing exact source URLs
- Refusing to answer if no credible information is available

## Notes

- Without Tavily API key, bot uses only the knowledge base in `text/moriones_data.txt`
- With Tavily API key, bot searches credible web sources for comprehensive answers
- Bot only answers questions about Moriones Lenten rites
