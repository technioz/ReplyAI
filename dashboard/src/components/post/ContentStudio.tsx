'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Sparkles,
  Copy,
  RefreshCw,
  Loader2,
  FileText,
  PenLine,
  ArrowRightLeft,
  BookOpen,
  ChevronDown
} from 'lucide-react';

type Platform = 'X' | 'LinkedIn';
type Mode = 'generate' | 'repurpose' | 'article';
type ArticleTone = 'authoritative' | 'conversational' | 'contrarian' | 'storytelling';
type ArticleLength = 'short' | 'medium' | 'long';

interface OllamaModel {
  id: string;
  label: string;
  description: string;
}

const ARTICLE_TONES: { value: ArticleTone; label: string; desc: string }[] = [
  { value: 'authoritative', label: 'Authoritative', desc: 'Definitive expert take' },
  { value: 'conversational', label: 'Conversational', desc: 'Smart friend over coffee' },
  { value: 'contrarian', label: 'Contrarian', desc: 'Challenge the mainstream' },
  { value: 'storytelling', label: 'Storytelling', desc: 'Narrative-driven, lesson through story' },
];

const ARTICLE_LENGTHS: { value: ArticleLength; label: string; desc: string; words: string }[] = [
  { value: 'short', label: 'Short', desc: 'Punchy and direct', words: '~800 words' },
  { value: 'medium', label: 'Medium', desc: 'Thorough coverage', words: '~1500 words' },
  { value: 'long', label: 'Long', desc: 'Definitive deep dive', words: '~2500 words' },
];

