"use client";

import { useEffect, useRef, useState } from "react";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showModal, setShowModal] = useState(true);

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

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
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
      let errorRange = 80 - (normalizedDifficulty * 0.6);
      let error = Math.random() * errorRange - (errorRange / 2);
      if (Math.random() < (0.3 - (normalizedDifficulty * 0.002))) {
        targetY = rightPaddle.y;
      }
      targetY += error;
      let moveSpeed = (targetY - rightPaddle.y) * (0.05 + (normalizedDifficulty * 0.0005));
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
      } else if (ball.x + ball.radius > rightPaddle.x &&
                 ball.x - ball.radius < rightPaddle.x + rightPaddle.width &&
                 ball.y > rightPaddle.y &&
                 ball.y < rightPaddle.y + rightPaddle.height) {
        const hitPosition = (ball.y - rightPaddle.y - rightPaddle.height / 2) / (rightPaddle.height / 2);
        ball.x = rightPaddle.x - ball.radius;
        ball.speedX = -Math.abs(ball.speedX) * 1.05;
        ball.speedY = hitPosition * ball.maxSpeed + moveSpeed * 0.8;
      }

      // Score points
      if (ball.x < 0) {
        gameState.current.rightScore++;
        resetBall();
      } else if (ball.x > canvas.width) {
        gameState.current.leftScore++;
        resetBall();
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
      
      ctx.textAlign = 'left';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`₿ mempool: ${gameState.current.bitcoinDifficulty} tx`, canvas.width / 2, canvas.height - 10);
      ctx.textAlign = 'left';

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

    return () => {
      clearInterval(interval);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [gameStarted]);

  const startGame = () => {
    setShowModal(false);
    setGameStarted(true);
  };

  return (
    <div className="relative w-full h-screen bg-[#222]">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />
      
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
    </div>
  );
}

