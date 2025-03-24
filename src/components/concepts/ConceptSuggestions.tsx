import React, { useState, useEffect } from 'react';
import './ConceptSuggestions.css';
import { generateCustomQuestions } from '../../utils/questionGenerators';

// Define question suggestions for predefined concepts
const PREDEFINED_QUESTIONS: Record<string, string[]> = {
  'cooking-joy': [
    'What makes cooking therapeutic?',
    'How can beginners enjoy cooking more?',
    'What are some mindful cooking practices?',
    'How does cooking together strengthen relationships?'
  ],
  'laughter': [
    'Why is laughter considered the best medicine?',
    'How does laughter affect our brain chemistry?',
    'Are there different types of laughter?',
    'How do different cultures view laughter?'
  ],
  'pet-psychology': [
    'How do dogs perceive their owners?',
    'What emotions can pets actually feel?',
    'How can I better understand my pet\'s body language?',
    'Do pets have unique personalities like humans?'
  ],
  'stargazing': [
    'What\'s the best way to start stargazing as a beginner?',
    'How can I identify constellations?',
    'What equipment do I need for stargazing?',
    'How have different cultures interpreted the stars?'
  ],
  'music-brain': [
    'How does music affect our emotions?',
    'Can music improve cognitive abilities?',
    'Why do certain songs trigger specific memories?',
    'How does the brain process music differently from speech?'
  ],
  'crypto-web3': [
    'What exactly is blockchain technology?',
    'How do cryptocurrencies actually work?',
    'What is Web3 and how is it different from the current internet?',
    'What are smart contracts and why are they important?'
  ],
  'dreams': [
    'Why do we dream?',
    'What causes recurring dreams?',
    'Can dreams predict the future?',
    'How can I remember my dreams better?'
  ],
  'habits': [
    'How long does it really take to form a new habit?',
    'What\'s the science behind breaking bad habits?',
    'How do habits form in the brain?',
    'What makes some habits harder to change than others?'
  ],
  'nft-art': [
    'What exactly are NFTs and how do they work?',
    'How are NFTs changing the art world?',
    'What makes some NFTs so valuable?',
    'How can artists get started with NFTs?'
  ],
  'quantum-entanglement': [
    'What is quantum entanglement in simple terms?',
    'Why did Einstein call it "spooky action at a distance"?',
    'How is quantum entanglement being used in technology?',
    'What are the philosophical implications of quantum entanglement?'
  ],
  'decision-making': [
    'Why do we make irrational decisions sometimes?',
    'How does emotion affect decision-making?',
    'What are cognitive biases and how do they influence us?',
    'How can I make better decisions under pressure?'
  ],
  'climate-change': [
    'What are the main causes of climate change?',
    'How is climate change affecting ecosystems?',
    'What solutions show the most promise for addressing climate change?',
    'How can individuals make a meaningful impact on climate change?'
  ],
  'ai-ethics': [
    'What are the biggest ethical concerns with AI development?',
    'How can bias in AI systems be reduced?',
    'Should AI systems have rights?',
    'How might AI change human society in the next decade?'
  ],
  'universe-origins': [
    'What evidence supports the Big Bang theory?',
    'What existed before the Big Bang?',
    'How do we know the universe is expanding?',
    'What are the alternative theories to the Big Bang?'
  ],
  'aging-biology': [
    'Why do we age at the cellular level?',
    'What biological factors influence longevity?',
    'How do different species age differently?',
    'What promising anti-aging research is happening now?'
  ]
};

interface ConceptSuggestionsProps {
  conceptId: string;
  conceptTitle: string;
  onSelectQuestion: (question: string) => void;
  isCustomConcept: boolean;
}

const ConceptSuggestions: React.FC<ConceptSuggestionsProps> = ({
  conceptId,
  conceptTitle,
  onSelectQuestion,
  isCustomConcept
}) => {
  const [questions, setQuestions] = useState<string[]>([]);
  
  // Generate questions when component mounts or when props change
  useEffect(() => {
    if (!isCustomConcept && PREDEFINED_QUESTIONS[conceptId]) {
      setQuestions(PREDEFINED_QUESTIONS[conceptId]);
    } else {
      // For custom concepts, use our smart question generator
      const customQuestions = generateCustomQuestions(conceptTitle);
      setQuestions(customQuestions);
    }
  }, [conceptId, conceptTitle, isCustomConcept]);

  return (
    <div className="concept-questions-container">
      <h3 className="concept-questions-heading">What would you like to know about {conceptTitle}?</h3>
      <div className="concept-questions-list">
        {questions.map((question, index) => (
          <button
            key={index}
            className="concept-question-button"
            onClick={() => onSelectQuestion(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ConceptSuggestions;