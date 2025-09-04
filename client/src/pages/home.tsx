import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useGameSocket } from '@/hooks/use-game-socket';
import { Users, GamepadIcon } from 'lucide-react';

export default function Home() {
  const [, setLocation] = useLocation();
  const [playerName, setPlayerName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const { createRoom, joinRoom, roomCode, clearRoom } = useGameSocket();
  
  // Clear any old room data when home page loads
  useEffect(() => {
    if (!roomCode) {
      localStorage.removeItem('furious-five-room-code');
      localStorage.removeItem('furious-five-player-id');
    }
  }, [roomCode]);
  
  // Manual reset function for debugging
  const handleReset = () => {
    console.log('Manual reset triggered');
    clearRoom();
    localStorage.clear();
    setPlayerName('');
    setJoinRoomCode('');
  };
  
  // Auto-redirect to game page when room is created
  useEffect(() => {
    if (roomCode) {
      const timer = setTimeout(() => {
        setLocation('/game');
      }, 500); // Small delay to ensure room is fully created
      return () => clearTimeout(timer);
    }
  }, [roomCode, setLocation]);
  
  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    
    const name = playerName.trim();
    localStorage.setItem('playerName', name);
    
    try {
      // Try WebSocket first
      createRoom(name);
      
      // If WebSocket doesn't work within 3 seconds, try HTTP fallback
      setTimeout(async () => {
        if (!roomCode) {
          console.log('WebSocket room creation failed, trying HTTP fallback...');
          try {
            const response = await fetch('/api/rooms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerName: name }),
            });
            
            const data = await response.json();
            if (data.success) {
              console.log('HTTP room creation successful:', data.roomCode);
              localStorage.setItem('roomCode', data.roomCode);
              localStorage.setItem('playerId', data.playerId);
              setLocation('/game');
            } else {
              console.error('HTTP room creation failed:', data.error);
            }
          } catch (error) {
            console.error('HTTP room creation error:', error);
          }
        }
      }, 3000);
      
    } catch (error) {
      console.error('Room creation error:', error);
    }
  };
  
  const handleJoinRoom = async () => {
    if (!playerName.trim() || !joinRoomCode.trim()) return;
    
    const name = playerName.trim();
    const code = joinRoomCode.trim().toUpperCase();
    
    try {
      // Try WebSocket first
      joinRoom(code, name);
      
      // If WebSocket doesn't work within 3 seconds, try HTTP fallback
      setTimeout(async () => {
        const currentRoomCode = localStorage.getItem('roomCode');
        if (!currentRoomCode || currentRoomCode !== code) {
          console.log('WebSocket room join failed, trying HTTP fallback...');
          try {
            const response = await fetch(`/api/rooms/${code}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ playerName: name }),
            });
            
            const data = await response.json();
            if (data.success) {
              console.log('HTTP room join successful:', code);
              localStorage.setItem('roomCode', code);
              localStorage.setItem('playerId', data.playerId);
              setLocation('/game');
            } else {
              console.error('HTTP room join failed:', data.error);
              alert(`Failed to join room: ${data.error}`);
            }
          } catch (error) {
            console.error('HTTP room join error:', error);
            alert('Failed to join room. Please check the room code and try again.');
          }
        }
      }, 3000);
      
    } catch (error) {
      console.error('Room join error:', error);
    }
  };
  
  const handleGoToLobby = () => {
    if (roomCode) {
      setLocation('/game');
    }
  };
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Theme Toggle */}
<div className="fixed top-6 right-4 z-50">
        <ThemeToggle />
      </div>
      
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
          
          {/* Reset Button - For debugging */}
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
              data-testid="button-reset-app"
            >
              <i className="fas fa-refresh mr-1" />
              Reset App
            </Button>
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
              
              {!roomCode ? (
                <Button
                  className="w-full"
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                  data-testid="button-create-room"
                >
                  <i className="fas fa-plus mr-2" />
                  Create Room
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Room Created:</div>
                    <div className="text-xl font-mono font-bold text-primary">{roomCode}</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Joining lobby...
                    </div>
                  </div>
                </div>
              )}
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
