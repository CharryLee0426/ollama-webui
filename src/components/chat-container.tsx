'use client';

import { useEffect, useRef, forwardRef, useState } from 'react';
import MessageItem from '@/components/message-item';
import { Message } from '@/types';
import { cn } from '@/lib/utils';

interface ChatContainerProps {
  messages: Message[];
}

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  ({ messages }, ref) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const [prevMessageCount, setPrevMessageCount] = useState(0);
    const [userHasScrolled, setUserHasScrolled] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    
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

    const closeImagePreview = () => {
      setExpandedImage(null);
    };
    
    // Function to expand image when thumbnail is clicked
    const handleImageClick = (imageData: string) => {
      setExpandedImage(`data:image/jpeg;base64,${imageData}`);
    };

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
          <div key={message.id}>
            {/* Show image thumbnails if message has images */}
            {message.images && message.images.length > 0 && (
              <div className={cn(
                "flex flex-wrap gap-2 mb-2", 
                message.role === 'user' ? "justify-end" : "justify-start"
              )}>
                {message.images.map((image, idx) => (
                  <div key={idx} className="relative h-16 w-16">
                    <img
                      src={`data:image/jpeg;base64,${image}`}
                      alt={`Attached ${idx + 1}`}
                      className="h-full w-full object-cover rounded border border-gray-300 cursor-pointer"
                      onClick={() => handleImageClick(image)}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {/* Use your existing MessageItem component */}
            <MessageItem message={message} />
          </div>
        ))}
        
        {/* Image preview modal */}
        {expandedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={closeImagePreview}
          >
            <div className="relative max-w-4xl max-h-4xl">
              <button 
                className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1"
                onClick={closeImagePreview}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <img 
                src={expandedImage} 
                alt="Preview" 
                className="max-h-[80vh] max-w-[80vw] object-contain"
              />
            </div>
          </div>
        )}
        
        <div ref={endOfMessagesRef} />
      </div>
    );
  }
);

ChatContainer.displayName = 'ChatContainer';

export default ChatContainer;