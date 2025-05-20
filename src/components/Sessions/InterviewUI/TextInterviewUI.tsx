'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './TextInterviewUI.module.css'; // We'll create this CSS module next

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface TextInterviewUIProps {
  initialMessages?: Message[];
  onSendMessage: (messageText: string) => void; // Callback when user sends a message
  personaName?: string;
}

const TextInterviewUI: React.FC<TextInterviewUIProps> = ({ 
  initialMessages = [], 
  onSendMessage,
  personaName = "Interviewer"
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Mock receiving a new AI message after a short delay (for demo purposes)
  useEffect(() => {
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    if (lastMessage && lastMessage.sender === 'user') {
      const timer = setTimeout(() => {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `ai-${Date.now()}`,
            text: "That's an interesting point. Can you elaborate further?",
            sender: 'ai',
            timestamp: new Date(),
          }
        ]);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    const newMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prevMessages => [...prevMessages, newMessage]);
    onSendMessage(inputText); // Call the passed-in handler
    setInputText('');
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.personaHeader}>
        <h3>{personaName}</h3>
      </div>
      <div className={styles.messagesList}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`${styles.messageBubble} ${msg.sender === 'user' ? styles.userMessage : styles.aiMessage}`}
          >
            <p className={styles.messageText}>{msg.text}</p>
            <span className={styles.timestamp}>{
              msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className={styles.inputArea}>
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type your answer..."
          rows={3}
          onKeyPress={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <button onClick={handleSendMessage} className="button">Send</button>
      </div>
    </div>
  );
};

export default TextInterviewUI; 