import React, { useState, useMemo } from 'react';
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
  const [handOrder, setHandOrder] = useState<CardType[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const currentPlayer = gameState.players.find(p => p.id === playerId);
  
  // Update hand order when player's hand changes
  React.useEffect(() => {
    if (currentPlayer && currentPlayer.hand.length !== handOrder.length) {
      setHandOrder([...currentPlayer.hand]);
    }
  }, [currentPlayer?.hand, handOrder.length]);
  
  // Use ordered hand for display
  const orderedHand = handOrder.length > 0 ? handOrder : currentPlayer?.hand || [];
  const isMyTurn = gameState.players[gameState.turnIdx]?.id === playerId;
  const canCallNow = canCall(gameState, playerId);
  const handTotal = currentPlayer ? sumPoints(currentPlayer.hand) : 0;
  
  const cardKey = (card: CardType) => `${card.r}-${card.s}`;
  
  const selectedCardObjects = useMemo(() => {
    if (!currentPlayer) return [];
    return orderedHand.filter(card => selectedCards.has(cardKey(card)));
  }, [orderedHand, selectedCards]);
  
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
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (isNaN(dragIndex) || dragIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    
    const newOrder = [...orderedHand];
    const [draggedCard] = newOrder.splice(dragIndex, 1);
    newOrder.splice(dropIndex, 0, draggedCard);
    
    setHandOrder(newOrder);
    setDraggedIndex(null);
  };
  
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  
  const handleDropCards = () => {
    if (!validDrop || !currentPlayer) return;
    
    if (validateDrop(currentPlayer.hand, { kind: validDrop.kind as 'single' | 'pair' | 'trips' | 'quads' | 'straight', cards: validDrop.cards })) {
      onDropCards(validDrop.cards, validDrop.kind as 'single' | 'pair' | 'trips' | 'quads' | 'straight');
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
        {orderedHand.map((card, index) => (
          <div
            key={`${cardKey(card)}-${index}`}
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "transition-all duration-200 cursor-move",
              "hover:scale-105"
            )}
          >
            <Card
              card={card}
              size="lg"
              selected={selectedCards.has(cardKey(card))}
              onClick={() => handleCardClick(card)}
              className={cn(
                !isMyTurn || gameState.turnStage !== 'start' 
                  ? 'cursor-not-allowed opacity-75' 
                  : 'cursor-pointer',
                'hover:shadow-lg'
              )}
            />
          </div>
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
          onClick={handleDropCards}
          data-testid="button-drop"
        >
          <i className="fas fa-arrow-down mr-2" />
          {getDropButtonText()}
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
