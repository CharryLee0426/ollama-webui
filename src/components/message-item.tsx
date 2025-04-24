'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Button } from '@/components/ui/button';
import { Copy, ChevronDown } from 'lucide-react';
import { Message } from '@/types';

interface MessageItemProps {
  message: Message;
}

// Define proper types for ReactMarkdown components
interface CodeProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function MessageItem({ message }: MessageItemProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [responseCopied, setResponseCopied] = useState<boolean>(false);
  const [isThinkingOpen, setIsThinkingOpen] = useState<boolean>(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  
  // Streaming state tracking
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [thinkingContent, setThinkingContent] = useState<string>('');
  const [mainContent, setMainContent] = useState<string>('');
  const previousContentRef = useRef<string>('');

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (message.isStreaming) {
      setIsTimerRunning(true);
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 10); // Update every 10ms
      }, 10);
    } else if (isTimerRunning) {
      // Stop timer when streaming ends
      setIsTimerRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [message.isStreaming, isTimerRunning]);

  // Handle copy button timeout
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  useEffect(() => {
    if (responseCopied) {
      const timer = setTimeout(() => setResponseCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [responseCopied]);

  // Handle streaming content and thinking detection
  useEffect(() => {
    if (message.role !== 'assistant') return;

    const currentContent = message.content;
    
    // If this is the first chunk of streaming and it starts with <think>
    if (message.isStreaming && currentContent.startsWith('<think>') && !isThinking && thinkingContent === '') {
      setIsThinking(true);
      // Open thinking section automatically when streaming starts with thinking
      setIsThinkingOpen(true);
    }
    
    // Process the new content
    if (isThinking) {
      // Check if we've reached the end of thinking tag
      const endThinkIndex = currentContent.indexOf('</think>');
      
      if (endThinkIndex !== -1) {
        // We found the closing tag
        const extractedThinking = currentContent.substring(7, endThinkIndex).trim();
        setThinkingContent(extractedThinking);
        
        // Extract any main content after the thinking section
        const newMainContent = currentContent.substring(endThinkIndex + 8).trim();
        setMainContent(newMainContent);
        
        // We're no longer in thinking mode
        setIsThinking(false);
      } else {
        // We're still in thinking mode, update thinking content
        // Remove the opening <think> tag
        const extractedThinking = currentContent.substring(7).trim();
        setThinkingContent(extractedThinking);
      }
    } else {
      // Not in thinking mode - handle main content
      if (currentContent.includes('<think>')) {
        // Handle case where a complete message with thinking is provided at once
        const startThinkIndex = currentContent.indexOf('<think>');
        const endThinkIndex = currentContent.indexOf('</think>');
        
        if (endThinkIndex !== -1) {
          const extractedThinking = currentContent.substring(startThinkIndex + 7, endThinkIndex).trim();
          setThinkingContent(extractedThinking);
          
          // Extract any main content before and after the thinking section
          const beforeThinking = currentContent.substring(0, startThinkIndex).trim();
          const afterThinking = currentContent.substring(endThinkIndex + 8).trim();
          setMainContent(beforeThinking + (beforeThinking && afterThinking ? ' ' : '') + afterThinking);
        }
      } else {
        // Regular main content
        setMainContent(currentContent);
      }
    }

    // Update previous content reference
    previousContentRef.current = currentContent;
    
  }, [message.content, message.isStreaming, message.role]);

  // When streaming ends, process the complete message
  useEffect(() => {
    if (message.role !== 'assistant') return;
    
    if (!message.isStreaming && previousContentRef.current !== message.content) {
      const content = message.content;
      
      // Final processing of complete message
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
      
      if (thinkMatch) {
        const extractedThinking = thinkMatch[1].trim();
        setThinkingContent(extractedThinking);
        
        // Remove the thinking part from the main content
        const extractedMain = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        setMainContent(extractedMain);
      } else {
        // No thinking tags found in final message
        setThinkingContent('');
        setMainContent(content);
      }
      
      previousContentRef.current = content;
    }
  }, [message.isStreaming, message.content, message.role]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
  };

  const copyResponseToClipboard = () => {
    // Copy only the main content without the thinking part
    navigator.clipboard.writeText(mainContent);
    setResponseCopied(true);
  };

  const hasThinking = thinkingContent !== '';

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`${message.role === 'user' ? 'user-message' : 'assistant-message'} max-w-3xl relative w-full`}>
        {message.role === 'user' ? (
          <div>{message.content}</div>
        ) : (
          <div className="message-content">
            {/* Timer Display - always shown for assistant messages */}
            {(message.isStreaming || elapsedTime > 0) && (
              <div className="timer-display text-xs text-gray-400 mb-2">
                Generation time: {formatTime(elapsedTime)}
              </div>
            )}

            {/* Thinking Progress Section - only shown when thinking content exists */}
            {hasThinking && (
              <div className="thinking-section mb-4">
                <div 
                  className="thinking-header flex items-center cursor-pointer text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-md transition-colors"
                  onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                >
                  <ChevronDown 
                    className={`h-4 w-4 mr-1 transition-transform ${isThinkingOpen ? 'rotate-180' : ''}`}
                  />
                  <span>Thinking progress</span>
                </div>
                
                {isThinkingOpen && (
                  <div 
                    className="thinking-content mt-2 text-sm text-gray-600 bg-gray-100 p-3 rounded-md border border-gray-200 overflow-y-auto"
                    style={{ maxHeight: '15em' }} /* Approximately 10 lines of text */
                  >
                    <ReactMarkdown
                      components={{
                        code({ inline, className, children, ...props }: CodeProps) {
                          const match = /language-(\w+)/.exec(className || '');
                          const language = match ? match[1] : '';
                          const content = String(children).replace(/\n$/, '');
                          
                          if (!inline && language) {
                            return (
                              <div className="relative">
                                <SyntaxHighlighter
                                  style={tomorrow}
                                  language={language}
                                  PreTag="div"
                                  customStyle={{ fontSize: '0.8rem' }}
                                  {...props}
                                >
                                  {content}
                                </SyntaxHighlighter>
                              </div>
                            );
                          } else if (!inline) {
                            return (
                              <div className="relative">
                                <SyntaxHighlighter
                                  style={tomorrow}
                                  language="text"
                                  PreTag="div"
                                  customStyle={{ fontSize: '0.8rem' }}
                                  {...props}
                                >
                                  {content}
                                </SyntaxHighlighter>
                              </div>
                            );
                          }

                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {thinkingContent}
                    </ReactMarkdown>
                    {isThinking && message.isStreaming && (
                      <div className="h-4 w-4 ml-1 inline-block">
                        <span className="animate-pulse">▋</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Main Content */}
            <div className="main-content overflow-visible">
              {(!isThinking || mainContent) && (
                <ReactMarkdown
                  components={{
                    code({ inline, className, children, ...props }: CodeProps) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      const content = String(children).replace(/\n$/, '');
                      
                      if (!inline && language) {
                        return (
                          <div className="relative">
                            <div className="absolute right-2 top-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 bg-gray-800 bg-opacity-60 text-white hover:bg-gray-700"
                                onClick={() => copyToClipboard(content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <SyntaxHighlighter
                              style={tomorrow}
                              language={language}
                              PreTag="div"
                              {...props}
                            >
                              {content}
                            </SyntaxHighlighter>
                          </div>
                        );
                      } else if (!inline) {
                        return (
                          <div className="relative">
                            <div className="absolute right-2 top-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 bg-gray-800 bg-opacity-60 text-white hover:bg-gray-700"
                                onClick={() => copyToClipboard(content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <SyntaxHighlighter
                              style={tomorrow}
                              language="text"
                              PreTag="div"
                              {...props}
                            >
                              {content}
                            </SyntaxHighlighter>
                          </div>
                        );
                      }

                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {mainContent}
                </ReactMarkdown>
              )}
              
              {message.isStreaming && !isThinking && (
                <div className="h-4 w-4 ml-1 inline-block">
                  <span className="animate-pulse">|</span>
                </div>
              )}
            </div>

            {/* Copy Response Button */}
            {mainContent && !message.isStreaming && (
              <div className="mt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs py-1 px-2 h-7 text-gray-500 hover:text-gray-700"
                  onClick={copyResponseToClipboard}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {responseCopied ? 'Copied!' : 'Copy response'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Format elapsed time as mm:ss.ms
function formatTime(time: number) {
  const minutes = Math.floor(time / 60000);
  const seconds = Math.floor((time % 60000) / 1000);
  const milliseconds = Math.floor((time % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}