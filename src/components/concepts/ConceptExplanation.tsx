// src/components/concepts/ConceptExplanation.tsx

import React, { useState } from 'react';
import './ConceptExplanation.css';

interface ConceptExplanationProps {
  text: string;
}

const ConceptExplanation: React.FC<ConceptExplanationProps> = ({ text }) => {
  const [activeApproach, setActiveApproach] = useState<string>('basic');
  
  // In a real implementation, these would be generated by your AI
  const explanationApproaches = {
    basic: "This is a basic explanation that defines the concept clearly...",
    analogy: "Think of this concept like a familiar everyday object or process...",
    steps: "Breaking this down step by step: 1) First... 2) Then...",
    examples: "Here are some practical examples of how this works in the real world..."
  };
  
  const handleApproachChange = (approach: string) => {
    setActiveApproach(approach);
  };

  return (
    <div className="concept-explanation">
      <div className="approach-tabs">
        <button 
          className={`approach-tab ${activeApproach === 'basic' ? 'active' : ''}`}
          onClick={() => handleApproachChange('basic')}
        >
          Basic
        </button>
        <button 
          className={`approach-tab ${activeApproach === 'analogy' ? 'active' : ''}`}
          onClick={() => handleApproachChange('analogy')}
        >
          Analogy
        </button>
        <button 
          className={`approach-tab ${activeApproach === 'steps' ? 'active' : ''}`}
          onClick={() => handleApproachChange('steps')}
        >
          Step-by-Step
        </button>
        <button 
          className={`approach-tab ${activeApproach === 'examples' ? 'active' : ''}`}
          onClick={() => handleApproachChange('examples')}
        >
          Examples
        </button>
      </div>
      
      <div className={`explanation-content ${activeApproach}`}>
        {explanationApproaches[activeApproach as keyof typeof explanationApproaches]}
      </div>
      
      <div className="understanding-controls">
        <button className="understanding-button got-it">I understand now</button>
        <button className="understanding-button more-detail">Need more detail</button>
        <button className="understanding-button related">Show related concepts</button>
      </div>
    </div>
  );
};

export default ConceptExplanation;