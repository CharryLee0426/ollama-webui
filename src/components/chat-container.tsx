'use client';

import { useEffect, useRef, forwardRef, useState } from 'react';
import MessageItem from '@/components/message-item';
import { Message } from '@/types';

interface ChatContainerProps {
  messages: Message[];
}

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  ({ messages }, ref) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const [prevMessageCount, setPrevMessageCount] = useState(0);
    const [userHasScrolled, setUserHasScrolled] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Track user scrolling
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleScroll = () => {
        // Check if user has scrolled up from bottom
        const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 30;
        setUserHasScrolled(!isAtBottom);
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
      // Auto-scroll in these conditions:
      // 1. A new message is added
      // 2. The last message is being updated AND user hasn't scrolled away
      const isNewMessage = messages.length > prevMessageCount;
      const isLastMessageUpdating = messages.length > 0 && 
                                   messages[messages.length - 1].isStreaming;
      
      if (isNewMessage || (isLastMessageUpdating && !userHasScrolled)) {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      // Reset userHasScrolled when a new message is added
      if (isNewMessage) {
        setUserHasScrolled(false);
      }

      setPrevMessageCount(messages.length);
    }, [messages, prevMessageCount, userHasScrolled]);

    return (
      <div 
        ref={(node) => {
          // Handle both the forwarded ref and our local ref
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          containerRef.current = node;
        }}
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