'use client';

// import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { OllamaModel } from '@/types';
import { ModeToggle } from './mode-toggle';

interface NavbarProps {
  currentModel: string | null;
  models: OllamaModel[];
  onModelChange: (model: string) => void;
}

export default function Navbar({ currentModel, models, onModelChange }: NavbarProps) {
  return (
    <header className="border-b bg-white/70 dark:bg-black/70 backdrop-blur-lg shadow-sm">
      <div className="container h-14 flex items-center px-4 md:px-6">
        <div className="mr-4 flex">
          <a className="flex items-center gap-2 font-semibold" href="#">
            <span className="font-bold">Ollama WebUI</span>
          </a>
        </div>
        <div className="flex-1 flex justify-center">
          {currentModel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  {currentModel} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {models.map((model) => (
                  <DropdownMenuItem 
                    key={model.name} 
                    onClick={() => onModelChange(model.name)}
                    className={currentModel === model.name ? "bg-slate-100" : ""}
                  >
                    {model.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className='ml-auto'>
            <ModeToggle />
        </div>
      </div>
    </header>
  );
}