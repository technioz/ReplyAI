'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  Copy,
  RefreshCw,
  Loader2,
  FileText,
  PenLine,
  ArrowRightLeft
} from 'lucide-react';

type Platform = 'X' | 'LinkedIn';
type Mode = 'generate' | 'repurpose';

export function ContentStudio() {
  const [mode, setMode] = useState<Mode>('generate');
  const [platform, setPlatform] = useState<Platform>('X');

  // Generate state
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  // Repurpose state
  const [sourceText, setSourceText] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState<'X' | 'LinkedIn' | 'auto'>('auto');

  // Result state
  const [result, setResult] = useState<{
    content: string;
    metadata: any;
  } | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

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
          context: { topic: topic || undefined }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate post');
      }

      const data = await response.json();
      if (data.success) {
        setResult({ content: data.data.content, metadata: data.data.metadata });
        toast.success('Post generated!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate post');
    } finally {
      setGenerating(false);
    }
  };

  const handleRepurpose = async () => {
    if (!sourceText.trim()) {
      toast.error('Paste a post to repurpose');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch('/api/post/repurpose', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform,
          sourceText: sourceText.trim(),
          sourcePlatform
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to repurpose post');
      }

      const data = await response.json();
      if (data.success) {
        setResult({ content: data.data.content, metadata: data.data.metadata });
        toast.success('Post repurposed!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to repurpose post');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.content);
      toast.success('Copied to clipboard!');
    }
  };

  const handleRetry = () => {
    if (mode === 'generate') handleGenerate();
    else handleRepurpose();
  };

  const sourcePlatformLabel = (sp: string) => {
    if (sp === 'X') return 'X (Twitter)';
    if (sp === 'LinkedIn') return 'LinkedIn';
    return 'Auto-detect';
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex bg-surface rounded-xl border border-stroke p-1">
        <button
          onClick={() => { setMode('generate'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm ${
            mode === 'generate'
              ? 'bg-accent text-white shadow-sm'
              : 'text-ink-mute hover:text-ink'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Generate Post
        </button>
        <button
          onClick={() => { setMode('repurpose'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all text-sm ${
            mode === 'repurpose'
              ? 'bg-accent text-white shadow-sm'
              : 'text-ink-mute hover:text-ink'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Repurpose Post
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-surface rounded-xl border border-stroke p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            mode === 'generate' ? 'bg-accent/10 text-accent' : 'bg-blue-500/10 text-blue-500'
          }`}>
            {mode === 'generate' ? <PenLine className="h-5 w-5" /> : <ArrowRightLeft className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">
              {mode === 'generate' ? 'Create Original Post' : 'Repurpose Existing Post'}
            </h2>
            <p className="text-sm text-ink-mute">
              {mode === 'generate'
                ? 'Write in Gaurav\'s voice from scratch'
                : 'Rewrite any post in Gaurav\'s voice'}
            </p>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-ink mb-2">
            Target Platform
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setPlatform('X')}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                platform === 'X'
                  ? 'border-accent bg-accent/5 text-accent ring-2 ring-accent/30'
                  : 'border-stroke text-ink-mute hover:border-accent/50 hover:text-ink'
              }`}
            >
              X (Twitter)
            </button>
            <button
              onClick={() => setPlatform('LinkedIn')}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                platform === 'LinkedIn'
                  ? 'border-accent bg-accent/5 text-accent ring-2 ring-accent/30'
                  : 'border-stroke text-ink-mute hover:border-accent/50 hover:text-ink'
              }`}
            >
              LinkedIn
            </button>
          </div>
        </div>

        {/* Mode-specific inputs */}
        {mode === 'generate' ? (
          <div className="mb-5">
            <label className="block text-sm font-medium text-ink mb-2">
              Topic <span className="text-ink-mute font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'database optimization', 'automation ROI', 'API rate limiting'"
              className="w-full px-4 py-3 bg-card border border-stroke rounded-lg text-ink placeholder-ink-mute/50 focus:border-accent focus:outline-none transition-colors"
            />
            <p className="text-xs text-ink-mute mt-1.5">
              Leave blank for a general post based on your expertise
            </p>
          </div>
        ) : (
          <>
            {/* Source Platform */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-ink mb-2">
                Original Platform
              </label>
              <div className="flex gap-2">
                {(['auto', 'X', 'LinkedIn'] as const).map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSourcePlatform(sp)}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                      sourcePlatform === sp
                        ? 'border-blue-500 bg-blue-500/5 text-blue-600 ring-2 ring-blue-500/30'
                        : 'border-stroke text-ink-mute hover:border-blue-400/50 hover:text-ink'
                    }`}
                  >
                    {sourcePlatformLabel(sp)}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Text */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-2">
                Paste the original post
              </label>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste any post from X or LinkedIn here... The AI will extract the core idea and rewrite it in your voice."
                rows={6}
                maxLength={5000}
                className="w-full px-4 py-3 bg-card border border-stroke rounded-lg text-ink placeholder-ink-mute/50 focus:border-accent focus:outline-none transition-colors resize-none"
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-ink-mute">
                  The post will be rewritten from scratch in your voice
                </p>
                <p className={`text-xs ${sourceText.length > 4500 ? 'text-warning' : 'text-ink-mute'}`}>
                  {sourceText.length}/5000
                </p>
              </div>
            </div>
          </>
        )}

        {/* Action Button */}
        <button
          onClick={mode === 'generate' ? handleGenerate : handleRepurpose}
          disabled={generating || (mode === 'repurpose' && !sourceText.trim())}
          className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === 'generate' ? 'Generating...' : 'Repurposing...'}
            </>
          ) : (
            <>
              {mode === 'generate' ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Post (5 credits)
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4" />
                  Repurpose Post (5 credits)
                </>
              )}
            </>
          )}
        </button>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-surface rounded-xl border border-stroke p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold text-ink flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                {mode === 'generate' ? 'Generated Post' : 'Repurposed Post'}
              </h3>
              <div className="flex gap-2 mt-1.5 text-xs text-ink-mute">
                <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                  {result.metadata.platform}
                </span>
                <span>{result.metadata.characterCount} chars</span>
                {mode === 'repurpose' && result.metadata.sourcePlatform && (
                  <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    from {sourcePlatformLabel(result.metadata.sourcePlatform)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-stroke rounded-lg text-ink-mute hover:text-ink hover:border-ink/30 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
              <button
                onClick={handleRetry}
                disabled={generating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-stroke rounded-lg text-ink-mute hover:text-ink hover:border-ink/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>

          <div className="bg-card rounded-lg p-4 border border-stroke">
            <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed">
              {result.content}
            </pre>
          </div>

          {result.metadata.validationIssues && result.metadata.validationIssues.length > 0 && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-xs font-medium text-warning mb-1">Content Warnings:</p>
              <ul className="text-xs text-warning space-y-0.5">
                {result.metadata.validationIssues.map((issue: string, i: number) => (
                  <li key={i}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}