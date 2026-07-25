'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string) => void;
  disabled?: boolean;
  isWaitingInput?: boolean;
}

export default function ChatInput({ onSend, disabled, isWaitingInput }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Auto-focus when waiting for input
  useEffect(() => {
    if (isWaitingInput && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isWaitingInput]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim(), imageBase64 || undefined);
      setInput('');
      setImageFile(null);
      setImageBase64(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Keep the full data URL (e.g., data:image/webp;base64,...)
        setImageBase64(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
            const res = await fetch(`${baseUrl}/api/voice/transcribe`, {
              method: 'POST',
              body: formData,
            });
            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                setInput(prev => prev + (prev ? ' ' : '') + data.text);
              }
            } else {
              console.error("Transcription failed", await res.text());
            }
          } catch (err) {
            console.error("Transcription error", err);
          }
          
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone", err);
      }
    }
  };

  const placeholder = isWaitingInput
    ? 'Type your response...'
    : isRecording 
      ? 'Listening...' 
      : 'Command PersonalAI...';

  return (
    <div className="flex flex-col gap-2 w-full">
      {imageFile && (
        <div className="flex items-center gap-2 px-3 py-1.5 w-max bg-white/5 border border-white/10 rounded-lg text-xs text-on-surface">
          <span className="material-symbols-outlined text-[14px]">image</span>
          <span className="truncate max-w-[150px]">{imageFile.name}</span>
          <button onClick={() => { setImageFile(null); setImageBase64(null); }} className="hover:text-red-400">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}
      <div className={`relative flex items-center glass-card rounded-xl glass-input p-2 transition-all duration-300 w-full ${isWaitingInput ? 'ring-1 ring-primary/50 shadow-[0_0_15px_rgba(208,188,255,0.2)]' : ''}`}>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
        />
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined">add_photo_alternate</span>
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isRecording}
          rows={1}
          className="flex-1 bg-transparent border-none text-on-surface focus:ring-0 placeholder-on-surface-variant/50 min-h-[44px] resize-none outline-none py-3 scroll-hide"
        />
        <button 
          onClick={toggleRecording} 
          className={`p-2 transition-colors mr-1 ${isRecording ? 'text-red-500 animate-pulse' : 'text-primary hover:text-primary-container'}`}
        >
          <span className="material-symbols-outlined">{isRecording ? 'stop_circle' : 'mic'}</span>
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className={`rounded-lg p-2 flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(208,188,255,0.4)] ${
            input.trim() && !disabled
              ? 'bg-primary hover:bg-primary-container text-on-primary'
              : 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed shadow-none'
          }`}
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  );
}
