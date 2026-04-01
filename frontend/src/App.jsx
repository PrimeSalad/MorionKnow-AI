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

function TrashIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
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
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
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

function MicIcon({ isListening }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={isListening ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
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

  // Load chat history from localStorage
  const loadChatHistory = () => {
    try {
      const saved = localStorage.getItem('morionknow_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    return [];
  };

  const loadCurrentChatId = () => {
    try {
      const saved = localStorage.getItem('morionknow_current_chat');
      return saved || null;
    } catch (error) {
      console.error('Failed to load current chat ID:', error);
    }
    return null;
  };

  const [chatHistory, setChatHistory] = useState(loadChatHistory);
  const [currentChatId, setCurrentChatId] = useState(loadCurrentChatId);
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
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Load current chat on mount or when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      const chat = chatHistory.find(c => c.id === currentChatId);
      if (chat) {
        setMessages(chat.messages);
      }
    } else {
      // No chat selected, show initial message
      setMessages([
        {
          role: 'assistant',
          content: APP_CONFIG.INITIAL_MESSAGE,
          citations: [],
        },
      ]);
    }
  }, [currentChatId, chatHistory]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('morionknow_chats', JSON.stringify(chatHistory));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }, [chatHistory]);

  // Save current chat ID to localStorage
  useEffect(() => {
    try {
      if (currentChatId) {
        localStorage.setItem('morionknow_current_chat', currentChatId);
      } else {
        localStorage.removeItem('morionknow_current_chat');
      }
    } catch (error) {
      console.error('Failed to save current chat ID:', error);
    }
  }, [currentChatId]);

  // Update current chat in history whenever messages change
  useEffect(() => {
    if (currentChatId && messages.length > 1) {
      setChatHistory(prev => {
        const updated = prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages,
              updatedAt: Date.now(),
              title: chat.title || messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'New Chat'
            };
          }
          return chat;
        });
        return updated;
      });
    }
  }, [messages, currentChatId]);

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
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

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

    // Create new chat if none exists
    if (!currentChatId) {
      const newChatId = `chat_${Date.now()}`;
      const newChat = {
        id: newChatId,
        title: trimmedMessage.slice(0, 50),
        messages: [
          {
            role: 'assistant',
            content: APP_CONFIG.INITIAL_MESSAGE,
            citations: [],
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setChatHistory(prev => [newChat, ...prev]);
      setCurrentChatId(newChatId);
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

  async function toggleVoiceInput() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorText('Voice input is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
    } else {
      // Start recording
      try {
        setErrorText('');
        audioChunksRef.current = [];
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          
          // Send to backend for transcription
          await transcribeAudio(audioBlob);
        };

        mediaRecorder.start();
        setIsListening(true);
        console.log('Recording started');
      } catch (e) {
        console.error('Error starting recording:', e);
        setErrorText('Failed to start voice input. Please check microphone permissions.');
        setIsListening(false);
      }
    }
  }

  async function transcribeAudio(audioBlob) {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed.');
      }

      if (data.text) {
        setInput((prev) => prev + (prev ? ' ' : '') + data.text);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setErrorText(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function createNewChat() {
    setCurrentChatId(null);
    setMessages([
      {
        role: 'assistant',
        content: APP_CONFIG.INITIAL_MESSAGE,
        citations: [],
      },
    ]);
    setSidebarOpen(false);
  }

  function selectChat(chatId) {
    setCurrentChatId(chatId);
    setSidebarOpen(false);
  }

  function deleteChat(chatId, event) {
    event.stopPropagation();
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  }

  function formatChatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
            <div className="sidebar-mobile-actions">
              <button
                type="button"
                className="sidebar-close-button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>

            <div className="sidebar-brand">
              <p className="eyebrow">Strict Research Mode</p>
              <h1>
                <span className="brand-gradient">MorionKnow</span>{' '}
                <span className="brand-suffix">AI</span>
              </h1>
              <p className="sidebar-description">
                Verified Moriones assistant with a clean responsive workspace.
              </p>
            </div>

            <button
              type="button"
              className="new-chat-button"
              onClick={createNewChat}
            >
              <PlusIcon />
              <span>New Chat</span>
            </button>

            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Chat History</h3>
              <div className="chat-history-list">
                {chatHistory.length === 0 ? (
                  <p className="empty-history">No chats yet. Start a conversation!</p>
                ) : (
                  chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className={`chat-history-item ${currentChatId === chat.id ? 'active' : ''}`}
                      onClick={() => selectChat(chat.id)}
                    >
                      <div className="chat-history-content">
                        <div className="chat-history-title">{chat.title}</div>
                        <div className="chat-history-date">{formatChatDate(chat.updatedAt)}</div>
                      </div>
                      <button
                        type="button"
                        className="chat-history-delete"
                        onClick={(e) => deleteChat(chat.id, e)}
                        aria-label="Delete chat"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sidebar-footer">
              <p className="sidebar-footer-text">
                Developed by:<br />
                <strong>Gene Elpie Landoy</strong><br />
                <span className="footer-company">DotOrbit</span>
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

              {messages.length === 1 ? (
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
              ) : null}

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

                <div className="composer-actions">
                  <button
                    type="button"
                    className={`mic-button ${isListening ? 'listening' : ''}`}
                    onClick={toggleVoiceInput}
                    disabled={loading}
                    aria-label={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    <MicIcon isListening={isListening} />
                  </button>

                  <button
                    type="submit"
                    className="send-button"
                    disabled={loading || !input.trim()}
                    aria-label="Send message"
                  >
                    <SendIcon />
                  </button>
                </div>
              </form>

              {errorText && (
                <div className="composer-footer">
                  <span className="error-text">{errorText}</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
