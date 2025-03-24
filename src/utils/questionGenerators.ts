/**
 * Utility functions for generating smart question suggestions
 * for both predefined and custom concept topics
 */

// Categories with specific question templates
const CATEGORY_TEMPLATES: Record<string, string[]> = {
    science: [
      'What are the fundamental principles of [TOPIC]?',
      'How has our understanding of [TOPIC] evolved over time?',
      'What are common misconceptions about [TOPIC]?',
      'How is [TOPIC] relevant to everyday life?'
    ],
    technology: [
      'How does [TOPIC] work?',
      'What problems does [TOPIC] solve?',
      'How is [TOPIC] likely to evolve in the future?',
      'What are the ethical considerations around [TOPIC]?'
    ],
    psychology: [
      'How does [TOPIC] affect our behavior?',
      'What does research tell us about [TOPIC]?',
      'How can understanding [TOPIC] improve our lives?',
      'What are different perspectives on [TOPIC]?'
    ],
    philosophy: [
      'What are the key ideas in [TOPIC]?',
      'How has [TOPIC] influenced modern thinking?',
      'What are the practical applications of [TOPIC]?',
      'What debates exist within [TOPIC]?'
    ],
    arts: [
      'What makes [TOPIC] significant?',
      'How has [TOPIC] evolved over time?',
      'Who are important figures in [TOPIC]?',
      'How does [TOPIC] reflect cultural values?'
    ],
    history: [
      'What were the key events in [TOPIC]?',
      'How has [TOPIC] shaped our world today?',
      'What are common misconceptions about [TOPIC]?',
      'What lessons can we learn from [TOPIC]?'
    ],
    health: [
      'What are the basics everyone should know about [TOPIC]?',
      'How does [TOPIC] affect overall wellbeing?',
      'What are current best practices regarding [TOPIC]?',
      'What misconceptions exist about [TOPIC]?'
    ]
  };
  
  // Default templates for any topic
  const DEFAULT_TEMPLATES = [
    'What are the key aspects of [TOPIC]?',
    'How has [TOPIC] developed over time?',
    'What do most people misunderstand about [TOPIC]?',
    'Why is [TOPIC] important?'
  ];
  
  /**
   * Generates category-specific question templates for a custom topic
   * Uses semantic analysis to match the topic to appropriate category templates
   */
  export const generateCustomQuestions = (topicTitle: string): string[] => {
    // Convert topic title to lowercase for easier matching
    const lowercaseTopic = topicTitle.toLowerCase();
    
    // Keywords for category detection
    const categoryKeywords: Record<string, string[]> = {
      science: ['physics', 'chemistry', 'biology', 'quantum', 'theory', 'universe', 'scientific', 'atom', 'cell', 'energy', 'research'],
      technology: ['computer', 'software', 'hardware', 'tech', 'digital', 'ai', 'code', 'programming', 'internet', 'device', 'app', 'crypto'],
      psychology: ['mind', 'behavior', 'cognitive', 'mental', 'emotion', 'psychology', 'brain', 'personality', 'consciousness', 'perception'],
      philosophy: ['ethics', 'moral', 'philosophy', 'existence', 'consciousness', 'meaning', 'value', 'truth', 'knowledge', 'thinking'],
      arts: ['art', 'music', 'literature', 'film', 'design', 'creative', 'cultural', 'aesthetic', 'artistic', 'creativity', 'visual'],
      history: ['history', 'historical', 'ancient', 'century', 'era', 'civilization', 'war', 'revolution', 'empire', 'dynasty', 'period'],
      health: ['health', 'medical', 'wellness', 'disease', 'nutrition', 'fitness', 'diet', 'exercise', 'therapy', 'healing', 'mental health']
    };
    
    // Detect category based on topic keywords
    let detectedCategory = '';
    let maxMatchCount = 0;
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const matchCount = keywords.filter(keyword => lowercaseTopic.includes(keyword)).length;
      if (matchCount > maxMatchCount) {
        maxMatchCount = matchCount;
        detectedCategory = category;
      }
    }
    
    // Select templates based on detected category or default
    const templates = detectedCategory && maxMatchCount > 0 
      ? CATEGORY_TEMPLATES[detectedCategory] 
      : DEFAULT_TEMPLATES;
    
    // Replace [TOPIC] with the actual topic
    return templates.map(template => template.replace(/\[TOPIC\]/g, topicTitle));
  };
  
  /**
   * Generates follow-up questions based on user's first question
   * For after the conversation has already started
   */
  export const generateFollowupQuestions = (
    topicTitle: string, 
    firstQuestion: string
  ): string[] => {
    // Basic templates for follow-up questions
    const followupTemplates = [
      'Can you explain more about how [TOPIC] works?',
      'What are the practical applications of [TOPIC]?',
      'How might [TOPIC] change in the future?',
      'What are some surprising facts about [TOPIC]?',
      'How does [TOPIC] compare to similar concepts?',
      'What are the limitations or criticisms of [TOPIC]?',
      'Who are the key figures associated with [TOPIC]?',
      'How can I learn more about [TOPIC]?',
      'What are common misconceptions about [TOPIC]?'
    ];
    
    // Shuffle and select 4 follow-up templates
    const shuffled = [...followupTemplates].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 4);
    
    // Replace [TOPIC] with the actual topic
    return selected.map(template => template.replace(/\[TOPIC\]/g, topicTitle));
  };
  
  export default {
    generateCustomQuestions,
    generateFollowupQuestions
  };