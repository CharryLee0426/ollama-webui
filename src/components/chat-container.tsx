'use client';

import { useEffect, useRef, forwardRef } from 'react';
import MessageItem from '@/components/message-item';
import { Message } from '@/types';

interface ChatContainerProps {
  messages: Message[];
}

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  ({ messages }, ref) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
      <div 
        ref={ref} 
        className="flex-grow overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Ollama WebUI</h2>
              <p>Start a conversation with your local LLM</p>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        <div ref={endOfMessagesRef} />
      </div>
    );
  }
);

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;