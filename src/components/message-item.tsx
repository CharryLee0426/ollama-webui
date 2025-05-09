'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Button } from '@/components/ui/button';
import { Copy, ChevronDown, User, Bot } from 'lucide-react';
import { Message } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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

  // Format elapsed time as mm:ss.ms
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex gap-3 max-w-3xl mx-auto",
      message.role === 'user' ? "justify-end" : "justify-start"
    )}>
      {message.role === 'assistant' && (
        <Avatar className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
          <Bot className="h-5 w-5 text-blue-600 dark:text-blue-300" />
        </Avatar>
      )}
      
      <div className={cn(
        "flex flex-col space-y-2",
        message.role === 'user' ? "items-end" : "items-start",
        "max-w-[80%]"
      )}>
        <div className={cn(
          "rounded-lg p-4 w-full",
          message.role === 'user' 
            ? "bg-blue-500 text-white rounded-br-none" 
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none"
        )}>
          {message.role === 'user' ? (
            <div>{message.content}</div>
          ) : (
            <div className="message-content">
              {/* Timer Display */}
              {(message.isStreaming || elapsedTime > 0) && (
                <div className="timer-display text-xs text-muted-foreground mb-2">
                  Generation time: {formatTime(elapsedTime)}
                </div>
              )}

              {/* Thinking Progress Section */}
              {hasThinking && (
                <div className="thinking-section mb-4">
                  <div 
                    className="thinking-header flex items-center cursor-pointer text-sm text-muted-foreground hover:text-foreground hover:bg-accent p-1 rounded-md transition-colors"
                    onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                  >
                    <ChevronDown 
                      className={`h-4 w-4 mr-1 transition-transform ${isThinkingOpen ? 'rotate-180' : ''}`}
                    />
                    <span>Thinking progress</span>
                  </div>
                  
                  {isThinkingOpen && (
                    <div 
                      className="thinking-content mt-2 text-sm text-foreground bg-muted dark:bg-gray-900/50 p-3 rounded-md border border-border dark:border-gray-700 overflow-y-auto"
                      style={{ maxHeight: '15em' }}
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
                  <div className="prose dark:prose-invert max-w-none">
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
                                    className="h-6 w-6 bg-gray-800 bg-opacity-60 text-white hover:bg-gray-700 dark:bg-gray-700 dark:bg-opacity-60 dark:hover:bg-gray-600"
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
                                    className="h-6 w-6 bg-gray-800 bg-opacity-60 text-white hover:bg-gray-700 dark:bg-gray-700 dark:bg-opacity-60 dark:hover:bg-gray-600"
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
                  </div>
                )}
                
                {message.isStreaming && !isThinking && (
                  <div className="h-4 w-4 ml-1 inline-block">
                    <span className="animate-pulse">▋</span>
                  </div>
                )}
              </div>

              {/* Copy Response Button */}
              {mainContent && !message.isStreaming && (
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 px-2 h-7 text-muted-foreground hover:text-foreground"
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
      
      {message.role === 'user' && (
        <Avatar className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </Avatar>
      )}
    </div>
  );
}
