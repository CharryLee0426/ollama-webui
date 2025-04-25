import { NextRequest, NextResponse } from 'next/server';

interface ChatRequestBody {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  images?: string[]; // Optional array of base64 image data
  stream?: boolean;
}

interface OllamaResponse {
  message: {
    content: string;
  };
  done: boolean;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body: ChatRequestBody = await req.json();
    const { model, messages, images, stream = true } = body;

    // Validate required fields
    if (!model) {
      return NextResponse.json(
        { error: 'Missing required field: model' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid required field: messages' },
        { status: 400 }
      );
    }

    // Validate images format if provided
    if (images && !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Invalid format: images must be an array' },
        { status: 400 }
      );
    }

    // Determine which endpoint and request format to use based on images presence
    const hasImages = images && images.length > 0;
    const endpoint = hasImages 
      ? 'http://localhost:11434/api/generate' 
      : 'http://localhost:11434/api/chat';
    
    // Prepare the request body based on whether we have images
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestBody: any;
    let timeOutSec = 1000000; // Default timeout for fetch
    
    if (hasImages) {
      // Format for /api/generate with images
      // Extract prompt from the first user message
      const userMessage = messages.find(msg => msg.role.toLowerCase() === 'user');
      if (!userMessage) {
        return NextResponse.json(
          { error: 'No user message found in messages array' },
          { status: 400 }
        );
      }
      
      requestBody = {
        model,
        prompt: userMessage.content,
        images,
        stream
      };

      timeOutSec = 100000000; // Increase timeout for image generation
    } else {
      // Standard format for /api/chat without images
      requestBody = {
        model,
        messages,
        stream
      };
    }

    console.log('Request body:', requestBody);

    // Connect to Ollama API running locally
    let ollamaResponse;
    try {
      ollamaResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Add timeout to prevent hanging if service is not responding
        signal: AbortSignal.timeout(timeOutSec) // 10 second timeout
      });
    } catch (fetchError) {
      console.error(`Failed to connect to Ollama at ${endpoint}:`, fetchError);
      
      // Handle different connection error types
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch failed')) {
        return NextResponse.json(
          { error: 'Failed to get response from Ollama. Please check if the service is running.' },
          { status: 503 }
        );
      } else if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Ollama service connection timed out. Please check if the service is running properly.' },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to connect to Ollama service', 
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error' 
        },
        { status: 503 }
      );
    }

    if (!ollamaResponse) {
      return NextResponse.json(
        { error: 'Failed to get response from Ollama. Please check if the service is running.' },
        { status: 503 }
      );
    }

    if (!ollamaResponse.ok) {
      let errorText;
      try {
        errorText = await ollamaResponse.text();
      } catch {
        errorText = 'Unknown error';
      }
      
      console.error(`Ollama API error (${ollamaResponse.status}):`, errorText);
      
      // Handle specific HTTP status codes from Ollama
      if (ollamaResponse.status === 404) {
        return NextResponse.json(
          { error: `Model '${model}' not found in Ollama` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: `Ollama API error: ${ollamaResponse.status}`,
          details: errorText
        },
        { status: ollamaResponse.status }
      );
    }

    // Handle non-streaming response
    if (!stream) {
      try {
        const data = await ollamaResponse.json();
        
        // Normalize /api/generate response to match /api/chat format for non-streaming
        if (hasImages && data) {
          return NextResponse.json({
            model: data.model,
            created_at: data.created_at,
            message: {
              role: 'assistant',
              content: data.response || ''
            },
            done_reason: data.done_reason || 'stop',
            done: data.done,
            total_duration: data.total_duration,
            load_duration: data.load_duration,
            prompt_eval_count: data.prompt_eval_count,
            prompt_eval_duration: data.prompt_eval_duration,
            eval_count: data.eval_count,
            eval_duration: data.eval_duration
          });
        }
        
        return NextResponse.json(data);
      } catch (jsonError) {
        console.error('Error parsing Ollama response as JSON:', jsonError);
        return NextResponse.json(
          { error: 'Invalid response from Ollama service' },
          { status: 502 }
        );
      }
    }

    // Stream the response back to the client
    const readable = new ReadableStream({
      async start(controller) {
        const reader = ollamaResponse.body?.getReader();
        if (!reader) {
          controller.error(new Error('Failed to get response reader'));
          controller.close();
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
                if (hasImages) {
                  // Handle /api/generate response format
                  const parsed = JSON.parse(line) as OllamaGenerateResponse;
                  if (parsed.response) {
                    controller.enqueue(new TextEncoder().encode(parsed.response));
                  }
                } else {
                  // Handle /api/chat response format
                  const parsed = JSON.parse(line) as OllamaResponse;
                  if (parsed.message?.content) {
                    controller.enqueue(new TextEncoder().encode(parsed.message.content));
                  }
                }
              } catch (e) {
                console.error('Error parsing JSON line:', e);
                // Continue processing other lines even if one fails
              }
            }
          }
        } catch (streamError) {
          console.error('Error while streaming response:', streamError);
          controller.error(new Error('Error streaming response from Ollama service'));
        } finally {
          try {
            reader.releaseLock();
          } catch (e) {
            console.error('Error releasing reader lock:', e);
          }
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
    
    // Determine if it's a parsing error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.message },
        { status: 400 }
      );
    }
    
    // Handle other types of errors
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}