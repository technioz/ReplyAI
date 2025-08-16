'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Example {
  id: string;
  originalPost: string;
  replies: {
    tone: string;
    text: string;
    emoji: string;
  }[];
}

const examples: Example[] = [
  {
    id: '1',
    originalPost: "Just finished my first marathon! 🏃‍♂️",
    replies: [
      { tone: 'Professional', text: 'Congratulations on completing your first marathon! That\'s a significant achievement that demonstrates incredible dedication and perseverance.', emoji: '💼' },
      { tone: 'Casual', text: 'Wow, that\'s amazing! From couch to marathon - you\'re basically a superhero now! What\'s next?', emoji: '😊' },
      { tone: 'Humorous', text: 'Marathon? I get tired walking to my fridge! You\'re absolutely insane (in the best way possible)!', emoji: '😄' },
      { tone: 'Empathetic', text: 'I can only imagine how challenging that must have been. Your determination is truly inspiring!', emoji: '❤️' },
      { tone: 'Analytical', text: 'The training discipline required for a marathon is remarkable. What was your biggest challenge during preparation?', emoji: '🧠' },
      { tone: 'Enthusiastic', text: 'OMG YES! You did it! That\'s absolutely incredible! I\'m so excited for you!', emoji: '🚀' },
    ]
  },
  {
    id: '2',
    originalPost: "Working from home has been a game-changer for my productivity.",
    replies: [
      { tone: 'Professional', text: 'Remote work has indeed revolutionized workplace efficiency. The elimination of commute time alone provides significant productivity gains.', emoji: '💼' },
      { tone: 'Casual', text: 'Right? No more office distractions and I can work in my pajamas. It\'s been amazing!', emoji: '😊' },
      { tone: 'Humorous', text: 'Same! Though my cat thinks my keyboard is a bed now. Productivity: 100%, Cat interruptions: also 100%', emoji: '😄' },
      { tone: 'Empathetic', text: 'I\'m glad you found what works for you. It\'s important to have an environment where you can thrive.', emoji: '❤️' },
      { tone: 'Analytical', text: 'Interesting observation. What specific aspects of WFH have contributed most to your increased productivity?', emoji: '🧠' },
      { tone: 'Enthusiastic', text: 'YES! It\'s been incredible for me too! The flexibility and focus are just unmatched!', emoji: '🚀' },
    ]
  },
  {
    id: '3',
    originalPost: "Learning to code has opened so many doors for me.",
    replies: [
      { tone: 'Professional', text: 'Programming skills are increasingly valuable in today\'s digital economy. What technologies are you focusing on?', emoji: '💼' },
      { tone: 'Casual', text: 'That\'s awesome! Coding is like learning a superpower. What\'s your favorite language so far?', emoji: '😊' },
      { tone: 'Humorous', text: 'Same! Though I still can\'t figure out why my code works at 3 AM but not at 3 PM 😅', emoji: '😄' },
      { tone: 'Empathetic', text: 'I\'m so happy for you! Learning new skills can be challenging, but you\'re doing great!', emoji: '❤️' },
      { tone: 'Analytical', text: 'Programming literacy is becoming essential. What motivated you to start learning, and what\'s your learning strategy?', emoji: '🧠' },
      { tone: 'Enthusiastic', text: 'That\'s incredible! Coding is the future! What are you building? I\'m so excited to see your projects!', emoji: '🚀' },
    ]
  }
];

export function ExamplesGrid() {
  const [currentExample, setCurrentExample] = useState(0);

  const nextExample = () => {
    setCurrentExample((prev) => (prev + 1) % examples.length);
  };

  const prevExample = () => {
    setCurrentExample((prev) => (prev - 1 + examples.length) % examples.length);
  };

  const currentExampleData = examples[currentExample];

  return (
    <section className="section-padding">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="text-balance mb-4">
            See Quirkly in Action
          </h2>
          <p className="text-body text-ink-mute max-w-2xl mx-auto">
            Watch how Quirkly transforms the same post into multiple engaging replies, each with a different personality.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Example Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={prevExample}
              className="btn-ghost p-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex space-x-2">
              {examples.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentExample(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentExample ? 'bg-accent' : 'bg-stroke'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextExample}
              className="btn-ghost p-2"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Example Content */}
          <div
            key={currentExample}
            className="space-y-6 fade-scale"
          >
            {/* Original Post */}
            <div className="text-center">
              <div className="inline-block bg-surface border border-stroke rounded-card px-6 py-4 max-w-lg">
                <p className="text-body text-ink">{currentExampleData.originalPost}</p>
              </div>
            </div>

            {/* Tone Variants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentExampleData.replies.map((reply, index) => (
                <div
                  key={reply.tone}
                  className="premium-card p-4 space-y-3 fade-scale"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{reply.emoji}</span>
                    <span className="text-sm font-medium text-ink-mute">{reply.tone}</span>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">{reply.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <button className="btn-primary">
              Try Quirkly Free
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
