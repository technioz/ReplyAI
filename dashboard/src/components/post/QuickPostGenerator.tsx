'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from 'react-hot-toast';
import { Sparkles, Copy, RefreshCw, Loader2 } from 'lucide-react';

export function QuickPostGenerator() {
  const [platform, setPlatform] = useState<'X' | 'LinkedIn'>('X');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<{
    content: string;
    metadata: any;
  } | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/post/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform,
          context: {
            topic: topic || undefined
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate post');
      }

      const data = await response.json();

      if (data.success) {
        setGeneratedPost({
          content: data.data.content,
          metadata: data.data.metadata
        });
        toast.success('Post generated successfully!');
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate post');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedPost) {
      navigator.clipboard.writeText(generatedPost.content);
      toast.success('Copied to clipboard!');
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-6 w-6 text-accent" />
        <h2 className="text-2xl font-bold text-ink">Post Generator</h2>
      </div>
      
      <p className="text-ink-mute mb-6">
        Generate on-brand content in Gaurav&apos;s voice
      </p>

      {/* Platform Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-ink mb-3">
          Platform
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setPlatform('X')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
              platform === 'X'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/50'
                : 'border-gray-300 dark:border-gray-600 text-ink-mute hover:border-purple-400 dark:hover:border-purple-500 hover:text-ink'
            }`}
          >
            X (Twitter)
          </button>
          <button
            onClick={() => setPlatform('LinkedIn')}
            className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
              platform === 'LinkedIn'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/50'
                : 'border-gray-300 dark:border-gray-600 text-ink-mute hover:border-purple-400 dark:hover:border-purple-500 hover:text-ink'
            }`}
          >
            LinkedIn
          </button>
        </div>
      </div>

      {/* Optional Topic */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-ink mb-3">
          Topic (Optional)
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., 'database optimization', 'automation ROI', 'API rate limiting'"
          className="w-full px-4 py-3 bg-surface border border-stroke rounded-lg text-ink placeholder-ink-mute focus:border-accent focus:outline-none"
        />
        <p className="text-xs text-ink-mute mt-2">
          Leave blank for a general post based on your expertise
        </p>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full mb-6"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Post (5 credits)
          </>
        )}
      </Button>

      {/* Generated Content Display */}
      {generatedPost && (
        <div className="bg-surface rounded-lg p-6 border border-stroke">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-ink">Generated Post</h3>
              <div className="flex gap-2 mt-2 text-xs text-ink-mute">
                <span>Platform: {generatedPost.metadata.platform}</span>
                <span>•</span>
                <span>{generatedPost.metadata.characterCount} chars</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={generating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed">
              {generatedPost.content}
            </pre>
          </div>

          {generatedPost.metadata.validationIssues && generatedPost.metadata.validationIssues.length > 0 && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-xs font-medium text-warning mb-1">Content Warnings:</p>
              <ul className="text-xs text-warning space-y-1">
                {generatedPost.metadata.validationIssues.map((issue: string, i: number) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}