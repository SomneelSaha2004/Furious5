import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useGameSocket } from '@/hooks/use-game-socket';
import {
  Users,
  UserPlus,
  LogIn,
  Sparkles,
  RotateCcw,
  CopyCheck,
  ShieldCheck,
  Gamepad2,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-table">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold sm:text-4xl">Furious Five</h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Sharpen your reads, drop smart combos, and call before anyone else does.
                </p>
              </div>
            </div>
            <div className="surface-soft rounded-3xl border border-border/60 bg-card/80 p-4 text-sm text-muted-foreground shadow-ambient">
              Race to get your hand total below five points. Coordinate with friends, bluff your way through, and own the table.
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              data-testid="button-reset-app"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset app
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="flex flex-col gap-6">
            <motion.div
              className="grid gap-6 sm:grid-cols-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Create a room
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="create-name">Your name</Label>
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
                      size="lg"
                    >
                      <Users className="h-4 w-4" />
                      Create room
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center">
                      <div className="text-xs uppercase tracking-[0.2em] text-primary">Room created</div>
                      <div className="text-xl font-mono font-semibold text-primary">{roomCode}</div>
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                        Joining lobby…
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-primary" />
                    Join a room
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="join-name">Your name</Label>
                    <Input
                      id="join-name"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      data-testid="input-join-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="room-code">Room code</Label>
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
                    size="lg"
                  >
                    <LogIn className="h-4 w-4" />
                    Join room
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Before you start
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CopyCheck className="h-4 w-4 text-primary" />
                  Share the generated room code with friends so they can jump straight into your lobby.
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Each player starts with five cards. Drop combinations to trim your total, then call when you dip below five.
                </p>
              </CardContent>
            </Card>
          </div>

          <aside className="surface-soft glass-panel h-full rounded-3xl border border-border/60 p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Learn the ropes
            </h2>
            <Accordion type="single" collapsible className="mt-4">
              <AccordionItem value="rules">
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground">
                  Basic rules
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Each player starts with five cards.</li>
                    <li>Goal: bring your hand total under five points.</li>
                    <li>Card values: A=1 · 2-10 face value · J=11 · Q=12 · K=13.</li>
                    <li>Call when your total drops below five to trigger settlement.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="plays">
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground">
                  Valid drops
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Single: any individual card.</li>
                    <li>Pair/Trips/Quads: same rank sets.</li>
                    <li>Straight: three or more consecutive ranks.</li>
                    <li>Combine smartly to keep your draw options open.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="tips">
                <AccordionTrigger className="text-left text-sm font-semibold text-foreground">
                  Table etiquette
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Ready up from the lobby so friends know you are good to go.</li>
                    <li>Use the call button wisely—bluffing is part of the fun.</li>
                    <li>Long-press the theme toggle to adapt the table for low light.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </aside>
        </main>
      </div>
    </div>
  );
}
