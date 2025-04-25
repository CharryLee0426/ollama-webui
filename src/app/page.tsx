'use client';

import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/navbar';
import ChatContainer from '@/components/chat-container';
import InputForm from '@/components/input-form';
import { getModels } from '@/lib/api';
import { Message, OllamaModel } from '@/types';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const availableModels = await getModels();
        setModels(availableModels);
        if (availableModels.length > 0) {
          setCurrentModel(availableModels[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };

    fetchModels();
  }, []);

  const handleSendMessage = async (content: string, images?: string[]) => {
    if ((!content.trim() && (!images || images.length === 0)) || !currentModel) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      images: images
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Add assistant message placeholder
    const assistantMessageId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          images: images,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Ollama');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }
      
      const decoder = new TextDecoder();
      let responseContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        responseContent += chunk;
        
        // Update the assistant message with the accumulated content
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: responseContent } 
              : msg
          )
        );
      }

      // Mark message as no longer streaming
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );
    } catch (error) {
      console.error('Error during chat:', error);
      // Update the assistant message to show the error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: 'Error: Failed to get response from Ollama. Please check if the service is running.', isStreaming: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleModelChange = (model: string) => {
    setCurrentModel(model);
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar currentModel={currentModel} models={models} onModelChange={handleModelChange} />
      <main className="flex-grow overflow-hidden flex flex-col">
        <ChatContainer ref={chatContainerRef} messages={messages} />
        <div className="p-4 border-t">
          <InputForm onSendMessage={handleSendMessage} isLoading={isLoading} />
          <div className="text-xs text-center mt-2 text-gray-500">
            LLM may make mistakes especially local models
          </div>
        </div>
      </main>
    </div>
  );
}
