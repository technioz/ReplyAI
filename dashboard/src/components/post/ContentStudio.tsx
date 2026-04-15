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
  ChevronDown,
  Check,
  ClipboardList,
  PenTool,
  Wand2,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
  X
} from 'lucide-react';
import { OLLAMA_CLOUD_MODELS } from '@/lib/article-generation/types';

type Platform = 'X' | 'LinkedIn';
type Mode = 'generate' | 'repurpose' | 'article' | 'ideas';
type ArticleTone = 'authoritative' | 'conversational' | 'contrarian' | 'storytelling';
type ArticleLength = 'short' | 'medium' | 'long';

interface OllamaModel {
  id: string;
  label: string;
  description: string;
}

interface ContentIdea {
  id: string;
  title: string;
  hook: string;
  angle: string;
  format: 'post' | 'article' | 'thread' | 'both';
  platform: ('X' | 'LinkedIn')[];
  urgency: 'viral' | 'timely' | 'evergreen';
  topicTag: string;
  reasoning: string;
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

const URGENCY_CONFIG = {
  viral: { label: 'Viral', color: 'text-red-500 bg-red-500/10', icon: Zap },
  timely: { label: 'Timely', color: 'text-amber-500 bg-amber-500/10', icon: TrendingUp },
  evergreen: { label: 'Evergreen', color: 'text-green-500 bg-green-500/10', icon: Clock },
};

const FORMAT_LABELS: Record<string, string> = {
  post: 'Post',
  article: 'Article',
  thread: 'Thread',
  both: 'Post + Article',
};

export function ContentStudio() {
  const [mode, setMode] = useState<Mode>('ideas');
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
  const [articleLlmProvider, setArticleLlmProvider] = useState<string>('ollama');

  // Content Ideas
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasFocusArea, setIdeasFocusArea] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);

  // Result
  const [result, setResult] = useState<{
    content: string;
    metadata: any;
  } | null>(null);

  // Article generation steps
  const [articleStep, setArticleStep] = useState<number>(0);

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
        if (typeof data.articleLlmProvider === 'string') {
          setArticleLlmProvider(data.articleLlmProvider);
        }
        const articleList =
          data.articleModels?.length > 0 ? data.articleModels : data.ollamaCloudModels;
        if (articleList?.length > 0) {
          setModels(articleList);
          setSelectedModel((prev) => {
            if (prev && articleList.some((m: OllamaModel) => m.id === prev)) return prev;
            return articleList[0].id;
          });
        }
      }
    } catch {
      // Fallback to hardcoded models
    }
    setModelModelsFetched(true);
  };

  const availableModels =
    models.length > 0
      ? models
      : OLLAMA_CLOUD_MODELS.map((m) => ({ id: m.id, label: m.label, description: m.description }));

  // --- Ideas ---

  const handleGenerateIdeas = async () => {
    setIdeasLoading(true);
    setIdeas([]);
    setSelectedIdea(null);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) { toast.error('Not authenticated'); return; }

      const response = await fetch('/api/content/ideas', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platform || undefined,
          focusArea: ideasFocusArea.trim() || undefined,
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate ideas');
      }

      const data = await response.json();
      if (data.success) {
        setIdeas(data.data.ideas);
        toast.success(`Generated ${data.data.ideas.length} ideas!`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate ideas');
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleSelectIdea = (idea: ContentIdea) => {
    setSelectedIdea(idea);
  };

  const handleUseIdea = (targetMode: 'generate' | 'article') => {
    if (!selectedIdea) return;

    setTopic(selectedIdea.title);

    if (targetMode === 'article') {
      setMode('article');
      if (selectedIdea.format === 'article' || selectedIdea.format === 'both') {
        // keep defaults
      }
    } else {
      setMode('generate');
      if (selectedIdea.platform.includes('LinkedIn') && !selectedIdea.platform.includes('X')) {
        setPlatform('LinkedIn');
      } else {
        setPlatform('X');
      }
    }

    setSelectedIdea(null);
    toast.success(`Idea loaded into ${targetMode === 'article' ? 'Article' : 'Generate Post'}!`);
  };

  // --- Generate / Repurpose / Article ---

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
    setArticleStep(1);

    try {
      const token = localStorage.getItem('quirkly_token');
      if (!token) { toast.error('Not authenticated'); return; }

      setArticleStep(1);
      toast('Step 1/3: Building brief...', { icon: '📋' });

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

      setArticleStep(2);
      toast('Step 2/3: Writing draft...', { icon: '✍️' });

      const data = await response.json();
      if (data.success) {
        setArticleStep(3);
        setResult({ content: data.data.content, metadata: data.data.metadata });
        toast.success('Article generated! (3/3 steps complete)');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate article');
    } finally {
      setGenerating(false);
      setTimeout(() => setArticleStep(0), 3000);
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
          onClick={() => { setMode('ideas'); setResult(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-medium transition-all text-sm ${
            mode === 'ideas'
              ? 'bg-accent text-white shadow-sm btn-primary'
              : 'text-ink-mute hover:text-ink'
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          Ideas
        </button>
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

      {/* ==================== IDEAS TAB ==================== */}
      {mode === 'ideas' && (
        <div className="space-y-5">
          {/* Ideas Input Card */}
          <div className="bg-surface rounded-xl border border-stroke p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-500">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink">Content Ideas</h2>
                <p className="text-sm text-ink-mute">Viral ideas based on your profile and trending topics</p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-2">
                Focus Area <span className="text-ink-mute font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={ideasFocusArea}
                onChange={(e) => setIdeasFocusArea(e.target.value)}
                placeholder="e.g., 'AI cost optimization', 'self-hosting vs cloud', 'DevOps failures'"
                className="w-full px-4 py-3 bg-card border border-stroke rounded-lg text-ink placeholder-ink-mute/50 focus:border-accent focus:outline-none transition-colors"
              />
              <p className="text-xs text-ink-mute mt-1.5">
                Leave blank to get ideas across all your expertise areas
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-ink mb-2">
                Platform
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

            <button
              onClick={handleGenerateIdeas}
              disabled={ideasLoading}
              className="w-full py-3 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-primary"
            >
              {ideasLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating ideas...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4" /> Generate Ideas (2 credits)
                </>
              )}
            </button>
          </div>

          {/* Ideas Grid */}
          {ideas.length > 0 && (
            <div className="grid gap-4">
              {ideas.map((idea) => {
                const urgency = URGENCY_CONFIG[idea.urgency];
                const UrgencyIcon = urgency.icon;
                const isSelected = selectedIdea?.id === idea.id;

                return (
                  <div
                    key={idea.id}
                    onClick={() => handleSelectIdea(idea)}
                    className={`bg-surface rounded-xl border-2 p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
                        : 'border-stroke hover:border-accent/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${urgency.color}`}>
                          <UrgencyIcon className="h-3 w-3" />
                          {urgency.label}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                          {FORMAT_LABELS[idea.format] || idea.format}
                        </span>
                        {idea.platform.map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded-full text-xs font-medium bg-card border border-stroke text-ink-mute">
                            {p}
                          </span>
                        ))}
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-ink mb-2">{idea.title}</h3>

                    <p className="text-sm text-ink/80 mb-2 leading-relaxed">
                      <span className="font-medium text-ink">Hook:</span> {idea.hook}
                    </p>

                    <p className="text-sm text-ink-mute mb-3 leading-relaxed">
                      {idea.angle}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-mute italic">{idea.reasoning}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-card border border-stroke text-ink-mute font-mono">
                        {idea.topicTag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected Idea Actions */}
          {selectedIdea && (
            <div className="bg-surface rounded-xl border border-accent/30 p-4 sticky bottom-4 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-mute mb-0.5">Selected Idea</p>
                  <p className="text-sm font-medium text-ink truncate">{selectedIdea.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(selectedIdea.format === 'post' || selectedIdea.format === 'both' || selectedIdea.format === 'thread') && (
                    <button
                      onClick={() => handleUseIdea('generate')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-all btn-primary"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate Post
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(selectedIdea.format === 'article' || selectedIdea.format === 'both') && (
                    <button
                      onClick={() => handleUseIdea('article')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-500/90 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Write Article
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedIdea(null)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-stroke text-ink-mute hover:text-ink hover:border-ink/30 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== GENERATE / REPURPOSE / ARTICLE ==================== */}
      {mode !== 'ideas' && (
        <>
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
                  {articleLlmProvider === 'xai' &&
                    'Articles use xAI (XAI_MODEL) while AI_PROVIDER=xai. Switch AI_PROVIDER to ollama to pick Ollama Cloud models.'}
                  {articleLlmProvider === 'groq' &&
                    'Articles use Groq (GROQ_MODEL) while AI_PROVIDER=groq. Switch AI_PROVIDER to ollama for Ollama Cloud.'}
                  {articleLlmProvider === 'ollama' &&
                    'Powered by Ollama Cloud. Larger models produce better writing but take longer.'}
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

            {/* Article Step Progress */}
            {mode === 'article' && (generating || articleStep > 0) && (
              <div className="mb-5 bg-card rounded-lg border border-stroke p-4">
                <div className="flex items-center gap-4">
                  {[
                    { step: 1, label: 'Brief', icon: ClipboardList },
                    { step: 2, label: 'Draft', icon: PenTool },
                    { step: 3, label: 'Humanize', icon: Wand2 },
                  ].map(({ step, label, icon: Icon }) => (
                    <div key={step} className="flex items-center gap-2 flex-1">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all ${
                        articleStep >= step
                          ? 'border-accent bg-accent text-white'
                          : 'border-stroke text-ink-mute bg-card'
                      }`}>
                        {articleStep > step ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : articleStep === step ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className={`text-sm font-medium transition-colors ${
                        articleStep >= step ? 'text-accent' : 'text-ink-mute'
                      }`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-mute mt-2">
                  {articleStep === 1 ? 'Analyzing topic and building article brief...' :
                   articleStep === 2 ? 'Writing the full article draft...' :
                   articleStep === 3 ? 'Humanizing — removing AI patterns and adding voice...' :
                   'Starting 3-step generation...'}
                </p>
              </div>
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
                  {mode === 'article'
                    ? `Step ${articleStep}/3: ${articleStep === 1 ? 'Brief' : articleStep === 2 ? 'Draft' : 'Humanizing'}...`
                    : mode === 'generate' ? 'Generating...' : 'Repurposing...'}
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
        </>
      )}
    </div>
  );
}

function renderMarkdown(text: string): string {
  let html = text;

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<pre class="bg-surface border border-stroke rounded-lg p-4 overflow-x-auto my-4"><code class="text-sm text-ink">${escapeHtml(code.trim())}</code></pre>`;
  });

  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-ink mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-ink mt-6 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-ink mt-2 mb-4">$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  html = html.replace(/`([^`]+)`/g, '<code class="bg-surface px-1.5 py-0.5 rounded text-sm text-accent border border-stroke">$1</code>');

  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-accent pl-4 my-3 text-ink/80 italic">$1</blockquote>');

  html = html.replace(/^---$/gm, '<hr class="border-stroke my-6" />');

  html = html.replace(/^- (.+)$/gm, '<li class="text-ink ml-4 list-disc">$1</li>');

  html = html.replace(/\n\n/g, '</p><p class="text-ink my-2">');

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