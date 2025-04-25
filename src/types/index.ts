export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  images?: string[];  // Added for image support
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  format?: string;
  family?: string;
  parameter_size?: string;
  quantization_level?: string;
}