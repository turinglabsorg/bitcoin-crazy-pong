"use client";

import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";

// Add Web Audio API types
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentRiff, setCurrentRiff] = useState<'metallica' | 'tool' | 'stranger' | 'none'>('none');
  const [isClient, setIsClient] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
  
  // Synth references
  const synthRef = useRef<Tone.Synth | null>(null);
  const melodyRef = useRef<Tone.Sequence | null>(null);
  const isMobile = useRef(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : ''));
  
  // Game state
  const gameState = useRef({
    bitcoinDifficulty: 0,
    normalizedDifficulty: 0,
    leftScore: 0,
    rightScore: 0,
    ball: {
      x: 0,
      y: 0,
      radius: 0,
      speedX: 4,
      speedY: 3,
      maxSpeed: 8,
      minSpeed: 3,
      friction: 0.999
    },
    leftPaddle: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      speed: 5
    },
    rightPaddle: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      speed: 5
    },
    touchControls: {
      touchStartY: 0,
      touchMoveY: 0,
      isTouching: false,
      leftPaddleSpeed: 0,
      paddleMomentum: 0,
      momentumDecay: 0.95,
      maxMomentum: 15
    },
    keys: {
      ArrowUp: false,
      ArrowDown: false
    }
  });


  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    // Set viewport height for mobile Chrome/Safari toolbars
    const setVh = () => setViewportHeight(window.innerHeight);
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', setVh);
    return () => {
      window.removeEventListener('resize', setVh);
      window.removeEventListener('orientationchange', setVh);
    };
  }, []);

  // Check if we're on mobile
  useEffect(() => {
    isMobile.current = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  // Initialize audio with user interaction (synchronous, robust for mobile)
  const initializeAudio = () => {
    try {
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
      synthRef.current = new Tone.Synth().toDestination();
      synthRef.current.volume.value = -10;
      synthRef.current.triggerAttackRelease("C4", "8n");
      setAudioError(false);
      setAudioEnabled(true);
      return true;
    } catch {
      setAudioError(true);
      setAudioEnabled(false);
      return false;
    }
  };

  // Start game function (never block)
  const startGame = () => {
    setShowModal(false);
    setGameStarted(true);
    // Try to enable audio, but don't block
    if (!synthRef.current) {
      initializeAudio();
    }
  };

  // Handler to start game without sound
  const startWithoutSound = () => {
    setShowAudioPrompt(false);
    setShowModal(false);
    setGameStarted(true);
    setAudioEnabled(false);
  };

  // Initialize audio
  const initAudio = async () => {
    try {
      // Create new synth if it doesn't exist or is disposed
      if (!synthRef.current || synthRef.current.disposed) {
        console.log("Creating new synth...");
        synthRef.current = new Tone.Synth({
          oscillator: { type: "square" },
          envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.3,
            release: 0.1
          }
        }).toDestination();
        
        // Set initial volume
        synthRef.current.volume.value = isMuted ? -Infinity : -12;
      }

      // Stop any existing sequence
      if (melodyRef.current) {
        melodyRef.current.stop();
        melodyRef.current.dispose();
        melodyRef.current = null;
      }

      // Only create melody sequence if we want background music and not in 'none' mode
      if (!melodyRef.current && gameStarted && currentRiff !== 'none') {
        console.log("Creating melody sequence...");
        
        let melody: (string | null)[];
        let noteLength: string;
        let bpm: number;

        if (currentRiff === 'metallica') {
          melody = [
            "E4", "E4", "G4", "C5", "B4", "E4",  // First phrase
            "D4", "C4", "B3", "E4",              // Second phrase
            "E4", "G4", "C5", "B4", "G4", "E4",  // Repeat with variation
            "D4", "C4", "B3", null               // End with rest
          ];
          noteLength = "16n";
          bpm = 180;
        } else if (currentRiff === 'tool') {
          melody = [
            "D3", "D3", "A3", "D3",              // First measure
            "G3", "A3", "D3", null,              // Second measure
            "D3", "D3", "A3", "C4",              // Third measure
            "B3", "A3", "G3", "D3",              // Fourth measure
            "D3", "E3", "F3", "G3",              // Build up
            "A3", "G3", "F3", "E3",              // Descend
            "D3", null, "A3", "D3",              // Tension
            "G3", "A3", "B3", null               // Resolution
          ];
          noteLength = "8n";
          bpm = 90;
        } else {
          melody = [
            "C4", "E4", "G4", "B4",              // First arpeggio
            "C5", "B4", "G4", "E4",              // Descending
            "C4", "E4", "G4", "B4",              // Repeat
            "C5", "B4", "G4", "E4",              // Descending
            "C4", null, "E4", null,              // Sparse notes for tension
            "G4", null, "B4", null,              // Building up
            "C5", "B4", "G4", "E4",              // Final descent
            "C4", null, null, null               // End on root
          ];
          noteLength = "8n";
          bpm = 85;
        }

        // Adjust envelope based on the riff
        if (synthRef.current) {
          if (currentRiff === 'metallica') {
            synthRef.current.envelope.attack = 0.01;
            synthRef.current.envelope.decay = 0.2;
            synthRef.current.envelope.sustain = 0.3;
            synthRef.current.envelope.release = 0.1;
          } else if (currentRiff === 'tool') {
            synthRef.current.envelope.attack = 0.02;
            synthRef.current.envelope.decay = 0.3;
            synthRef.current.envelope.sustain = 0.4;
            synthRef.current.envelope.release = 0.3;
          } else {
            synthRef.current.envelope.attack = 0.1;
            synthRef.current.envelope.decay = 0.3;
            synthRef.current.envelope.sustain = 0.7;
            synthRef.current.envelope.release = 0.8;
            synthRef.current.oscillator.type = "sawtooth";
          }
        }

        melodyRef.current = new Tone.Sequence(
          (time, note) => {
            if (!isMuted && synthRef.current && !synthRef.current.disposed && note) {
              synthRef.current.triggerAttackRelease(note, noteLength, time);
            }
          },
          melody,
          noteLength
        );

        // Set tempo and start
        Tone.Transport.bpm.value = bpm;
        if (!isMuted) {
          Tone.Transport.start();
          melodyRef.current.start(0);
        }
      }

      return true;
    } catch (error) {
      console.error('Audio initialization error:', error);
      return false;
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    try {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);

      if (!synthRef.current || !melodyRef.current) {
        await initAudio();
        return;
      }

      synthRef.current.volume.value = newMutedState ? -Infinity : -12;

      if (newMutedState) {
        melodyRef.current.stop();
        Tone.Transport.stop();
      } else {
        Tone.Transport.start();
        melodyRef.current.start(0);
      }
    } catch (error) {
      console.error('Toggle mute error:', error);
    }
  };

  // Fetch Bitcoin mempool data
  const fetchBitcoinMempool = async () => {
    try {
      const response = await fetch('https://mempool.space/api/mempool');
      const data = await response.json();
      
      gameState.current.bitcoinDifficulty = data.count;
      
      const minTx = 1000;
      const maxTx = 50000;
      const midTx = 25000;
      
      if (data.count <= midTx) {
        gameState.current.normalizedDifficulty = Math.min(50, Math.max(0, ((data.count - minTx) / (midTx - minTx)) * 50));
      } else {
        gameState.current.normalizedDifficulty = Math.min(100, 50 + ((data.count - midTx) / (maxTx - midTx)) * 50);
      }
    } catch (error) {
      console.error('Error fetching mempool data:', error);
      gameState.current.normalizedDifficulty = Math.floor(Math.random() * 101);
    }
  };

  // Add flash effect function
  const flashScreen = () => {
    const flash = document.getElementById('flash');
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(() => {
        flash.style.opacity = '0';
      }, 50);
    }
  };

  // Play hit sound
  const playHitSound = async () => {
    try {
      if (isMuted) return;
      
      if (!synthRef.current) {
        await initAudio();
      }
      
      if (synthRef.current && !synthRef.current.disposed) {
        synthRef.current.triggerAttackRelease("G5", "16n");
      }
    } catch (error) {
      console.error('Play hit sound error:', error);
    }
  };

  // Play score sound
  const playScoreSound = async () => {
    try {
      if (isMuted) return;
      
      if (!synthRef.current) {
        await initAudio();
      }
      
      if (synthRef.current && !synthRef.current.disposed) {
        const now = Tone.now();
        synthRef.current.triggerAttackRelease("C5", "8n", now);
        synthRef.current.triggerAttackRelease("E5", "8n", now + 0.1);
        synthRef.current.triggerAttackRelease("G5", "8n", now + 0.2);
      }
    } catch (error) {
      console.error('Play score sound error:', error);
    }
  };

  // Add riff switch function
  const switchRiff = async () => {
    try {
      // Calculate next riff
      const nextRiff = currentRiff === 'none' ? 'metallica' : 
                      currentRiff === 'metallica' ? 'tool' :
                      currentRiff === 'tool' ? 'stranger' : 'none';
      
      console.log(`Switching riff from ${currentRiff} to ${nextRiff}`);
      
      // Stop current melody if it exists
      if (melodyRef.current) {
        console.log('Stopping current melody');
        melodyRef.current.stop();
        melodyRef.current.dispose();
        melodyRef.current = null;
        Tone.Transport.stop();
      }

      // Update state first
      setCurrentRiff(nextRiff);

      // For non-'none' states, initialize immediately
      if (nextRiff !== 'none') {
        // Ensure audio context is running
        if (Tone.context.state !== "running") {
          await Tone.start();
          await Tone.context.resume();
        }

        // Create new synth if needed
        if (!synthRef.current || synthRef.current.disposed) {
          console.log("Creating new synth...");
          synthRef.current = new Tone.Synth({
            oscillator: { type: "square" },
            envelope: {
              attack: 0.01,
              decay: 0.2,
              sustain: 0.3,
              release: 0.1
            }
          }).toDestination();
          synthRef.current.volume.value = isMuted ? -Infinity : -12;
        }

        // Create and start new melody sequence
        console.log("Creating melody sequence...");
        let melody: (string | null)[] = [];
        let noteLength: string = "8n";  // Default note length
        let bpm: number = 120;          // Default tempo

        if (nextRiff === 'metallica') {
          melody = [
            "E4", "E4", "G4", "C5", "B4", "E4",  // First phrase
            "D4", "C4", "B3", "E4",              // Second phrase
            "E4", "G4", "C5", "B4", "G4", "E4",  // Repeat with variation
            "D4", "C4", "B3", null               // End with rest
          ];
          noteLength = "16n";
          bpm = 180;
          
          // Metallica sound
          if (synthRef.current) {
            synthRef.current.envelope.attack = 0.01;
            synthRef.current.envelope.decay = 0.2;
            synthRef.current.envelope.sustain = 0.3;
            synthRef.current.envelope.release = 0.1;
            synthRef.current.oscillator.type = "square";
          }
        } else if (nextRiff === 'tool') {
          melody = [
            "D3", "D3", "A3", "D3",              // First measure
            "G3", "A3", "D3", null,              // Second measure
            "D3", "D3", "A3", "C4",              // Third measure
            "B3", "A3", "G3", "D3",              // Fourth measure
            "D3", "E3", "F3", "G3",              // Build up
            "A3", "G3", "F3", "E3",              // Descend
            "D3", null, "A3", "D3",              // Tension
            "G3", "A3", "B3", null               // Resolution
          ];
          noteLength = "8n";
          bpm = 90;
          
          // Tool sound
          if (synthRef.current) {
            synthRef.current.envelope.attack = 0.02;
            synthRef.current.envelope.decay = 0.3;
            synthRef.current.envelope.sustain = 0.4;
            synthRef.current.envelope.release = 0.3;
            synthRef.current.oscillator.type = "square";
          }
        } else if (nextRiff === 'stranger') {
          melody = [
            "C4", "E4", "G4", "B4",              // First arpeggio
            "C5", "B4", "G4", "E4",              // Descending
            "C4", "E4", "G4", "B4",              // Repeat
            "C5", "B4", "G4", "E4",              // Descending
            "C4", null, "E4", null,              // Sparse notes for tension
            "G4", null, "B4", null,              // Building up
            "C5", "B4", "G4", "E4",              // Final descent
            "C4", null, null, null               // End on root
          ];
          noteLength = "8n";
          bpm = 85; // Stranger Things tempo
          
          // Stranger Things sound
          if (synthRef.current) {
            synthRef.current.envelope.attack = 0.1;
            synthRef.current.envelope.decay = 0.3;
            synthRef.current.envelope.sustain = 0.7;
            synthRef.current.envelope.release = 0.8;
            synthRef.current.oscillator.type = "sawtooth"; // More analog synth sound
          }
        }

        melodyRef.current = new Tone.Sequence(
          (time, note) => {
            if (!isMuted && synthRef.current && !synthRef.current.disposed && note) {
              synthRef.current.triggerAttackRelease(note, noteLength, time);
            }
          },
          melody!,
          noteLength
        );

        // Set tempo and start
        Tone.Transport.bpm.value = bpm;
        if (!isMuted) {
          console.log(`Starting ${nextRiff} riff...`);
          Tone.Transport.start();
          melodyRef.current.start(0);
        }
      }
    } catch (error) {
      console.error('Switch riff error:', error);
    }
  };

  // Helper function to get riff icon and title
  const getRiffDisplay = () => {
    switch (currentRiff) {
      case 'metallica':
        return { icon: '🤘', title: 'Master of Puppets' };
      case 'tool':
        return { icon: '🌀', title: 'Schism' };
      case 'stranger':
        return { icon: '🔮', title: 'Stranger Things' };
      case 'none':
        return { icon: '🚫', title: 'No Music' };
    }
  };

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      // Use viewportHeight if available, else fallback
      canvas.height = viewportHeight || window.innerHeight;
      
      // Initialize game objects with new dimensions
      gameState.current.ball.radius = Math.min(canvas.width, canvas.height) * 0.02;
      gameState.current.ball.x = canvas.width / 2;
      gameState.current.ball.y = canvas.height / 2;
      
      gameState.current.leftPaddle = {
        x: canvas.width * 0.05,
        y: canvas.height / 2 - canvas.height * 0.15,
        width: canvas.width * 0.02,
        height: canvas.height * 0.3,
        speed: 5
      };
      
      gameState.current.rightPaddle = {
        x: canvas.width * 0.95 - canvas.width * 0.02,
        y: canvas.height / 2 - canvas.height * 0.15,
        width: canvas.width * 0.02,
        height: canvas.height * 0.3,
        speed: 5
      };
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 100);
    });

    // Touch controls
    const handleTouchStart = (e: TouchEvent) => {
      if (!gameStarted) return;
      e.preventDefault();
      gameState.current.touchControls.isTouching = true;
      gameState.current.touchControls.touchStartY = e.touches[0].clientY;
      gameState.current.touchControls.paddleMomentum = 0;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!gameStarted) return;
      e.preventDefault();
      if (gameState.current.touchControls.isTouching) {
        gameState.current.touchControls.touchMoveY = e.touches[0].clientY;
        const deltaY = gameState.current.touchControls.touchMoveY - gameState.current.touchControls.touchStartY;
        const oldY = gameState.current.leftPaddle.y;
        gameState.current.leftPaddle.y += deltaY;
        gameState.current.touchControls.leftPaddleSpeed = (gameState.current.leftPaddle.y - oldY) * 0.5;
        gameState.current.touchControls.paddleMomentum = Math.min(
          Math.max(deltaY * 0.8, -gameState.current.touchControls.maxMomentum),
          gameState.current.touchControls.maxMomentum
        );
        gameState.current.touchControls.touchStartY = gameState.current.touchControls.touchMoveY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!gameStarted) return;
      e.preventDefault();
      gameState.current.touchControls.isTouching = false;
      gameState.current.touchControls.leftPaddleSpeed = 0;
    };

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        gameState.current.touchControls.paddleMomentum = 0;
      }
      if (e.key in gameState.current.keys) {
        gameState.current.keys[e.key as keyof typeof gameState.current.keys] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameStarted) return;
      if (e.key in gameState.current.keys) {
        gameState.current.keys[e.key as keyof typeof gameState.current.keys] = false;
        if (e.key === 'ArrowUp') {
          gameState.current.touchControls.paddleMomentum = -gameState.current.touchControls.maxMomentum * 0.5;
        } else if (e.key === 'ArrowDown') {
          gameState.current.touchControls.paddleMomentum = gameState.current.touchControls.maxMomentum * 0.5;
        }
        gameState.current.touchControls.leftPaddleSpeed = 0;
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Initial fetch and polling
    fetchBitcoinMempool();
    const interval = setInterval(fetchBitcoinMempool, 5 * 1000);

    // Game loop
    const gameLoop = () => {
      if (!gameStarted || !ctx) return;

      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Bitcoin watermark
      ctx.font = '180px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₿', canvas.width / 2, canvas.height / 2);
      
      // Draw "CRAZY PONG" text
      ctx.font = '20px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillText('CRAZY PONG', canvas.width / 2, canvas.height / 2 + 100);
      
      // Reset text alignment and baseline
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff';

      // Move paddles
      const { ball, leftPaddle, rightPaddle, normalizedDifficulty } = gameState.current;
      
      // AI paddle movement
      let targetY = ball.y - rightPaddle.height / 2;
      const errorRange = 80 - (normalizedDifficulty * 0.6);
      const error = Math.random() * errorRange - (errorRange / 2);
      if (Math.random() < (0.3 - (normalizedDifficulty * 0.002))) {
        targetY = rightPaddle.y;
      }
      targetY += error;
      const moveSpeed = (targetY - rightPaddle.y) * (0.05 + (normalizedDifficulty * 0.0005));
      rightPaddle.y += moveSpeed;
      
      // Player paddle movement
      const oldY = leftPaddle.y;
      if (gameState.current.keys.ArrowUp) {
        leftPaddle.y -= leftPaddle.speed;
        gameState.current.touchControls.paddleMomentum = 0;
      }
      if (gameState.current.keys.ArrowDown) {
        leftPaddle.y += leftPaddle.speed;
        gameState.current.touchControls.paddleMomentum = 0;
      }
      
      // Apply momentum
      if (!gameState.current.touchControls.isTouching && 
          !gameState.current.keys.ArrowUp && 
          !gameState.current.keys.ArrowDown && 
          gameState.current.touchControls.paddleMomentum !== 0) {
        leftPaddle.y += gameState.current.touchControls.paddleMomentum;
        gameState.current.touchControls.paddleMomentum *= gameState.current.touchControls.momentumDecay;
        if (Math.abs(gameState.current.touchControls.paddleMomentum) < 0.1) {
          gameState.current.touchControls.paddleMomentum = 0;
        }
      }

      // Calculate paddle speed
      if (gameState.current.keys.ArrowUp || gameState.current.keys.ArrowDown) {
        gameState.current.touchControls.leftPaddleSpeed = (leftPaddle.y - oldY) * 0.5;
      } else {
        gameState.current.touchControls.leftPaddleSpeed = gameState.current.touchControls.paddleMomentum * 0.5;
      }

      // Keep paddles in bounds
      if (leftPaddle.y < 0) {
        leftPaddle.y = 0;
        gameState.current.touchControls.paddleMomentum = 0;
      } else if (leftPaddle.y > canvas.height - leftPaddle.height) {
        leftPaddle.y = canvas.height - leftPaddle.height;
        gameState.current.touchControls.paddleMomentum = 0;
      }

      // Ball physics
      ball.speedX *= ball.friction;
      ball.speedY *= ball.friction;

      if (Math.abs(ball.speedX) < ball.minSpeed) {
        ball.speedX = ball.minSpeed * Math.sign(ball.speedX);
      }
      if (Math.abs(ball.speedY) < ball.minSpeed) {
        ball.speedY = ball.minSpeed * Math.sign(ball.speedY);
      }

      // Move ball
      ball.x += ball.speedX;
      ball.y += ball.speedY;

      // Ball collision with walls
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.speedY = Math.abs(ball.speedY);
      } else if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.speedY = -Math.abs(ball.speedY);
      }

      // Ball collision with paddles
      if (ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
          ball.x + ball.radius > leftPaddle.x &&
          ball.y > leftPaddle.y &&
          ball.y < leftPaddle.y + leftPaddle.height) {
        const hitPosition = (ball.y - leftPaddle.y - leftPaddle.height / 2) / (leftPaddle.height / 2);
        ball.x = leftPaddle.x + leftPaddle.width + ball.radius;
        ball.speedX = Math.abs(ball.speedX) * 1.05;
        ball.speedY = hitPosition * ball.maxSpeed + gameState.current.touchControls.leftPaddleSpeed * 0.8;
        playHitSound();
      } else if (ball.x + ball.radius > rightPaddle.x &&
                 ball.x - ball.radius < rightPaddle.x + rightPaddle.width &&
                 ball.y > rightPaddle.y &&
                 ball.y < rightPaddle.y + rightPaddle.height) {
        const hitPosition = (ball.y - rightPaddle.y - rightPaddle.height / 2) / (rightPaddle.height / 2);
        ball.x = rightPaddle.x - ball.radius;
        ball.speedX = -Math.abs(ball.speedX) * 1.05;
        ball.speedY = hitPosition * ball.maxSpeed + moveSpeed * 0.8;
        playHitSound();
      }

      // Score points
      if (ball.x < 0) {
        gameState.current.rightScore++;
        flashScreen();
        resetBall();
        playScoreSound();
      } else if (ball.x > canvas.width) {
        gameState.current.leftScore++;
        flashScreen();
        resetBall();
        playScoreSound();
      }

      // Draw paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
      ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);
      
      // Draw ball
      const baseRadius = ball.radius;
      const speed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
      const minRadius = baseRadius * 0.6;
      const speedFactor = Math.min(1, 8 / speed);
      const dynamicRadius = minRadius + (baseRadius - minRadius) * speedFactor;
      
      ctx.fillStyle = '#F7931A';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, dynamicRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw scores
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.font = '32px monospace';
      ctx.fillText(gameState.current.leftScore.toString(), 40, 50);
      ctx.font = '14px monospace';
      ctx.fillText('You', 40, 70);

      ctx.textAlign = 'right';
      ctx.font = '32px monospace';
      ctx.fillText(gameState.current.rightScore.toString(), canvas.width - 40, 50);
      ctx.font = '14px monospace';
      ctx.fillText('Satoshi', canvas.width - 40, 70);
      
      // Draw mempool info in center, aligned with bottom buttons
      ctx.textAlign = 'center';
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      const mempoolText = `₿ mempool: ${gameState.current.bitcoinDifficulty} tx`;
      const textMetrics = ctx.measureText(mempoolText);
      const textHeight = 16;
      const padding = 6;
      const bottomMargin = 48;
      
      // Draw semi-transparent background for better readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(
        (canvas.width - textMetrics.width) / 2 - padding,
        canvas.height - bottomMargin - textHeight - padding,
        textMetrics.width + padding * 2,
        textHeight + padding * 2
      );
      
      // Draw text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(
        mempoolText,
        canvas.width / 2,
        canvas.height - bottomMargin - padding
      );

      requestAnimationFrame(gameLoop);
    };

    const resetBall = () => {
      const { ball } = gameState.current;
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.speedX = -ball.speedX;
      ball.speedY = Math.random() * 6 - 3;
    };

    if (gameStarted) {
      gameLoop();
    }

    // Cleanup function
    return () => {
      // Clean up event listeners
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
      clearInterval(interval);

      // Only dispose audio if the game is actually stopping
      if (!gameStarted) {
        if (melodyRef.current) {
          melodyRef.current.stop();
          Tone.Transport.stop();
          melodyRef.current.dispose();
          melodyRef.current = null;
        }
        if (synthRef.current) {
          synthRef.current.dispose();
          synthRef.current = null;
        }
        Tone.Transport.stop();
      }
    };
  }, [gameStarted, isMuted, viewportHeight]);

  // Add a useEffect to reinitialize audio when game starts
  useEffect(() => {
    if (gameStarted) {
      console.log("Game started, initializing audio...");
      initAudio();
    }
    // No cleanup function needed as we want to keep the synth alive
  }, [gameStarted]);

  return (
    <>
      {isClient ? (
        <div
          className="relative w-full bg-[#222]"
          style={{ height: viewportHeight ? `${viewportHeight}px` : '100vh' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{
              height: viewportHeight ? `${viewportHeight}px` : '100vh',
              touchAction: 'none',
            }}
          />
          <div id="flash" className="fixed top-0 left-0 w-full h-full bg-[#F7931A] opacity-0 pointer-events-none transition-opacity duration-50" />
            
          {/* Audio prompt for mobile */}
          {showAudioPrompt && (
            <div 
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 border-2 border-[#F7931A] p-8 text-white text-center rounded-lg z-50"
            >
              <div className="text-[#F7931A] text-4xl mb-4">🔊</div>
              <p className="text-lg mb-2">Tap to Enable Sound</p>
              <p className="text-sm opacity-75">Your device requires a tap to enable audio</p>
              {audioError && <p className="text-red-400 mt-2">Audio failed. Try again or start without sound.</p>}
              <div className="flex flex-col gap-2 mt-4">
                <button
                  className="bg-[#F7931A] text-black px-4 py-2 rounded font-mono hover:bg-[#d17c15]"
                  onClick={() => {
                    const success = initializeAudio();
                    if (success) {
                      setShowModal(false);
                      setGameStarted(true);
                    }
                  }}
                >
                  Enable Sound
                </button>
                <button
                  className="bg-gray-700 text-white px-4 py-2 rounded font-mono hover:bg-gray-600"
                  onClick={startWithoutSound}
                >
                  Start Without Sound
                </button>
              </div>
            </div>
          )}
            
          {showModal && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 border-2 border-[#F7931A] p-8 text-white text-center min-w-[320px] max-w-[90%] z-50">
              <div className="text-[#F7931A] text-5xl mb-1">₿</div>
              <div className="text-[#F7931A] text-2xl mb-5">CRAZY PONG</div>
              <p className="my-5 leading-relaxed">
                This is the bitcoin crazy pong! The difficulty changes every 5 seconds based on the Bitcoin mempool size. When the mempool is full, Satoshi becomes more unpredictable! Use up/down arrows on desktop or slide on mobile to control your paddle.
              </p>
              <button
                onClick={startGame}
                className="bg-[#F7931A] text-black border-none px-5 py-2.5 mt-4 font-mono cursor-pointer hover:bg-[#d17c15]"
              >
                Got it!
              </button>
            </div>
          )}

          {/* Only show audio controls when game has started */}
          {gameStarted && (
            <>
              {/* Riff Switch Button - Bottom Left */}
              <div className="fixed bottom-8 left-8 opacity-0 animate-fade-in">
                <button
                  onClick={switchRiff}
                  className="bg-[#F7931A] text-black p-3 rounded-full w-14 h-14 flex items-center justify-center hover:bg-[#d17c15] transition-colors shadow-lg text-xl"
                  title={`Current: ${getRiffDisplay().title}`}
                >
                  {getRiffDisplay().icon}
                </button>
              </div>

              {/* Mute Button - Bottom Right */}
              <div className="fixed bottom-8 right-8 opacity-0 animate-fade-in">
                <button
                  onClick={toggleMute}
                  className="bg-[#F7931A] text-black p-3 rounded-full w-14 h-14 flex items-center justify-center hover:bg-[#d17c15] transition-colors shadow-lg"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Show enable sound button if game is running but audio is not enabled */}
          {gameStarted && !audioEnabled && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center">
              <button
                className="bg-[#F7931A] text-black px-4 py-2 rounded font-mono shadow-lg hover:bg-[#d17c15]"
                onClick={() => {
                  const success = initializeAudio();
                  if (success) setAudioEnabled(true);
                }}
              >
                Enable Sound
              </button>
              {audioError && <div className="text-red-400 text-xs mt-2">Audio failed. Try again.</div>}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

// Add animation keyframes to the global styles
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);

