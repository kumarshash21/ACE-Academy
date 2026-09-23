"use client";

import React, { useEffect, useRef, useState } from "react";
import { FAQ_KNOWLEDGE_BASE } from "@/lib/chatbot/knowledge-base";
import { getBotReply } from "@/lib/chatbot/engine";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
}

const GREETING: ChatMessage = {
  id: "greeting",
  role: "bot",
  text: "Hi, I'm AceBot 👋 Ask me about assessments, certifications, or how ACE Academy works.",
};

const SUGGESTED_QUESTIONS = FAQ_KNOWLEDGE_BASE.slice(0, 4);

let nextId = 1;
function makeId() {
  nextId += 1;
  return `m${nextId}`;
}

export default function AceBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [...prev, { id: makeId(), role: "user", text }]);
    setDraft("");
    setIsTyping(true);

    // Simulated latency keeps room for a real backend/LLM call later —
    // callers of getBotReply won't need to change when this becomes async.
    window.setTimeout(() => {
      const { answer } = getBotReply(text);
      setMessages((prev) => [...prev, { id: makeId(), role: "bot", text: answer }]);
      setIsTyping(false);
    }, 450);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage(draft);
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="acebot-root">
      {isOpen && (
        <div className="acebot-panel" role="dialog" aria-label="AceBot chat">
          <div className="acebot-header">
            <div className="acebot-header-id">
              <div className="acebot-avatar">AB</div>
              <div>
                <div className="acebot-title">AceBot</div>
                <div className="acebot-subtitle">
                  <span className="acebot-status-dot" /> Online
                </div>
              </div>
            </div>
            <button
              type="button"
              className="acebot-close"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="acebot-messages" ref={scrollRef}>
            {messages.map((message) => (
              <div key={message.id} className={`acebot-bubble-row ${message.role}`}>
                <div className={`acebot-bubble ${message.role}`}>{message.text}</div>
              </div>
            ))}

            {isTyping && (
              <div className="acebot-bubble-row bot">
                <div className="acebot-bubble bot acebot-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            {showSuggestions && !isTyping && (
              <div className="acebot-suggestions">
                {SUGGESTED_QUESTIONS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="acebot-chip"
                    onClick={() => sendMessage(entry.question)}
                  >
                    {entry.question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="acebot-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="acebot-input"
              placeholder="Ask a question..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={300}
            />
            <button type="submit" className="acebot-send" disabled={!draft.trim() || isTyping}>
              ➤
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="acebot-fab"
        aria-label={isOpen ? "Close AceBot" : "Open AceBot"}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "✕" : "💬"}
      </button>
    </div>
  );
}
