import { cn } from '@/lib/utils';
import type { Card as CardType } from '@shared/game-types';

interface CardProps {
  card: CardType;
  selected?: boolean;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export function Card({ card, selected = false, faceDown = false, size = 'md', onClick, className }: CardProps) {
  const getSuitSymbol = (suit: CardType['s']) => {
    switch (suit) {
      case 'C': return '♣';
      case 'D': return '♦';
      case 'H': return '♥';
      case 'S': return '♠';
      default: return '?';
    }
  };
  
  const getRankString = (rank: CardType['r']) => {
    if (rank === 1) return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return rank.toString();
  };
  
  const isRed = card.s === 'D' || card.s === 'H';
  
  const sizeClasses = {
    sm: 'w-8 h-11',
    md: 'w-12 h-17',
    lg: 'w-16 h-22'
  };
  
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-lg',
    lg: 'text-xl'
  };
  
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
  
  return (
    <div 
      className={cn(
        'card bg-white border flex flex-col items-center justify-center cursor-pointer transition-all duration-200',
        sizeClasses[size],
        selected && 'selected transform -translate-y-2 border-2 border-accent shadow-lg',
        !selected && 'hover:shadow-lg hover:transform hover:-translate-y-1',
        className
      )}
      onClick={onClick}
      data-testid={`card-${getRankString(card.r)}${card.s}`}
    >
      <div className={cn(
        'font-bold',
        textSizeClasses[size],
        isRed ? 'text-red-600' : 'text-gray-800'
      )}>
        {getRankString(card.r)}
      </div>
      <div className={cn(
        'text-sm',
        isRed ? 'text-red-600' : 'text-gray-800'
      )}>
        {getSuitSymbol(card.s)}
      </div>
    </div>
  );
}
