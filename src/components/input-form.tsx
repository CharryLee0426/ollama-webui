'use client';

import { useState, KeyboardEvent, useRef } from 'react';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface InputFormProps {
  onSendMessage: (message: string, images?: string[]) => void;
  isLoading: boolean;
}

export default function InputForm({ onSendMessage, isLoading }: InputFormProps) {
  const [input, setInput] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || images.length > 0) && !isLoading) {
      onSendMessage(input, images.length > 0 ? images : undefined);
      setInput('');
      setImages([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Remove the "data:image/jpeg;base64," prefix
          const base64String = event.target.result.toString();
          const base64Data = base64String.split(',')[1]; // Get only the data part
          
          setImages(prev => [...prev, base64Data]);
          newImages.push(base64Data);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (previewImage === `data:image/jpeg;base64,${images[index]}`) {
      setPreviewImage(null);
    }
  };

  const handleImageClick = (imageData: string) => {
    setPreviewImage(previewImage === `data:image/jpeg;base64,${imageData}` 
      ? null 
      : `data:image/jpeg;base64,${imageData}`);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closePreview}
        >
          <div className="relative max-w-4xl max-h-4xl">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 bg-black bg-opacity-50 text-white"
              onClick={closePreview}
            >
              <X className="h-5 w-5" />
            </Button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-h-[80vh] max-w-[80vw] object-contain"
            />
          </div>
        </div>
      )}

      {/* Image Thumbnails */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 w-full md:w-[60%]">
          {images.map((imageData, index) => (
            <div key={index} className="relative h-16 w-16 group">
              <img
                src={`data:image/jpeg;base64,${imageData}`}
                alt={`Uploaded ${index + 1}`}
                className="h-full w-full object-cover rounded border border-gray-300 cursor-pointer"
                onClick={() => handleImageClick(imageData)}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative w-full md:w-[60%]">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Ollama..."
          className="pr-20 resize-none"
          rows={1}
          disabled={isLoading}
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={triggerFileInput}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={(!input.trim() && images.length === 0) || isLoading}
            className="h-8 w-8"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
      </form>
    </div>
  );
}