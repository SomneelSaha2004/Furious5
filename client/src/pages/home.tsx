import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameSocket } from '@/hooks/use-game-socket';

export default function Home() {
  const [, setLocation] = useLocation();
  const [playerName, setPlayerName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const { createRoom, joinRoom, roomCode } = useGameSocket();
  
  // Redirect to game when room is joined/created
  useEffect(() => {
    console.log('roomCode changed:', roomCode);
    if (roomCode) {
      console.log('Redirecting to /game');
      setLocation('/game');
    }
  }, [roomCode, setLocation]);
  
  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    createRoom(playerName.trim());
  };
  
  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinRoomCode.trim()) return;
    joinRoom(joinRoomCode.trim().toUpperCase(), playerName.trim());
  };
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <i className="fas fa-cards text-primary text-6xl" />
            <div>
              <h1 className="text-5xl font-bold text-foreground mb-2">
                Furious Five
              </h1>
              <p className="text-xl text-muted-foreground">
                Multiplayer Card Game
              </p>
            </div>
          </div>
          
          <div className="bg-secondary/50 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-muted-foreground">
              Race to get your hand total below 5 points. Play combinations, 
              draw strategically, and call at the right moment to win!
            </p>
          </div>
        </div>
        
        {/* Game Actions */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          
          {/* Create Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-plus text-primary" />
                <span>Create New Room</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="create-name">Your Name</Label>
                <Input
                  id="create-name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  data-testid="input-player-name"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateRoom}
                disabled={!playerName.trim()}
                data-testid="button-create-room"
              >
                <i className="fas fa-plus mr-2" />
                Create Room
              </Button>
            </CardContent>
          </Card>
          
          {/* Join Room */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <i className="fas fa-sign-in-alt text-primary" />
                <span>Join Existing Room</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="join-name">Your Name</Label>
                <Input
                  id="join-name"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  data-testid="input-join-name"
                />
              </div>
              <div>
                <Label htmlFor="room-code">Room Code</Label>
                <Input
                  id="room-code"
                  placeholder="FF-XXXXXX"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  data-testid="input-room-code"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !joinRoomCode.trim()}
                data-testid="button-join-room"
              >
                <i className="fas fa-sign-in-alt mr-2" />
                Join Room
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Game Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <i className="fas fa-info-circle text-primary" />
              <span>How to Play</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-3">Basic Rules</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Each player starts with 5 cards</li>
                  <li>• Goal: Get your hand total below 5 points</li>
                  <li>• Points: A=1, 2-10=face value, J=11, Q=12, K=13</li>
                  <li>• Call when your hand total is less than 5 to win</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-3">Valid Plays</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• <strong>Single:</strong> Any one card</li>
                  <li>• <strong>Pair:</strong> Two cards of same rank</li>
                  <li>• <strong>Trips:</strong> Three cards of same rank</li>
                  <li>• <strong>Quads:</strong> Four cards of same rank</li>
                  <li>• <strong>Straight:</strong> 3+ consecutive ranks (A-2-3, etc.)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
