// Card component for rendering a playing card with various states and sizes
import { cn } from '@/lib/utils';
import type { Card as CardType } from '@shared/game-types';

// Props for the Card component
interface CardProps {
  card: CardType; // Card data (rank and suit)
  selected?: boolean; // Whether the card is selected
  faceDown?: boolean; // Whether the card is face down
  size?: 'sm' | 'md' | 'lg'; // Card size
  onClick?: () => void; // Click handler
  className?: string; // Additional CSS classes
}

export function Card({ card, selected = false, faceDown = false, size = 'md', onClick, className }: CardProps) {
  // Returns the Unicode symbol for a suit
  const getSuitSymbol = (suit: CardType['s']) => {
    switch (suit) {
      case 'C': return '♣';
      case 'D': return '♦';
      case 'H': return '♥';
      case 'S': return '♠';
      default: return '?';
    }
  };
  
  // Converts rank number to display string (A, 2-10, J, Q, K)
  const getRankString = (rank: CardType['r']) => {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return rank.toString();
  };
  
  // Determines if the card suit is red (for styling)
  const isRed = card.s === 'D' || card.s === 'H';
  
  // Tailwind classes for card size
  const sizeClasses = {
    sm: 'w-8 h-11',
    md: 'w-12 h-17',
    lg: 'w-16 h-22'
  };
  
  // Tailwind classes for text size
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-lg',
    lg: 'text-xl'
  };
  
  // Render face-down card (no rank/suit shown)
  if (faceDown) {
    return (
      <div 
        className={cn(
          'card bg-gradient-to-br from-blue-800 to-blue-900 rounded border cursor-pointer',
          sizeClasses[size],
          className
        )}
        onClick={onClick}
      />
    );
  }
  
  // Render face-up card with rank and suit
  return (
    <div 
      className={cn(
        'card bg-white border flex flex-col items-center justify-center cursor-pointer transition-all duration-200',
        sizeClasses[size],
        selected && 'selected transform -translate-y-2 border-2 border-accent shadow-lg', // Selected styling
        !selected && 'hover:shadow-lg hover:transform hover:-translate-y-1', // Hover styling
        className
      )}
      onClick={onClick}
      data-testid={`card-${getRankString(card.r)}${card.s}`}
    >
      {/* Card rank */}
      <div className={cn(
        'font-bold',
        textSizeClasses[size],
        isRed ? 'text-red-600' : 'text-gray-800'
      )}>
        {getRankString(card.r)}
      </div>
      {/* Card suit */}
      <div className={cn(
        'text-sm',
        isRed ? 'text-red-600' : 'text-gray-800'
      )}>
        {getSuitSymbol(card.s)}
      </div>
    </div>
  );
}
