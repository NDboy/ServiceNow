import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MarkoAdventure.css';

const GAME_CONFIG = {
  width: 1000,
  height: 600,
  gravity: 0.8,
  jumpPower: 18,
  speed: 5,
  runMultiplier: 1.8,
  friction: 0.8,
};

const WORLD_CONFIG = {
  currentWorld: 1,
  currentLevel: 1,
  totalWorlds: 8,
  levelsPerWorld: 4
};

export default function MarkoAdventure({ onExit }) {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const keysRef = useRef({});
  const audioContextRef = useRef(null);
  
  // Game state
  const [gameState, setGameState] = useState('playing'); // 'playing', 'paused', 'gameOver', 'levelComplete'
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [world, setWorld] = useState(1);
  
  // Player state
  const [player, setPlayer] = useState({
    x: 100,
    y: 400,
    width: 32,
    height: 32,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    direction: 1, // 1 for right, -1 for left
    powerUp: 'small', // 'small', 'big', 'fire'
    invincible: false,
    invincibleTime: 0,
    animation: 'idle',
    animationFrame: 0,
    isRunning: false,
    isDucking: false,
  });

  // Game objects
  const [coins, setCoins] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [powerUps, setPowerUps] = useState([]);
  const [fireballs, setFireballs] = useState([]);
  const [particles, setParticles] = useState([]);
  const [movingPlatforms, setMovingPlatforms] = useState([]);

  // Initialize level
  const initLevel = useCallback(() => {
    const newCoins = [];
    const newEnemies = [];
    const newPlatforms = [];
    const newPowerUps = [];
    const newMovingPlatforms = [];

    // Create platforms for level
    const basePlatforms = [
      { x: 0, y: 550, width: GAME_CONFIG.width, height: 50 }, // Ground
      { x: 300, y: 450, width: 150, height: 20 },
      { x: 600, y: 350, width: 120, height: 20 },
      { x: 200, y: 250, width: 100, height: 20 },
      { x: 800, y: 200, width: 150, height: 20 },
    ];

    // Add moving platforms
    const movingPlatformData = [
      { x: 450, y: 400, width: 100, height: 20, velocityX: 2, minX: 400, maxX: 550 },
      { x: 700, y: 300, width: 80, height: 20, velocityX: -1.5, minX: 650, maxX: 750 },
    ];

    // Generate coins
    for (let i = 0; i < 15; i++) {
      newCoins.push({
        x: Math.random() * (GAME_CONFIG.width - 100) + 50,
        y: Math.random() * (GAME_CONFIG.height - 200) + 100,
        width: 20,
        height: 20,
        collected: false,
        animation: 0,
      });
    }

    // Generate enemies
    for (let i = 0; i < 5; i++) {
      newEnemies.push({
        x: Math.random() * (GAME_CONFIG.width - 200) + 100,
        y: 500,
        width: 30,
        height: 30,
        velocityX: (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 2),
        type: Math.random() > 0.7 ? 'flyer' : 'walker',
        defeated: false,
        animation: 0,
      });
    }

    // Add power-ups
    newPowerUps.push(
      { x: 350, y: 420, type: 'mushroom', collected: false },
      { x: 650, y: 320, type: 'fireFlower', collected: false },
      { x: 250, y: 220, type: 'star', collected: false }
    );

    setPlatforms(basePlatforms);
    setMovingPlatforms(movingPlatformData);
    setCoins(newCoins);
    setEnemies(newEnemies);
    setPowerUps(newPowerUps);
    setFireballs([]);
    setParticles([]);
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key.toLowerCase()] = true;
      
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
      }
      
      if (e.key === 'Escape') {
        setGameState(prev => prev === 'paused' ? 'playing' : 'paused');
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sound effects
  const playSound = useCallback((frequency, duration, type = 'square') => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return; // Audio not supported
      }
    }

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, []);

  // Update player physics and controls
  const updatePlayer = useCallback(() => {
    if (gameState !== 'playing') return;

    setPlayer(prev => {
      const keys = keysRef.current;
      let newPlayer = { ...prev };

      // Handle horizontal movement
      const isRunning = keys['shift'];
      const currentSpeed = GAME_CONFIG.speed * (isRunning ? GAME_CONFIG.runMultiplier : 1);
      
      if (keys['arrowleft'] || keys['a']) {
        newPlayer.velocityX = -currentSpeed;
        newPlayer.direction = -1;
        newPlayer.animation = 'walking';
        newPlayer.isRunning = isRunning;
      } else if (keys['arrowright'] || keys['d']) {
        newPlayer.velocityX = currentSpeed;
        newPlayer.direction = 1;
        newPlayer.animation = 'walking';
        newPlayer.isRunning = isRunning;
      } else {
        newPlayer.velocityX *= GAME_CONFIG.friction;
        newPlayer.animation = 'idle';
        newPlayer.isRunning = false;
      }

      // Handle ducking
      if (keys['arrowdown'] || keys['s']) {
        newPlayer.isDucking = true;
        newPlayer.height = 16;
      } else {
        newPlayer.isDucking = false;
        newPlayer.height = 32;
      }

      // Handle jumping
      if ((keys[' '] || keys['arrowup'] || keys['w']) && newPlayer.onGround) {
        newPlayer.velocityY = -GAME_CONFIG.jumpPower;
        newPlayer.onGround = false;
        newPlayer.animation = 'jumping';
        playSound(220, 0.1);
      }

      // Handle shooting (fire power-up)
      if (keys['x'] && newPlayer.powerUp === 'fire') {
        // Add fireball shooting logic here
        setFireballs(prev => [...prev, {
          x: newPlayer.x + (newPlayer.direction === 1 ? newPlayer.width : 0),
          y: newPlayer.y + 10,
          velocityX: newPlayer.direction * 8,
          width: 16,
          height: 16,
          life: 100
        }]);
        playSound(150, 0.1, 'sawtooth');
      }

      // Apply gravity
      if (!newPlayer.onGround) {
        newPlayer.velocityY += GAME_CONFIG.gravity;
      }

      // Update position
      newPlayer.x += newPlayer.velocityX;
      newPlayer.y += newPlayer.velocityY;

      // Handle invincibility timer
      if (newPlayer.invincible) {
        newPlayer.invincibleTime -= 1;
        if (newPlayer.invincibleTime <= 0) {
          newPlayer.invincible = false;
        }
      }

      // Update animation frame
      newPlayer.animationFrame = (newPlayer.animationFrame + 0.2) % 4;

      // Keep player in bounds
      if (newPlayer.x < 0) newPlayer.x = 0;
      if (newPlayer.x + newPlayer.width > GAME_CONFIG.width) {
        newPlayer.x = GAME_CONFIG.width - newPlayer.width;
      }

      return newPlayer;
    });
  }, [gameState, playSound]);

  // Collision detection
  const checkCollisions = useCallback(() => {
    setPlayer(prevPlayer => {
      let newPlayer = { ...prevPlayer };
      newPlayer.onGround = false;

      // Platform collisions
      const allPlatforms = [...platforms, ...movingPlatforms];
      for (const platform of allPlatforms) {
        if (newPlayer.x < platform.x + platform.width &&
            newPlayer.x + newPlayer.width > platform.x &&
            newPlayer.y < platform.y + platform.height &&
            newPlayer.y + newPlayer.height > platform.y) {
          
          // Landing on top of platform
          if (newPlayer.velocityY > 0 && newPlayer.y < platform.y) {
            newPlayer.y = platform.y - newPlayer.height;
            newPlayer.velocityY = 0;
            newPlayer.onGround = true;
            
            // Move with moving platform
            if (platform.velocityX) {
              newPlayer.x += platform.velocityX;
            }
          }
          // Hit from below
          else if (newPlayer.velocityY < 0 && newPlayer.y > platform.y) {
            newPlayer.y = platform.y + platform.height;
            newPlayer.velocityY = 0;
          }
        }
      }

      // Coin collisions
      setCoins(prevCoins => 
        prevCoins.map(coin => {
          if (!coin.collected &&
              newPlayer.x < coin.x + coin.width &&
              newPlayer.x + newPlayer.width > coin.x &&
              newPlayer.y < coin.y + coin.height &&
              newPlayer.y + newPlayer.height > coin.y) {
            
            setScore(prev => prev + 100);
            playSound(523, 0.1);
            
            // Add coin particle effect
            setParticles(prev => [...prev, {
              x: coin.x + coin.width / 2,
              y: coin.y + coin.height / 2,
              velocityX: (Math.random() - 0.5) * 4,
              velocityY: -Math.random() * 4 - 2,
              life: 30,
              type: 'coin'
            }]);
            
            return { ...coin, collected: true };
          }
          return coin;
        })
      );

      // Power-up collisions
      setPowerUps(prevPowerUps =>
        prevPowerUps.map(powerUp => {
          if (!powerUp.collected &&
              newPlayer.x < powerUp.x + 32 &&
              newPlayer.x + newPlayer.width > powerUp.x &&
              newPlayer.y < powerUp.y + 32 &&
              newPlayer.y + newPlayer.height > powerUp.y) {
            
            if (powerUp.type === 'mushroom') {
              newPlayer.powerUp = 'big';
              newPlayer.height = 48;
              setScore(prev => prev + 500);
            } else if (powerUp.type === 'fireFlower') {
              newPlayer.powerUp = 'fire';
              setScore(prev => prev + 1000);
            } else if (powerUp.type === 'star') {
              newPlayer.invincible = true;
              newPlayer.invincibleTime = 300;
              setScore(prev => prev + 1000);
            }
            
            playSound(330, 0.2);
            return { ...powerUp, collected: true };
          }
          return powerUp;
        })
      );

      // Enemy collisions
      if (!newPlayer.invincible) {
        setEnemies(prevEnemies =>
          prevEnemies.map(enemy => {
            if (!enemy.defeated &&
                newPlayer.x < enemy.x + enemy.width &&
                newPlayer.x + newPlayer.width > enemy.x &&
                newPlayer.y < enemy.y + enemy.height &&
                newPlayer.y + newPlayer.height > enemy.y) {
              
              // Player jumping on enemy
              if (newPlayer.velocityY > 0 && newPlayer.y < enemy.y - 10) {
                newPlayer.velocityY = -10;
                setScore(prev => prev + 200);
                playSound(100, 0.2);
                
                // Add defeat particle effect
                setParticles(prev => [...prev, {
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height / 2,
                  velocityX: (Math.random() - 0.5) * 6,
                  velocityY: -Math.random() * 6 - 3,
                  life: 40,
                  type: 'defeat'
                }]);
                
                return { ...enemy, defeated: true };
              } else {
                // Player hit by enemy
                if (newPlayer.powerUp === 'big' || newPlayer.powerUp === 'fire') {
                  newPlayer.powerUp = 'small';
                  newPlayer.height = 32;
                  newPlayer.invincible = true;
                  newPlayer.invincibleTime = 120;
                } else {
                  setLives(prev => prev - 1);
                  newPlayer.invincible = true;
                  newPlayer.invincibleTime = 120;
                  
                  if (lives <= 1) {
                    setGameState('gameOver');
                  }
                }
                playSound(80, 0.3);
              }
            }
            return enemy;
          })
        );
      }

      // Check if player falls off screen
      if (newPlayer.y > GAME_CONFIG.height) {
        setLives(prev => prev - 1);
        newPlayer.x = 100;
        newPlayer.y = 400;
        newPlayer.velocityX = 0;
        newPlayer.velocityY = 0;
        
        if (lives <= 1) {
          setGameState('gameOver');
        }
      }

      return newPlayer;
    });
  }, [platforms, movingPlatforms, lives, playSound]);

  // Update game objects
  const updateGameObjects = useCallback(() => {
    // Update enemies
    setEnemies(prevEnemies =>
      prevEnemies.map(enemy => {
        if (enemy.defeated) return enemy;
        
        const newEnemy = { ...enemy };
        
        if (newEnemy.type === 'walker') {
          newEnemy.x += newEnemy.velocityX;
          
          // Bounce off edges
          if (newEnemy.x <= 0 || newEnemy.x >= GAME_CONFIG.width - newEnemy.width) {
            newEnemy.velocityX *= -1;
          }
        } else if (newEnemy.type === 'flyer') {
          newEnemy.x += newEnemy.velocityX;
          newEnemy.y += Math.sin(newEnemy.animation * 0.1) * 2;
        }
        
        newEnemy.animation += 1;
        return newEnemy;
      })
    );

    // Update moving platforms
    setMovingPlatforms(prevPlatforms =>
      prevPlatforms.map(platform => {
        const newPlatform = { ...platform };
        newPlatform.x += newPlatform.velocityX;
        
        if (newPlatform.x <= newPlatform.minX || newPlatform.x >= newPlatform.maxX) {
          newPlatform.velocityX *= -1;
        }
        
        return newPlatform;
      })
    );

    // Update coins animation
    setCoins(prevCoins =>
      prevCoins.map(coin => ({
        ...coin,
        animation: (coin.animation + 0.1) % (Math.PI * 2)
      }))
    );

    // Update fireballs
    setFireballs(prevFireballs =>
      prevFireballs
        .map(fireball => ({
          ...fireball,
          x: fireball.x + fireball.velocityX,
          life: fireball.life - 1
        }))
        .filter(fireball => fireball.life > 0 && fireball.x > 0 && fireball.x < GAME_CONFIG.width)
    );

    // Update particles
    setParticles(prevParticles =>
      prevParticles
        .map(particle => ({
          ...particle,
          x: particle.x + particle.velocityX,
          y: particle.y + particle.velocityY,
          velocityY: particle.velocityY + 0.2,
          life: particle.life - 1
        }))
        .filter(particle => particle.life > 0)
    );
  }, []);

  // Check level completion
  useEffect(() => {
    const remainingCoins = coins.filter(coin => !coin.collected).length;
    if (remainingCoins === 0 && gameState === 'playing') {
      setGameState('levelComplete');
      playSound(523, 0.5);
      
      // Award bonus points
      setScore(prev => prev + lives * 1000);
    }
  }, [coins, gameState, lives, playSound]);

  // Game loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        updatePlayer();
        updateGameObjects();
        checkCollisions();
      }, 16); // ~60 FPS

      return () => {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
      };
    }
  }, [gameState, updatePlayer, updateGameObjects, checkCollisions]);

  // Initialize level on mount
  useEffect(() => {
    initLevel();
  }, [initLevel]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    // Draw platforms
    ctx.fillStyle = '#8B4513';
    platforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw moving platforms
    ctx.fillStyle = '#DAA520';
    movingPlatforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw coins
    ctx.fillStyle = '#FFD700';
    coins.forEach(coin => {
      if (!coin.collected) {
        const scale = 0.8 + Math.sin(coin.animation) * 0.2;
        const size = coin.width * scale;
        ctx.fillRect(
          coin.x + (coin.width - size) / 2, 
          coin.y + (coin.height - size) / 2, 
          size, 
          size
        );
      }
    });

    // Draw power-ups
    powerUps.forEach(powerUp => {
      if (!powerUp.collected) {
        if (powerUp.type === 'mushroom') {
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(powerUp.x, powerUp.y, 32, 32);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(powerUp.x + 8, powerUp.y + 8, 16, 16);
        } else if (powerUp.type === 'fireFlower') {
          ctx.fillStyle = '#FF4500';
          ctx.fillRect(powerUp.x, powerUp.y, 32, 32);
        } else if (powerUp.type === 'star') {
          ctx.fillStyle = '#FFFF00';
          ctx.beginPath();
          ctx.arc(powerUp.x + 16, powerUp.y + 16, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // Draw enemies
    enemies.forEach(enemy => {
      if (!enemy.defeated) {
        ctx.fillStyle = enemy.type === 'flyer' ? '#800080' : '#FF0000';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    });

    // Draw fireballs
    ctx.fillStyle = '#FF4500';
    fireballs.forEach(fireball => {
      ctx.fillRect(fireball.x, fireball.y, fireball.width, fireball.height);
    });

    // Draw particles
    particles.forEach(particle => {
      const alpha = particle.life / 30;
      if (particle.type === 'coin') {
        ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      }
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });

    // Draw player
    let playerColor = '#0000FF'; // Default blue
    if (player.powerUp === 'big') playerColor = '#0000AA';
    if (player.powerUp === 'fire') playerColor = '#FF6600';
    if (player.invincible) playerColor = `hsl(${Date.now() % 360}, 100%, 50%)`;
    
    ctx.fillStyle = playerColor;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw player eyes
    ctx.fillStyle = '#FFFFFF';
    const eyeSize = 4;
    const eyeY = player.y + 8;
    if (player.direction === 1) {
      ctx.fillRect(player.x + 20, eyeY, eyeSize, eyeSize);
      ctx.fillRect(player.x + 26, eyeY, eyeSize, eyeSize);
    } else {
      ctx.fillRect(player.x + 2, eyeY, eyeSize, eyeSize);
      ctx.fillRect(player.x + 8, eyeY, eyeSize, eyeSize);
    }

  }, [player, platforms, movingPlatforms, coins, enemies, powerUps, fireballs, particles]);

  // Handle level progression
  const nextLevel = () => {
    if (level < WORLD_CONFIG.levelsPerWorld) {
      setLevel(prev => prev + 1);
    } else {
      setLevel(1);
      setWorld(prev => prev + 1);
    }
    
    setPlayer(prev => ({ 
      ...prev, 
      x: 100, 
      y: 400, 
      velocityX: 0, 
      velocityY: 0 
    }));
    
    setGameState('playing');
    initLevel();
  };

  const restartGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setWorld(1);
    setPlayer(prev => ({ 
      ...prev, 
      x: 100, 
      y: 400, 
      velocityX: 0, 
      velocityY: 0, 
      powerUp: 'small',
      invincible: false 
    }));
    setGameState('playing');
    initLevel();
  };

  return (
    <div className="marko-adventure">
      <div className="game-hud">
        <div className="hud-item">SCORE: {score.toLocaleString()}</div>
        <div className="hud-item">LIVES: {lives}</div>
        <div className="hud-item">WORLD: {world}-{level}</div>
        <div className="hud-item">MARKO: {player.powerUp.toUpperCase()}</div>
      </div>

      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.width}
        height={GAME_CONFIG.height}
        className="game-canvas"
      />

      <div className="game-controls">
        <div>Arrow Keys/WASD: Move | Space/Up: Jump | Shift: Run | Down: Duck | X: Fire | ESC: Pause</div>
      </div>

      {gameState === 'paused' && (
        <div className="game-overlay">
          <div className="overlay-content">
            <h2>GAME PAUSED</h2>
            <button onClick={() => setGameState('playing')}>RESUME</button>
            <button onClick={onExit}>EXIT TO PORTAL</button>
          </div>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="game-overlay">
          <div className="overlay-content">
            <h2>GAME OVER</h2>
            <p>Final Score: {score.toLocaleString()}</p>
            <button onClick={restartGame}>PLAY AGAIN</button>
            <button onClick={onExit}>EXIT TO PORTAL</button>
          </div>
        </div>
      )}

      {gameState === 'levelComplete' && (
        <div className="game-overlay">
          <div className="overlay-content">
            <h2>LEVEL COMPLETE!</h2>
            <p>Bonus: {lives * 1000} points</p>
            <p>Score: {score.toLocaleString()}</p>
            {world < WORLD_CONFIG.totalWorlds || level < WORLD_CONFIG.levelsPerWorld ? (
              <button onClick={nextLevel}>NEXT LEVEL</button>
            ) : (
              <div>
                <h3>CONGRATULATIONS!</h3>
                <p>You've completed all levels!</p>
                <button onClick={restartGame}>PLAY AGAIN</button>
              </div>
            )}
            <button onClick={onExit}>EXIT TO PORTAL</button>
          </div>
        </div>
      )}
    </div>
  );
}