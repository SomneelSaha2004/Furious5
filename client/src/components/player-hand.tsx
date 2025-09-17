import { useState, useMemo } from 'react';
import { Card } from './card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Card as CardType, Player, GameState } from '@shared/game-types';
import { validateDrop, sumPoints, canCall } from '@shared/game-engine';

interface PlayerHandProps {
  gameState: GameState;
  playerId: string;
  onCall: () => void;
  onDropCards: (cards: CardType[], kind: string) => void;
  onDrawFromDeck: () => void;
}

export function PlayerHand({ gameState, playerId, onCall, onDropCards, onDrawFromDeck }: PlayerHandProps) {
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.players[gameState.turnIdx]?.id === playerId;
  const canCallNow = canCall(gameState, playerId);
  const handTotal = currentPlayer ? sumPoints(currentPlayer.hand) : 0;
  
  const cardKey = (card: CardType) => `${card.r}-${card.s}`;
  
  const selectedCardObjects = useMemo(() => {
    if (!currentPlayer) return [];
    return currentPlayer.hand.filter(card => selectedCards.has(cardKey(card)));
  }, [currentPlayer, selectedCards]);
  
  const validDrop = useMemo(() => {
    if (!currentPlayer || selectedCardObjects.length === 0) return null;
    
    // Try different drop types
    const cards = selectedCardObjects;
    
    if (cards.length === 1) {
      return { kind: 'single', cards };
    }
    
    if (cards.length >= 2) {
      // Check for same rank
      const rank = cards[0].r;
      if (cards.every(card => card.r === rank)) {
        if (cards.length === 2) return { kind: 'pair', cards };
        if (cards.length === 3) return { kind: 'trips', cards };
        if (cards.length === 4) return { kind: 'quads', cards };
      }
      
      // Check for straight
      if (cards.length >= 3) {
        const sortedRanks = cards.map(c => c.r).sort((a, b) => a - b);
        let isStraight = true;
        for (let i = 1; i < sortedRanks.length; i++) {
          if (sortedRanks[i] !== sortedRanks[i-1] + 1) {
            isStraight = false;
            break;
          }
        }
        if (isStraight) {
          return { kind: 'straight', cards };
        }
      }
    }
    
    return null;
  }, [selectedCardObjects, currentPlayer]);
  
  const handleCardClick = (card: CardType) => {
    if (!isMyTurn || gameState.turnStage !== 'start') return;
    
    const key = cardKey(card);
    const newSelected = new Set(selectedCards);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedCards(newSelected);
  };
  
  const handleDrop = () => {
    if (!validDrop || !currentPlayer) return;
    
    if (validateDrop(currentPlayer.hand, validDrop)) {
      onDropCards(validDrop.cards, validDrop.kind);
      setSelectedCards(new Set());
    }
  };
  
  const getDropButtonText = () => {
    if (!validDrop) return 'Select Cards';
    
    switch (validDrop.kind) {
      case 'single': return 'Drop Single';
      case 'pair': return 'Drop Pair';
      case 'trips': return 'Drop Triple';
      case 'quads': return 'Drop Quad';
      case 'straight': return `Drop Straight (${validDrop.cards.length})`;
      default: return 'Drop Cards';
    }
  };
  
  if (!currentPlayer) return null;
  
  return (
    <div className="bg-card/90 backdrop-blur rounded-lg p-6 shadow-lg">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-4 mb-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground font-bold">
              {currentPlayer.name[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium" data-testid="player-name">
              {currentPlayer.name} (You)
            </div>
            <div className="text-xs text-muted-foreground">
              Hand total: <span className="font-bold" data-testid="hand-total">{handTotal}</span> points
            </div>
          </div>
        </div>
      </div>

      {/* Player's cards */}
      <div className="flex space-x-3 mb-4 justify-center flex-wrap">
        {currentPlayer.hand.map((card, index) => (
          <Card
            key={`${cardKey(card)}-${index}`}
            card={card}
            size="lg"
            selected={selectedCards.has(cardKey(card))}
            onClick={() => handleCardClick(card)}
            className={cn(
              !isMyTurn || gameState.turnStage !== 'start' 
                ? 'cursor-not-allowed opacity-75' 
                : 'cursor-pointer'
            )}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3 justify-center flex-wrap gap-2">
        {/* Call button */}
        <Button
          variant={canCallNow ? "destructive" : "secondary"}
          disabled={!canCallNow || !isMyTurn}
          onClick={onCall}
          data-testid="button-call"
        >
          <i className="fas fa-exclamation-triangle mr-2" />
          {canCallNow ? `Call (${handTotal})` : `Call (${handTotal} ≥ 5)`}
        </Button>
        
        {/* Drop combination button */}
        <Button
          disabled={!isMyTurn || gameState.turnStage !== 'start' || !validDrop}
          onClick={handleDrop}
          data-testid="button-drop"
        >
          <i className="fas fa-arrow-down mr-2" />
          {!isMyTurn ? 'Wait for turn' : 
           gameState.turnStage !== 'start' ? 'Turn in progress' :
           getDropButtonText()}
        </Button>
        
        {/* Draw from deck button */}
        <Button
          variant="secondary"
          disabled={!isMyTurn || gameState.turnStage !== 'dropped'}
          onClick={onDrawFromDeck}
          data-testid="button-draw-deck"
        >
          <i className="fas fa-plus mr-2" />
          Draw from Deck
        </Button>
      </div>
    </div>
  );
}
