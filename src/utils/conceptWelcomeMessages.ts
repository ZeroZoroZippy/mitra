export const getConceptWelcomeMessage = (
    conceptId: string,
    conceptTitle: string,
    userName: string = "friend"
  ): string => {
    const greetings = [
      `Hey ${userName},`,
      `Hi ${userName}!`,
      `Great to see you, ${userName},`,
      `What's up, ${userName}?`,
      `Glad you're here, ${userName}!`
    ];
  
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
    const specificMessages: { [key: string]: string } = {
        'crypto-web3': `Crypto and Web3, what a game-changer! ${userName}, imagine doing deals securely without any middlemen. Curious how blockchain makes this possible?`,
    
        'nft-art': `NFTs and digital art, a fascinating combo! ${userName}, ever wondered how ownership works in the digital world? Let's explore!`,
    
        'ai-ethics': `AI ethics, such a crucial topic! ${userName}, what happens when machines face moral choices? Let's dive in and find out!`,
    
        'quantum-entanglement': `Quantum entanglement, even Einstein was baffled! ${userName}, want to discover what makes this quantum connection so mind-bending?`,
    
        'universe-origins': `The birth of our universe, can you believe it was 13.8 billion years ago? ${userName}, curious about the fascinating evidence behind it?`,
    
        'aging-biology': `Aging, it's not just getting older - it's one of biology's deepest mysteries! ${userName}, ready to uncover the science of longevity?`,
    
        'dreams': `Dreams, they're not just random - they're your mind's secret language! ${userName}, curious about what your dreams might mean?`,
    
        'laughter': `Laughter, it's ancient, powerful, and surprisingly complex! ${userName}, want to explore why we laugh and how it connects us?`,
    
        'decision-making': `Decision-making, it shapes every part of your life! ${userName}, ever wondered what drives your choices behind the scenes?`,
    
        'stargazing': `Stargazing, connecting you to millennia of wonder! ${userName}, ready to explore the stories hidden in the stars?`,
    
        'cooking-joy': `Cooking, it's not just about food - it's about the joy of creation! ${userName}, want to understand the science and soul behind it?`,
    
        'climate-change': `Climate change, it's more than just news - it's complex science! ${userName}, ready to dig into what's really happening on our planet?`,
    
        'habits': `Habits, they run your life quietly! ${userName}, curious how small changes can reshape your whole routine?`,
    
        'music-brain': `Music and the brain, what a fascinating duo! ${userName}, want to explore why rhythms and melodies move you so deeply?`,
    
        'pet-psychology': `Pets, they're not just cute - they're fascinating! ${userName}, want to explore what's going on in their minds?`,
      };
    
      return specificMessages[conceptId] ||
        `${conceptTitle}, what an intriguing topic! ${userName}, curious to explore it deeply together?`;
    };
  
  export const getCustomConceptFirstMessage = (
    conceptTitle: string,
    userName: string = "friend"
  ): string => {
    const intros = [
      `Hey ${userName},`,
      `Hi ${userName}!`,
      `Great to see you, ${userName}.`,
      `What's up, ${userName}?`,
      `Glad you're here, ${userName}!`
    ];
  
    const intro = intros[Math.floor(Math.random() * intros.length)];
  
    return `${intro} “${conceptTitle}” sounds fascinating! Before we dive in ${userName}, what sparked your curiosity? Would you prefer exploring its fundamentals, real-world implications, or perhaps uncover connections you haven't considered yet?`;
  };
  