export function ContentStudio() {
  const [mode, setMode] = useState<Mode>('generate');
  const [platform, setPlatform] = useState<Platform>('X');
  const [generating, setGenerating] = useState(false);

  // Generate & Repurpose
  const [topic, setTopic] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState<'X' | 'LinkedIn' | 'auto'>('auto');

  // Article
  const [articleTone, setArticleTone] = useState<ArticleTone>('authoritative');
  const [articleLength, setArticleLength] = useState<ArticleLength>('medium');
  const [includeSEO, setIncludeSEO] = useState(true);
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelModelsFetched, setModelModelsFetched] = useState(false);

  // Result
  const [result, setResult] = useState<{
    content: string;
    metadata: any;
  } | null>(null);

  useEffect(() => {
    if (mode === 'article' && !modelModelsFetched) {
      fetchModels();
    }
  }, [mode]);

  const fetchModels = async () => {
    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) return;

      const response = await fetch('/api/ai/providers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ollamaCloudModels?.length > 0) {
          setModels(data.ollamaCloudModels);
          if (!selectedModel) {
            setSelectedModel(data.ollamaCloudModels[0].id);
          }
        }
      }
    } catch {
      // Fallback to hardcoded models
    }
    setModelModelsFetched(true);
  };

  // Fallback models if API doesn't return them
  const availableModels = models.length > 0 ? models : [
    { id: 'gemma3:27b', label: 'Gemma 3 27B', description: 'Best balance of speed and quality' },
    { id: 'deepseek-v3.2', label: 'DeepSeek V3.2', description: 'Excellent reasoning and writing' },
    { id: 'qwen3-coder:480b', label: 'Qwen3 Coder 480B', description: 'Largest model, best for technical articles' },
    { id: 'kimi-k2:1t', label: 'Kimi K2 1T', description: 'Massive context window, great for research-heavy articles' },
    { id: 'gemma3:4b', label: 'Gemma 3 4B', description: 'Fastest, good for drafts' },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) { toast.error('Not authenticated'); return; }

      const response = await fetch('/api/post/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, context: { topic: topic || undefined } })
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
    if (!sourceText.trim()) { toast.error('Paste a post to repurpose'); return; }
    setGenerating(true);
    setResult(null);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) { toast.error('Not authenticated'); return; }

      const response = await fetch('/api/post/repurpose', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, sourceText: sourceText.trim(), sourcePlatform })
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

  const handleArticle = async () => {
    setGenerating(true);
    setResult(null);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) { toast.error('Not authenticated'); return; }

      const response = await fetch('/api/article/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic || undefined,
          tone: articleTone,
          length: articleLength,
          includeSEO,
          model: selectedModel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate article');
      }

      const data = await response.json();
      if (data.success) {
        setResult({ content: data.data.content, metadata: data.data.metadata });
        toast.success('Article generated!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate article');
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
    else if (mode === 'repurpose') handleRepurpose();
    else handleArticle();
  };

  const sourcePlatformLabel = (sp: string) => {
    if (sp === 'X') return 'X (Twitter)';
    if (sp === 'LinkedIn') return 'LinkedIn';
    return 'Auto-detect';
  };

  const isDisabled = generating || (mode === 'repurpose' && !sourceText.trim()) || (mode === 'article' && !selectedModel);

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex bg-surface rounded-xl border border-stroke p-1">
        <button
          onClick={() => { setMode('generate'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-medium transition-all text-sm ${
            mode === 'generate'
              ? 'bg-accent text-white shadow-sm btn-primary'
              : 'text-ink-mute hover:text-ink'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Generate Post
        </button>
        <button
          onClick={() => { setMode('repurpose'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-medium transition-all text-sm ${
            mode === 'repurpose'
              ? 'bg-accent text-white shadow-sm btn-primary'
              : 'text-ink-mute hover:text-ink'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Repurpose
        </button>
        <button
          onClick={() => { setMode('article'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-medium transition-all text-sm ${
            mode === 'article'
              ? 'bg-accent text-white shadow-sm btn-primary'
              : 'text-ink-mute hover:text-ink'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Article
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-surface rounded-xl border border-stroke p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            mode === 'generate' ? 'bg-accent/10 text-accent' :
            mode === 'repurpose' ? 'bg-blue-500/10 text-blue-500' :
            'bg-amber-500/10 text-amber-500'
          }`}>
            {mode === 'generate' ? <PenLine className="h-5 w-5" /> :
             mode === 'repurpose' ? <ArrowRightLeft className="h-5 w-5" /> :
             <BookOpen className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">
              {mode === 'generate' ? 'Create Original Post' :
               mode === 'repurpose' ? 'Repurpose Existing Post' :
               'Write X Article'}
            </h2>
            <p className="text-sm text-ink-mute">
              {mode === 'generate' ? 'Write in Gaurav\'s voice from scratch' :
               mode === 'repurpose' ? 'Rewrite any post in Gaurav\'s voice' :
               'Long-form articles for X monetization'}
            </p>
          </div>
        </div>

        {/* Article-specific: Model Selector */}
        {mode === 'article' && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-ink mb-2">
              AI Model
            </label>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-stroke rounded-lg text-ink appearance-none cursor-pointer focus:border-accent focus:outline-none transition-colors pr-10"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.description}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-mute pointer-events-none" />
            </div>
            <p className="text-xs text-ink-mute mt-1.5">
              Powered by Ollama Cloud. Larger models produce better writing but take longer.
            </p>
          </div>
        )}

        {/* Generate/Repurpose: Platform Selection */}
        {(mode === 'generate' || mode === 'repurpose') && (
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
        )}

        {/* Article: Tone Selection */}
        {mode === 'article' && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-ink mb-2">
              Tone
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ARTICLE_TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setArticleTone(t.value)}
                  className={`py-2.5 px-3 rounded-lg border text-left transition-all ${
                    articleTone === t.value
                      ? 'border-accent bg-accent/5 ring-2 ring-accent/30'
                      : 'border-stroke hover:border-accent/50'
                  }`}
                >
                  <span className={`text-sm font-medium ${articleTone === t.value ? 'text-accent' : 'text-ink'}`}>
                    {t.label}
                  </span>
                  <span className={`block text-xs mt-0.5 ${articleTone === t.value ? 'text-accent/70' : 'text-ink-mute'}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Article: Length Selection */}
        {mode === 'article' && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-ink mb-2">
              Length
            </label>
            <div className="flex gap-2">
              {ARTICLE_LENGTHS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setArticleLength(l.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    articleLength === l.value
                      ? 'border-accent bg-accent/5 text-accent ring-2 ring-accent/30'
                      : 'border-stroke text-ink-mute hover:border-accent/50 hover:text-ink'
                  }`}
                >
                  {l.label}
                  <span className="block text-xs font-normal text-ink-mute">{l.words}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Article: SEO Toggle */}
        {mode === 'article' && (
          <div className="mb-5 flex items-center justify-between bg-card rounded-lg p-3 border border-stroke">
            <div>
              <span className="text-sm font-medium text-ink">SEO Optimization</span>
              <span className="block text-xs text-ink-mute">Optimize headers and keywords for search discoverability</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeSEO}
                onChange={(e) => setIncludeSEO(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-stroke rounded-full peer peer-checked:bg-accent peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
            </label>
          </div>
        )}

        {/* Mode-specific inputs */}
        {mode === 'generate' && (
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
        )}

        {mode === 'article' && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-ink mb-2">
              Topic <span className="text-ink-mute font-normal">(optional — uses Brave Search for research)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 'self-hosting AI models on VPS', 'Coolify vs Kubernetes for small teams'"
              className="w-full px-4 py-3 bg-card border border-stroke rounded-lg text-ink placeholder-ink-mute/50 focus:border-accent focus:outline-none transition-colors"
            />
            <p className="text-xs text-ink-mute mt-1.5">
              {topic
                ? 'Brave Search will research this topic and provide context to the AI'
                : 'Leave blank and the AI will choose a topic from your expertise area'}
            </p>
          </div>
        )}

        {mode === 'repurpose' && (
          <>
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
          onClick={mode === 'generate' ? handleGenerate : mode === 'repurpose' ? handleRepurpose : handleArticle}
          disabled={isDisabled}
          className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-primary"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === 'generate' ? 'Generating...' : mode === 'repurpose' ? 'Repurposing...' : 'Writing Article...'}
            </>
          ) : (
            <>
              {mode === 'generate' ? (
                <><Sparkles className="h-4 w-4" /> Generate Post (5 credits)</>
              ) : mode === 'repurpose' ? (
                <><ArrowRightLeft className="h-4 w-4" /> Repurpose Post (5 credits)</>
              ) : (
                <><BookOpen className="h-4 w-4" /> Write Article (10 credits)</>
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
                {mode === 'generate' ? 'Generated Post' : mode === 'repurpose' ? 'Repurposed Post' : 'Generated Article'}
              </h3>
              <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-ink-mute">
                {mode !== 'article' && (
                  <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">
                    {result.metadata.platform}
                  </span>
                )}
                {mode === 'article' && (
                  <>
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                      {result.metadata.tone}
                    </span>
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                      {result.metadata.length}
                    </span>
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                      {result.metadata.model}
                    </span>
                  </>
                )}
                <span>{result.metadata.wordCount || result.metadata.characterCount} {result.metadata.wordCount ? 'words' : 'chars'}</span>
                {mode === 'repurpose' && result.metadata.sourcePlatform && (
                  <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                    from {sourcePlatformLabel(result.metadata.sourcePlatform)}
                  </span>
                )}
                {mode === 'article' && result.metadata.seoOptimized && (
                  <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">
                    SEO optimized
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

          {/* Article result renders markdown-ish, post result uses pre */}
          {mode === 'article' ? (
            <div className="bg-card rounded-lg p-6 border border-stroke prose prose-sm max-w-none text-ink leading-relaxed">
              <div className="whitespace-pre-wrap font-sans" dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }} />
            </div>
          ) : (
            <div className="bg-card rounded-lg p-4 border border-stroke">
              <pre className="whitespace-pre-wrap font-sans text-sm text-ink leading-relaxed">
                {result.content}
              </pre>
            </div>
          )}

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

function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks (```lang\n...\n```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<pre class="bg-surface border border-stroke rounded-lg p-4 overflow-x-auto my-4"><code class="text-sm text-ink">${escapeHtml(code.trim())}</code></pre>`;
  });

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-ink mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-ink mt-6 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-ink mt-2 mb-4">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-surface px-1.5 py-0.5 rounded text-sm text-accent border border-stroke">$1</code>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-accent pl-4 my-3 text-ink/80 italic">$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-stroke my-6" />');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="text-ink ml-4 list-disc">$1</li>');

  // Paragraphs — double newline
  html = html.replace(/\n\n/g, '</p><p class="text-ink my-2">');

  // Single newlines within paragraphs
  html = html.replace(/\n/g, '<br />');

  return `<p class="text-ink my-2">${html}</p>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}