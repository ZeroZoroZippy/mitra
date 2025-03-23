// src/components/concepts/ConceptMap.tsx

import React from 'react';
import './ConceptMap.css';

interface ConceptMapProps {
  activeConcept: string | null;
  onSelectConcept: (concept: string) => void;
}

interface ConceptCard {
  id: string;
  title: string;
  category: string;
  imageUrl: string; // Path to AI-generated image
}

const ConceptMap: React.FC<ConceptMapProps> = ({ activeConcept, onSelectConcept }) => {
  // These would come from your backend/state in a real implementation
  const featuredConcepts: ConceptCard[] = [
    {
      id: 'climate-change',
      title: 'Climate Change',
      category: 'Science',
      imageUrl: '/placeholders/climate.jpg' // Would be AI-generated
    },
    {
      id: 'neural-networks',
      title: 'Neural Networks',
      category: 'AI',
      imageUrl: '/placeholders/neural.jpg'
    }
  ];
  
  const popularConcepts: ConceptCard[] = [
    {
      id: 'quantum-computing',
      title: 'Quantum Computing',
      category: 'Technology',
      imageUrl: '/placeholders/quantum.jpg'
    },
    {
      id: 'blockchain',
      title: 'Blockchain',
      category: 'Technology',
      imageUrl: '/placeholders/blockchain.jpg'
    },
    {
      id: 'photosynthesis',
      title: 'Photosynthesis',
      category: 'Biology',
      imageUrl: '/placeholders/photosynthesis.jpg'
    },
    {
      id: 'black-holes',
      title: 'Black Holes',
      category: 'Physics',
      imageUrl: '/placeholders/blackhole.jpg'
    }
  ];

  return (
    <div className="concept-map">
      <h2 className="side-panel-title">Learn with Saarth</h2>
      
      <div className="concept-section">
        <h3 className="section-title">Featured Concepts</h3>
        <div className="concept-grid">
          {featuredConcepts.map((concept) => (
            <div 
              key={concept.id}
              className={`concept-bento-card ${concept.id === activeConcept ? 'active' : ''}`}
              onClick={() => onSelectConcept(concept.title)}
            >
              <div 
                className="concept-bento-image" 
                style={{backgroundImage: `url(${concept.imageUrl})`}}
              />
              <div className="concept-bento-info">
                <span className="concept-bento-category">{concept.category}</span>
                <h4 className="concept-bento-title">{concept.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="concept-section">
        <h3 className="section-title">Popular Concepts</h3>
        <div className="concept-grid">
          {popularConcepts.map((concept) => (
            <div 
              key={concept.id}
              className={`concept-bento-card ${concept.id === activeConcept ? 'active' : ''}`}
              onClick={() => onSelectConcept(concept.title)}
            >
              <div 
                className="concept-bento-image" 
                style={{backgroundImage: `url(${concept.imageUrl})`}}
              />
              <div className="concept-bento-info">
                <span className="concept-bento-category">{concept.category}</span>
                <h4 className="concept-bento-title">{concept.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConceptMap;