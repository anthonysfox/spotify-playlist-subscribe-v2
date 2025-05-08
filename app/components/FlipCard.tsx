import React, { useState, useRef, ReactNode } from "react";

interface FlipCardProps {
  children: [ReactNode, ReactNode];
  className?: string;
}

function FlipCard({ children, className = "" }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div
      ref={cardRef}
      className={`relative w-72 h-72 transition-transform duration-500 ease-in-out transform-gpu ${
        isFlipped ? "rotate-y-180" : ""
      } ${className}`}
      style={{ transformStyle: "preserve-3d" }}
      onClick={handleFlip}
    >
      {/* Front of card */}
      <div className="absolute w-full h-full backface-hidden">
        {children[0]}
      </div>
      {/* Back of card */}
      <div className="absolute w-full h-full backface-hidden rotate-y-180">
        {children[1]}
      </div>
    </div>
  );
}

export default FlipCard;
