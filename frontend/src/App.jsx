/**
 * File: App.js
 * Description: Clean responsive Moriones chat interface.
 * Version: 3.0.0
 */

import { useEffect, useRef, useState } from 'react';
import './styles.css';

const STARTER_PROMPTS = [
  'What is the Moriones Festival?',
  'When is the Moriones Festival held?',
  'Who is Longinus in the Moriones Festival story?',
  'Why do people join the Moriones Festival as penitents?',
];

const APP_CONFIG = {
  API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  MAX_TEXTAREA_HEIGHT: 160,
  ASSISTANT_NAME: 'MorionKnow AI',
  INITIAL_MESSAGE:
    'MorionKnow AI is grounded, strict, and limited to verified Moriones Festival sources only. How can I help your research today?',
};

function parseJsonSafely(text) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unable to reach the backend.';
}

function SourceIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
  );
}

function UserAvatar() {
  return <div className="user-avatar">Y</div>;
}

function AssistantAvatar() {
  return (
    <div className="assistant-avatar" aria-hidden="true">
      <img src="/model.gif" alt="MorionKnow AI" className="assistant-avatar-gif" />
    </div>
  );
}

function Message({ item }) {
  const isAssistant = item.role === 'assistant';

  return (
    <div className={`message-row ${item.role}`}>
      <div className="message-wrap">
        {isAssistant ? <AssistantAvatar /> : <UserAvatar />}

        <div className={`message-card ${item.role}`}>
          <div className="message-head">
            <span className={`message-role ${isAssistant ? 'assistant' : 'user'}`}>
              {isAssistant ? APP_CONFIG.ASSISTANT_NAME : 'You'}
            </span>
          </div>

          <div className="message-body">
            <p>{item.content}</p>
          </div>

          {Array.isArray(item.citations) && item.citations.length > 0 ? (
            <div className="citations">
              {item.citations.map((citation, index) => (
                <a
                  key={`${citation}-${index}`}
                  href={citation}
                  target="_blank"
                  rel="noreferrer"
                  className="citation-link"
                >
                  <SourceIcon />
                  <span>Source {index + 1}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="message-row assistant">
      <div className="message-wrap">
        <div className="typing-avatar-placeholder"></div>

        <div className="message-card assistant loading-card">
          <div className="typing-dots" aria-label="Assistant is typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const chatLogRef = useRef(null);
  const textareaRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: APP_CONFIG.INITIAL_MESSAGE,
      citations: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!chatLogRef.current) {
      return;
    }

    chatLogRef.current.scrollTo({
      top: chatLogRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, loading]);

  useEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      APP_CONFIG.MAX_TEXTAREA_HEIGHT
    )}px`;
  }, [input]);

  async function sendMessage(messageText) {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage = {
      role: 'user',
      content: trimmedMessage,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput('');
    setErrorText('');
    setLoading(true);
    setSidebarOpen(false);

    try {
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      });

      const responseText = await response.text();
      const data = parseJsonSafely(responseText);

      if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.answer || 'No response was returned.',
        citations: Array.isArray(data.citations) ? data.citations : [],
      };

      setMessages((currentMessages) => [...currentMessages, assistantMessage]);
    } catch (error) {
      setErrorText(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function handleTextareaKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function handlePromptClick(prompt) {
    void sendMessage(prompt);
  }

  function handleSubmit(event) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <main className="app-shell">
      <div
        className={`mobile-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-inner">
            <div className="sidebar-brand">
              <p className="eyebrow">Strict Research Mode</p>
              <h1>
                MorionKnow <span>AI</span>
              </h1>
              <p className="sidebar-description">
                Verified Moriones assistant with a clean responsive workspace.
              </p>
            </div>

            <div className="sidebar-section trust-box">
              <p className="sidebar-section-title">Trust Layer</p>
              <p>
                Answers stay limited to verified Moriones Festival source materials only.
              </p>
            </div>
          </div>
        </aside>

        <section className="chat-stage">
          <div className="chat-log" ref={chatLogRef}>
            <div className="chat-log-inner">
              {messages.map((item, index) => (
                <Message key={`${item.role}-${index}`} item={item} />
              ))}

              {loading ? <TypingIndicator /> : null}

              <section className="chat-starter-panel" aria-label="Research starters">
                <div className="chat-starter-grid">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="chat-starter-button"
                      onClick={() => handlePromptClick(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>

              <div className="chat-bottom-space"></div>
            </div>
          </div>

          <div className="composer-zone">
            <div className="composer-card">
              <form className="composer-form" onSubmit={handleSubmit}>
                <textarea
                  ref={textareaRef}
                  className="composer-textarea"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Ask MorionKnow AI..."
                  rows={1}
                />

                <button
                  type="submit"
                  className="send-button"
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                >
                  <SendIcon />
                </button>
              </form>

              <div className="composer-footer">
                {errorText ? (
                  <span className="error-text">{errorText}</span>
                ) : (
                  <span>Verified responses only.</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
