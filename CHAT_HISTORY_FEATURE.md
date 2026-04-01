# Chat History Feature

## What's New

Added a ChatGPT-style chat history sidebar with local storage persistence!

## Features

✅ **New Chat Button** - Start fresh conversations anytime
✅ **Chat History List** - See all your previous chats in the sidebar
✅ **Auto-Save** - Chats are automatically saved to localStorage
✅ **Persistent** - All chats survive page refreshes
✅ **Active Chat Indicator** - Highlighted current chat
✅ **Delete Chats** - Remove unwanted conversations
✅ **Smart Titles** - Auto-generated from first message
✅ **Timestamps** - Shows when each chat was last updated (e.g., "2m ago", "3h ago")

## How It Works

1. **Start a new chat** - Click the "New Chat" button or just start typing
2. **Switch between chats** - Click any chat in the history to load it
3. **Delete chats** - Hover over a chat and click the trash icon
4. **Everything persists** - Close the browser, refresh the page - your chats are safe!

## Technical Details

- Uses `localStorage` for persistence
- Each chat has a unique ID, title, messages, and timestamps
- Current chat is tracked separately for quick loading
- Mobile-responsive with the existing sidebar toggle

## Storage Keys

- `morionknow_chats` - Array of all chat objects
- `morionknow_current_chat` - ID of the currently active chat
