import { OllamaModel } from '@/types';

interface OllamaTagsResponse {
  models: OllamaModel[];
}

export async function getModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    const data: OllamaTagsResponse = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}