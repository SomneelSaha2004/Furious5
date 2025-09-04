import type { Card, Drop, GameState, Player, TableDrop, Settlement, Rank, DropKind } from './game-types';

// Card utilities
export function cardToString(card: Card): string {
  const rankStr = card.r === 1 ? 'A' : 
                  card.r === 11 ? 'J' : 
                  card.r === 12 ? 'Q' : 
                  card.r === 13 ? 'K' : 
                  card.r.toString();
  return `${rankStr}${card.s}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Card['s'][] = ['C', 'D', 'H', 'S'];
  const ranks: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ r: rank, s: suit });
    }
  }
  
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function sumPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.r, 0);
}

export function removeCards(hand: Card[], toRemove: Card[]): Card[] {
  const result = [...hand];
  
  for (const removeCard of toRemove) {
    const index = result.findIndex(card => 
      card.r === removeCard.r && card.s === removeCard.s
    );
    if (index >= 0) {
      result.splice(index, 1);
    }
  }
  
  return result;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.r === b.r && a.s === b.s;
}

// Validation functions
export function isSameRank(cards: Card[], expectedCount: number): boolean {
  if (cards.length !== expectedCount) return false;
  if (cards.length === 0) return false;
  
  const rank = cards[0].r;
  return cards.every(card => card.r === rank);
}

export function isStraight(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  
  const ranks = cards.map(card => card.r).sort((a, b) => a - b);
  
  // Check for duplicates first - straights can't have duplicate ranks
  const uniqueRanks = [...new Set(ranks)];
  if (uniqueRanks.length !== ranks.length) {
    return false;
  }
  
  // Check for consecutive ranks
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i-1] + 1) {
      return false;
    }
  }
  
  return true;
}

// Helper function to sort cards for display
export function sortCardsForDisplay(cards: Card[], dropKind?: string): Card[] {
  if (dropKind === 'straight') {
    // Sort straights by rank for proper display
    return [...cards].sort((a, b) => a.r - b.r);
  }
  
  // For other combinations, sort by rank then suit for consistency
  return [...cards].sort((a, b) => {
    if (a.r !== b.r) return a.r - b.r;
    return a.s.localeCompare(b.s);
  });
}

export function validateDrop(hand: Card[], drop: Drop): boolean {
  // Check if all cards in drop are in hand
  for (const dropCard of drop.cards) {
    const hasCard = hand.some(handCard => cardsEqual(handCard, dropCard));
    if (!hasCard) return false;
  }
  
  switch (drop.kind) {
    case 'single':
      return drop.cards.length === 1;
    
    case 'pair':
      return isSameRank(drop.cards, 2);
    
    case 'trips':
      return isSameRank(drop.cards, 3);
    
    case 'quads':
      return isSameRank(drop.cards, 4);
    
    case 'straight':
      return isStraight(drop.cards);
    
    default:
      return false;
  }
}

export function canCall(state: GameState, playerId: string): boolean {
  if (state.phase !== 'playing') return false;
  if (state.turnStage !== 'start') return false;
  
  const currentPlayer = state.players[state.turnIdx];
  if (currentPlayer.id !== playerId) return false;
  
  const handTotal = sumPoints(currentPlayer.hand);
  return handTotal < 5;
}

export function canDrawFromTable(tableDrop: TableDrop, cardIndex: number): boolean {
  if (!tableDrop) return false;
  if (cardIndex < 0 || cardIndex >= tableDrop.cards.length) return false;
  
  if (tableDrop.kind === 'straight' && tableDrop.cards.length >= 3) {
    // Can only take ends of straight
    return cardIndex === 0 || cardIndex === tableDrop.cards.length - 1;
  }
  
  // For non-straights or straights reduced to 2 cards, can take any
  return true;
}

// Game state mutations
export function createGame(roomCode: string, playerName: string, playerId: string): GameState {
  const deck = shuffleDeck(createDeck());
  
  const player: Player = {
    id: playerId,
    name: playerName,
    connected: true,
    hand: [],
    chipDelta: 0
  };
  
  return {
    roomCode,
    phase: 'lobby',
    players: [player],
    turnIdx: 0,
    turnStage: 'start',
    deck,
    graveyard: [],
    tableDrop: null,
    pendingDrop: null,
    settlement: null,
    version: 1
  };
}

export function joinGame(state: GameState, playerName: string, playerId: string): GameState {
  if (state.players.length >= 5) {
    throw new Error('Room is full');
  }
  
  if (state.players.some(p => p.id === playerId)) {
    throw new Error('Player already in game');
  }
  
  const newPlayer: Player = {
    id: playerId,
    name: playerName,
    connected: true,
    hand: [],
    chipDelta: 0
  };
  
  return {
    ...state,
    players: [...state.players, newPlayer],
    version: state.version + 1
  };
}

export function startRound(state: GameState): GameState {
  if (state.players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }
  
  const deck = shuffleDeck(createDeck());
  const players = state.players.map(player => ({
    ...player,
    hand: []
  }));
  
  // Deal 5 cards to each player
  let deckCopy = [...deck];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < players.length; j++) {
      if (deckCopy.length > 0) {
        players[j].hand.push(deckCopy.pop()!);
      }
    }
  }
  
  return {
    ...state,
    phase: 'playing',
    players,
    turnIdx: 0,
    turnStage: 'start',
    deck: deckCopy,
    graveyard: [],
    tableDrop: null,
    pendingDrop: null,
    settlement: null,
    version: state.version + 1
  };
}

export function applyDrop(state: GameState, playerId: string, drop: Drop): GameState {
  if (state.phase !== 'playing') {
    throw new Error('Not in playing phase');
  }
  
  if (state.turnStage !== 'start') {
    throw new Error('Not at start of turn');
  }
  
  const currentPlayer = state.players[state.turnIdx];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn');
  }
  
  if (!validateDrop(currentPlayer.hand, drop)) {
    throw new Error('Invalid drop');
  }
  
  const newHand = removeCards(currentPlayer.hand, drop.cards);
  const newPlayers = [...state.players];
  newPlayers[state.turnIdx] = {
    ...currentPlayer,
    hand: newHand
  };
  
  // Keep the tableDrop as is for now - don't update it yet
  // The dropped cards will become the new tableDrop only when the turn advances
  return {
    ...state,
    players: newPlayers,
    turnStage: 'dropped',
    pendingDrop: drop, // Store the drop temporarily
    version: state.version + 1
  };
}

export function drawFromDeck(state: GameState, playerId: string): GameState {
  if (state.turnStage !== 'dropped') {
    throw new Error('Must drop before drawing');
  }
  
  const currentPlayer = state.players[state.turnIdx];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn');
  }
  
  let deck = [...state.deck];
  let graveyard = [...state.graveyard];
  
  // Reshuffle if deck is empty
  if (deck.length === 0 && graveyard.length > 0) {
    deck = shuffleDeck(graveyard);
    graveyard = [];
  }
  
  if (deck.length === 0) {
    // No cards available, just advance turn
    return advanceTurn(state);
  }
  
  const drawnCard = deck.pop()!;
  const newPlayers = [...state.players];
  newPlayers[state.turnIdx] = {
    ...currentPlayer,
    hand: [...currentPlayer.hand, drawnCard]
  };
  
  return advanceTurn({
    ...state,
    players: newPlayers,
    deck,
    graveyard,
    version: state.version + 1
  });
}

export function drawFromTable(state: GameState, playerId: string, cardIndex: number): GameState {
  // Allow drawing from table at start of turn (to take from previous player) OR after dropping
  if (state.turnStage !== 'start' && state.turnStage !== 'dropped') {
    throw new Error('Can only draw from table at start of turn or after dropping');
  }
  
  const currentPlayer = state.players[state.turnIdx];
  if (currentPlayer.id !== playerId) {
    throw new Error('Not your turn');
  }
  
  if (!state.tableDrop) {
    throw new Error('No table drop available');
  }
  
  if (!canDrawFromTable(state.tableDrop, cardIndex)) {
    throw new Error('Cannot draw that card from table');
  }
  
  const drawnCard = state.tableDrop.cards[cardIndex];
  const remainingCards = state.tableDrop.cards.filter((_, i) => i !== cardIndex);
  
  const newPlayers = [...state.players];
  newPlayers[state.turnIdx] = {
    ...currentPlayer,
    hand: [...currentPlayer.hand, drawnCard]
  };
  
  let newTableDrop: TableDrop = null;
  if (remainingCards.length > 0) {
    // If it was a straight and now has 2 cards, it's no longer a straight for draw purposes
    let newKind = state.tableDrop.kind;
    if (state.tableDrop.kind === 'straight' && remainingCards.length === 2) {
      newKind = 'pair'; // Treat as non-straight for future draws
    }
    
    newTableDrop = {
      kind: newKind,
      cards: remainingCards
    };
  }
  
  const newState = {
    ...state,
    players: newPlayers,
    tableDrop: newTableDrop,
    version: state.version + 1
  };
  
  // If we drew at the start of turn, stay on same player - they still need to drop
  // If we drew after dropping, advance to next player
  if (state.turnStage === 'start') {
    return newState; // Stay on same player, they still need to drop
  } else {
    return advanceTurn(newState); // After dropping, advance turn
  }
}

function advanceTurn(state: GameState): GameState {
  const nextTurnIdx = (state.turnIdx + 1) % state.players.length;
  
  // Move previous table drop to graveyard and set pending drop as new table drop
  let newGraveyard = [...state.graveyard];
  if (state.tableDrop) {
    newGraveyard = [...newGraveyard, ...state.tableDrop.cards];
  }
  
  return {
    ...state,
    turnIdx: nextTurnIdx,
    turnStage: 'start',
    graveyard: newGraveyard,
    tableDrop: state.pendingDrop || null,
    pendingDrop: null
  };
}

export function settleOnCall(state: GameState, playerId: string): GameState {
  if (!canCall(state, playerId)) {
    throw new Error('Cannot call');
  }
  
  const callerIdx = state.turnIdx;
  const caller = state.players[callerIdx];
  const totals = state.players.map(player => sumPoints(player.hand));
  const callerTotal = totals[callerIdx];
  
  // Find lowest total among all players
  const lowestTotal = Math.min(...totals);
  const payouts = new Array(state.players.length).fill(0);
  
  if (callerTotal === lowestTotal) {
    // Check if caller is uniquely lowest
    const lowestPlayers = totals.map((total, idx) => ({ total, idx }))
                                .filter(p => p.total === lowestTotal);
    
    if (lowestPlayers.length === 1) {
      // Successful call - caller is uniquely lowest
      for (let i = 0; i < state.players.length; i++) {
        if (i !== callerIdx) {
          const payment = totals[i] - callerTotal;
          payouts[i] = -payment;
          payouts[callerIdx] += payment;
        }
      }
    } else {
      // Failed call - caller tied for lowest
      handleFailedCall(state, callerIdx, totals, payouts);
    }
  } else {
    // Failed call - caller is not lowest
    handleFailedCall(state, callerIdx, totals, payouts);
  }
  
  // Update chip deltas
  const newPlayers = state.players.map((player, idx) => ({
    ...player,
    chipDelta: player.chipDelta + payouts[idx]
  }));
  
  const settlement: Settlement = {
    callerIdx,
    totals,
    payouts
  };
  
  return {
    ...state,
    phase: 'settlement',
    players: newPlayers,
    settlement,
    version: state.version + 1
  };
}

function handleFailedCall(state: GameState, callerIdx: number, totals: number[], payouts: number[]): void {
  // Find lowest among non-caller players
  const nonCallerTotals = totals.map((total, idx) => ({ total, idx }))
                               .filter(p => p.idx !== callerIdx);
  const lowestNonCaller = Math.min(...nonCallerTotals.map(p => p.total));
  
  // Find all players with lowest non-caller total
  const lowestPlayers = nonCallerTotals.filter(p => p.total === lowestNonCaller);
  
  // Choose receiver by clockwise order from caller
  let receiverIdx = -1;
  for (let offset = 1; offset < state.players.length; offset++) {
    const candidateIdx = (callerIdx + offset) % state.players.length;
    if (lowestPlayers.some(p => p.idx === candidateIdx)) {
      receiverIdx = candidateIdx;
      break;
    }
  }
  
  // Calculate total payment from caller
  const totalPayment = totals.reduce((sum, total, idx) => {
    if (idx === receiverIdx) return sum;
    return sum + (total - lowestNonCaller);
  }, 0);
  
  payouts[callerIdx] = -totalPayment;
  payouts[receiverIdx] = totalPayment;
}

// Invariant checking
export function checkInvariants(state: GameState): void {
  // Card conservation
  const allCards = [
    ...state.deck,
    ...state.graveyard,
    ...state.players.flatMap(p => p.hand),
    ...(state.tableDrop?.cards || []),
    ...(state.pendingDrop?.cards || [])
  ];
  
  if (allCards.length !== 52) {
    throw new Error(`Card conservation violated: ${allCards.length} cards`);
  }
  
  // Card uniqueness
  const cardSet = new Set(allCards.map(cardToString));
  if (cardSet.size !== 52) {
    throw new Error('Card uniqueness violated');
  }
  
  // Hand size constraints
  for (const player of state.players) {
    if (state.phase === 'playing' && state.turnStage === 'end') {
      if (player.hand.length < 1 || player.hand.length > 5) {
        throw new Error(`Invalid hand size: ${player.hand.length}`);
      }
    }
  }
  
  // Turn validity
  if (state.turnIdx >= state.players.length) {
    throw new Error('Invalid turn index');
  }
  
  // Table drop validity
  if (state.tableDrop) {
    if (state.tableDrop.kind === 'straight' && state.tableDrop.cards.length < 3) {
      // This is okay - straight can shrink to 2 cards
    }
  }
}
