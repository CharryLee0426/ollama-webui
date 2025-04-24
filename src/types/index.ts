export interface Message {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    isStreaming?: boolean;
}

export interface OllamaModel {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
      format: string;
      family: string;
      families: string[];
      parameter_size: string;
      quantization_level: string;
    };
}