import { NextRequest, NextResponse } from 'next/server';

interface ChatRequestBody {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
}

interface OllamaResponse {
  message: {
    content: string;
  };
  done: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { model, messages } = body;

    // Connect to Ollama API running locally
    const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama API error: ${ollamaResponse.status}`);
    }

    // Stream the response back to the client
    const readable = new ReadableStream({
      async start(controller) {
        const reader = ollamaResponse.body?.getReader();
        if (!reader) {
          controller.error(new Error('Failed to get response reader'));
          return;
        }
        
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              break;
            }
            
            const text = decoder.decode(value, { stream: true });
            // Parse the JSON lines from Ollama and extract content
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            for (const line of lines) {
              try {
                const parsed = JSON.parse(line) as OllamaResponse;
                if (parsed.message?.content) {
                  controller.enqueue(new TextEncoder().encode(parsed.message.content));
                }
              } catch (e) {
                console.error('Error parsing JSON line:', e);
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}