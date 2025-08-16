'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Send, RefreshCw } from 'lucide-react';
import { TonePicker, type Tone } from './TonePicker';
import { StanceToggle, type Stance } from './StanceToggle';

interface ReplyComposerProps {
  originalPost: string;
  onGenerate: (tone: Tone, stance: Stance) => void;
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
  className?: string;
}

const MAX_CHARACTERS = 100;

export function ReplyComposer({ 
  originalPost, 
  onGenerate, 
  onCopy, 
  onInsert, 
  className = '' 
}: ReplyComposerProps) {
  const [selectedTone, setSelectedTone] = useState<Tone>('casual');
  const [selectedStance, setSelectedStance] = useState<Stance>('agree');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);
  const [selectedReply, setSelectedReply] = useState<string>('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock generated replies (replace with actual API call)
      const mockReplies = [
        "This is absolutely spot on! Love how you've captured the essence of the moment.",
        "Couldn't agree more with this take. It's refreshing to see such honest perspective.",
        "You've hit the nail on the head here. This resonates so much with my experience."
      ];
      
      setGeneratedReplies(mockReplies);
      setSelectedReply(mockReplies[0]);
    } catch (error) {
      console.error('Failed to generate replies:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (selectedReply) {
      onCopy(selectedReply);
    }
  };

  const handleInsert = () => {
    if (selectedReply) {
      onInsert(selectedReply);
    }
  };

  const getCharacterCountClass = (text: string) => {
    const count = text.length;
    if (count > MAX_CHARACTERS) return 'danger';
    if (count > MAX_CHARACTERS * 0.8) return 'warning';
    return '';
  };

  return (
    <div className={`reply-composer ${className}`}>
      {/* Original Post Preview */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-ink-mute">Original Post</label>
        <div className="bg-surface border border-stroke rounded-card p-3">
          <p className="text-sm text-ink-mute line-clamp-2">{originalPost}</p>
        </div>
      </div>

      {/* Tone and Stance Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TonePicker
          selectedTone={selectedTone}
          onToneChange={setSelectedTone}
        />
        <StanceToggle
          selectedStance={selectedStance}
          onStanceChange={setSelectedStance}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="btn-primary w-full flex items-center justify-center space-x-2"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <span>Generate 3 Variants</span>
          </>
        )}
      </button>

      {/* Generated Replies */}
      {generatedReplies.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-ink-mute">Generated Variants</label>
          <div className="space-y-3">
            {generatedReplies.map((reply, index) => (
              <div
                key={index}
                className={`variant-tile cursor-pointer ${
                  selectedReply === reply ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setSelectedReply(reply)}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-ink flex-1">{reply}</p>
                  <div className="flex items-center space-x-2 ml-3">
                    <span className={`variant-badge ${
                      reply.length <= MAX_CHARACTERS ? 'pass' : 'fail'
                    }`}>
                      {reply.length <= MAX_CHARACTERS ? '✓' : '✗'} {reply.length}
                    </span>
                  </div>
                </div>
                
                {selectedReply === reply && (
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={handleCopy}
                      className="btn-ghost text-xs flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={handleInsert}
                      className="btn-primary text-xs flex items-center space-x-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Insert to X</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character Counter */}
      {selectedReply && (
        <div className="text-right">
          <span className={`char-counter ${getCharacterCountClass(selectedReply)}`}>
            {selectedReply.length}/{MAX_CHARACTERS}
          </span>
        </div>
      )}
    </div>
  );
}
