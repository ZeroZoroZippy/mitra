import React, { useState, useRef, useEffect } from 'react';
import { IoCopyOutline } from "react-icons/io5";
import { HiOutlineLightBulb, HiOutlineArrowPath } from "react-icons/hi2";
import { AiOutlineLike, AiOutlineDislike, AiFillLike, AiFillDislike } from "react-icons/ai";
import { FaCode, FaGlobeAmericas, FaExchangeAlt, FaBookOpen } from "react-icons/fa";
import ReactMarkdown from 'react-markdown';

interface MessageProps {
  text: string;
  sender: 'user' | 'assistant';
  type?: string;
  isLatest?: boolean;
  onRegenerateResponse?: () => void;
  onGenerateExample?: (exampleType: string) => void;
}

const Message: React.FC<MessageProps> = ({ 
  text, 
  sender, 
  type,
  isLatest = false,
  onRegenerateResponse,
  onGenerateExample
}) => {
  const [likeStatus, setLikeStatus] = useState<'like' | 'dislike' | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [showExampleMenu, setShowExampleMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const exampleMenuRef = useRef<HTMLDivElement>(null);
  const exampleButtonRef = useRef<HTMLButtonElement>(null);
  const codeOptionRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exampleMenuRef.current && 
        exampleButtonRef.current && 
        !exampleMenuRef.current.contains(event.target as Node) &&
        !exampleButtonRef.current.contains(event.target as Node)
      ) {
        setShowExampleMenu(false);
      }
      
      if (
        languageMenuRef.current && 
        codeOptionRef.current &&
        !languageMenuRef.current.contains(event.target as Node) &&
        !codeOptionRef.current.contains(event.target as Node)
      ) {
        setShowLanguageMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleCodeOptionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLanguageMenu(!showLanguageMenu);
  };
  
  const handleLanguageSelect = (language: string) => {
    if (onGenerateExample) {
      onGenerateExample(`code-${language}`);
      setShowLanguageMenu(false);
      setShowExampleMenu(false);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };
  
  const handleLike = () => {
    setLikeStatus(likeStatus === 'like' ? null : 'like');
  };
  
  const handleDislike = () => {
    setLikeStatus(likeStatus === 'dislike' ? null : 'dislike');
  };
  
  const handleExampleClick = () => {
    setShowExampleMenu(!showExampleMenu);
  };
  
  const handleExampleTypeSelect = (exampleType: string) => {
    if (onGenerateExample) {
      onGenerateExample(exampleType);
      setShowExampleMenu(false);
    } else {
      console.warn("onGenerateExample is not defined");
    }
  };
  
  // Determine tag text based on type
  const getTagText = () => {
    switch(type) {
      case 'real-world': return 'Real-world Example';
      case 'code': return 'Code Example';
      case 'analogy': return 'Analogy';
      case 'story': return 'Story';
      default: return null;
    }
  };
  
  const tagText = getTagText();
  
  return (
    <div className={`message ${sender === 'user' ? 'user-message' : 'assistant-message'}${type ? ` ${type}` : ''}`}>
      {sender === 'assistant' && tagText && (
        <div className={`message-tag ${type}`}>
          {type === 'real-world' && <FaGlobeAmericas className="tag-icon" />}
          {type === 'code' && <FaCode className="tag-icon" />}
          {type === 'analogy' && <FaExchangeAlt className="tag-icon" />}
          {type === 'story' && <FaBookOpen className="tag-icon" />}
          <span>{tagText}</span>
        </div>
      )}
      <div className="message-content">
        {type === 'code' && text.includes('```') ? (
          <>
            {text.split('```').map((segment, index) => {
              // Even indexes are outside code blocks, odd indexes are inside
              if (index % 2 === 0) {
                return (
                  <ReactMarkdown
                    key={index}
                    components={{
                      p: ({ node, ...props }) => (
                        <p style={{ marginBottom: "0rem", lineHeight: "1.5" }} {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em style={{ 
                          fontStyle: 'italic', 
                          color: '#a0d2ff', 
                          fontWeight: 300,
                          opacity: 0.85,
                          padding: '0 2px',
                          letterSpacing: '0.02em'
                        }} {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul style={{ margin: "1rem 0", paddingLeft: "1.5rem" }} {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li style={{ marginBottom: "0.4rem" }} {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong style={{ fontWeight: 600, color: "#fff" }} {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          style={{ color: "#1E90FF", textDecoration: "underline" }}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          style={{
                            borderLeft: "4px solid #888",
                            paddingLeft: "1rem",
                            margin: "1rem 0",
                            color: "#aaa",
                            fontStyle: "italic",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "4px",
                          }}
                          {...props}
                        />
                      ),
                      h1: ({ node, ...props }) => <h1 style={{ margin: "0.8rem 0" }} {...props} />,
                      h2: ({ node, ...props }) => <h2 style={{ margin: "0.8rem 0" }} {...props} />,
                      h3: ({ node, ...props }) => <h3 style={{ margin: "0.8rem 0" }} {...props} />,
                    }}
                  >
                    {segment}
                  </ReactMarkdown>
                );
              } else {
                // Extract language if present on first line
                const lines = segment.split('\n');
                const language = lines[0].trim();
                const code = lines.slice(1).join('\n');
                
                return (
                  <div className="code-canvas" key={index}>
                    <div className="code-canvas-header">
                      <div className="code-canvas-title">{language || 'code'}</div>
                      <button 
                        className="code-canvas-copy"
                        onClick={() => {
                          navigator.clipboard.writeText(code);
                          setShowToast(true);
                          setTimeout(() => setShowToast(false), 2000);
                        }}
                        title="Copy code"
                      >
                        <IoCopyOutline size={14} />
                        <span>Copy</span>
                      </button>
                    </div>
                    <div className="code-canvas-content">
                      <pre>
                        <code>{code}</code>
                      </pre>
                    </div>
                  </div>
                );
              }
            })}
          </>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <p style={{ marginBottom: "1rem", lineHeight: "1.5" }} {...props} />
              ),
              em: ({ node, ...props }) => (
                <em style={{ 
                  fontStyle: 'italic', 
                  color: '#a0d2ff', 
                  fontWeight: 300,
                  opacity: 0.85,
                  padding: '0 2px',
                  letterSpacing: '0.02em'
                }} {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul style={{ margin: "1rem 0", paddingLeft: "1.5rem" }} {...props} />
              ),
              li: ({ node, ...props }) => (
                <li style={{ marginBottom: "0.4rem" }} {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong style={{ fontWeight: 600, color: sender === 'user' ? "#000" : "#fff" }} {...props} />
              ),
              a: ({ node, ...props }) => (
                <a
                  style={{ color: "#1E90FF", textDecoration: "underline" }}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              blockquote: ({ node, ...props }) => (
                <blockquote
                  style={{
                    borderLeft: "4px solid #888",
                    paddingLeft: "1rem",
                    margin: "1rem 0",
                    color: "#aaa",
                    fontStyle: "italic",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "4px",
                  }}
                  {...props}
                />
              ),
              h1: ({ node, ...props }) => <h1 style={{ margin: "0.8rem 0" }} {...props} />,
              h2: ({ node, ...props }) => <h2 style={{ margin: "0.8rem 0" }} {...props} />,
              h3: ({ node, ...props }) => <h3 style={{ margin: "0.8rem 0" }} {...props} />,
            }}
          >
            {text.replace(/\n/g, "\n\n")}
          </ReactMarkdown>
        )}
      </div>
      
      {sender === 'assistant' && (
        <div className={`message-actions ${isLatest ? 'always-visible' : 'hover-visible'}`}>
          <button className="message-action-button" onClick={handleCopy} title="Copy to clipboard">
            <IoCopyOutline />
          </button>
          
          <button 
            className={`message-action-button ${likeStatus === 'like' ? 'active' : ''}`} 
            onClick={handleLike}
            title="Like"
          >
            {likeStatus === 'like' ? <AiFillLike /> : <AiOutlineLike />}
          </button>
          
          <button 
            className={`message-action-button ${likeStatus === 'dislike' ? 'active' : ''}`} 
            onClick={handleDislike}
            title="Dislike"
          >
            {likeStatus === 'dislike' ? <AiFillDislike /> : <AiOutlineDislike />}
          </button>
          
          <div className="example-button-container">
            {/* <button 
              ref={exampleButtonRef}
              className={`message-action-button example-button ${showExampleMenu ? 'active' : ''}`} 
              onClick={handleExampleClick}
              title="Show examples"
            >
              <HiOutlineLightBulb />
            </button> */}
            
            {showExampleMenu && (
              <div ref={exampleMenuRef} className="example-menu">
                <button 
                  className="example-menu-item" 
                  onClick={() => handleExampleTypeSelect('real-world')}
                >
                  <FaGlobeAmericas className="example-icon" />
                  <span>Real-world</span>
                </button>
                
                <div 
                  ref={codeOptionRef}
                  className="example-menu-item code-option"
                  onClick={handleCodeOptionClick}
                >
                  <FaCode className="example-icon" />
                  <span>Code</span>
                  <span className="code-chevron">›</span>
                </div>
                
                <button 
                  className="example-menu-item" 
                  onClick={() => handleExampleTypeSelect('analogy')}
                >
                  <FaExchangeAlt className="example-icon" />
                  <span>Analogy</span>
                </button>
                
                <button 
                  className="example-menu-item" 
                  onClick={() => handleExampleTypeSelect('story')}
                >
                  <FaBookOpen className="example-icon" />
                  <span>Story</span>
                </button>
              </div>
            )}
            
            {showExampleMenu && showLanguageMenu && (
              <div ref={languageMenuRef} className="language-submenu">
                <button 
                  className="language-option" 
                  onClick={() => handleLanguageSelect('javascript')}
                >
                  JavaScript
                </button>
                <button 
                  className="language-option" 
                  onClick={() => handleLanguageSelect('python')}
                >
                  Python
                </button>
                <button 
                  className="language-option" 
                  onClick={() => handleLanguageSelect('java')}
                >
                  Java
                </button>
                <button 
                  className="language-option" 
                  onClick={() => handleLanguageSelect('cpp')}
                >
                  C++
                </button>
                <button 
                  className="language-option" 
                  onClick={() => handleLanguageSelect('csharp')}
                >
                  C#
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {showToast && <div className="copy-toast">Copied to clipboard</div>}
    </div>
  );
};

export default Message;