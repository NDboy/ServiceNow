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

    // Generate coke bottle coins
    for (let i = 0; i < 15; i++) {
      newCoins.push({
        x: Math.random() * (GAME_CONFIG.width - 100) + 50,
        y: Math.random() * (GAME_CONFIG.height - 200) + 100,
        width: 20,
        height: 30,
        collected: false,
        animation: 0,
      });
    }

    // Generate Grinch enemies
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

      // Handle shooting (fire power-up) - Enhanced to destroy enemies and collect coins
      if (keys['x'] && newPlayer.powerUp === 'fire') {
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

      // Coke bottle coin collisions
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

      // Grinch enemy collisions
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
    // Update Grinch enemies
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

    // Update coke bottle coins animation
    setCoins(prevCoins =>
      prevCoins.map(coin => ({
        ...coin,
        animation: (coin.animation + 0.1) % (Math.PI * 2)
      }))
    );

    // Update fireballs and handle enhanced collisions
    setFireballs(prevFireballs => {
      const activeFireballs = prevFireballs
        .map(fireball => ({
          ...fireball,
          x: fireball.x + fireball.velocityX,
          life: fireball.life - 1
        }))
        .filter(fireball => fireball.life > 0 && fireball.x > 0 && fireball.x < GAME_CONFIG.width);

      // Enhanced fireball collisions - destroy enemies and collect coins
      activeFireballs.forEach(fireball => {
        // Fireball destroys enemies
        setEnemies(prevEnemies =>
          prevEnemies.map(enemy => {
            if (!enemy.defeated &&
                fireball.x < enemy.x + enemy.width &&
                fireball.x + fireball.width > enemy.x &&
                fireball.y < enemy.y + enemy.height &&
                fireball.y + fireball.height > enemy.y) {
              
              setScore(prev => prev + 300); // Bonus points for fireball kill
              playSound(150, 0.2, 'sawtooth');
              
              // Add defeat particle effect
              setParticles(prev => [...prev, {
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                velocityX: (Math.random() - 0.5) * 8,
                velocityY: -Math.random() * 8 - 4,
                life: 50,
                type: 'fireball-defeat'
              }]);
              
              return { ...enemy, defeated: true };
            }
            return enemy;
          })
        );

        // Fireball collects coins
        setCoins(prevCoins =>
          prevCoins.map(coin => {
            if (!coin.collected &&
                fireball.x < coin.x + coin.width &&
                fireball.x + fireball.width > coin.x &&
                fireball.y < coin.y + coin.height &&
                fireball.y + fireball.height > coin.y) {
              
              setScore(prev => prev + 150); // Bonus points for fireball collection
              playSound(523, 0.1, 'sine');
              
              // Add coin collection particle effect
              setParticles(prev => [...prev, {
                x: coin.x + coin.width / 2,
                y: coin.y + coin.height / 2,
                velocityX: (Math.random() - 0.5) * 6,
                velocityY: -Math.random() * 6 - 3,
                life: 40,
                type: 'fireball-coin'
              }]);
              
              return { ...coin, collected: true };
            }
            return coin;
          })
        );
      });

      return activeFireballs;
    });

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

  // Drawing helper functions
  const drawSantaMarko = (ctx, x, y, width, height, direction, powerUp, invincible) => {
    // Santa body color
    let bodyColor = '#DC143C'; // Christmas red
    if (powerUp === 'big') bodyColor = '#B22222'; // Darker red when big
    if (powerUp === 'fire') bodyColor = '#FF4500'; // Orange-red for fire power
    if (invincible) bodyColor = `hsl(${Date.now() % 360}, 100%, 50%)`; // Rainbow when invincible

    // Draw Santa's body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x, y, width, height);

    // Draw Santa's belt
    ctx.fillStyle = '#8B4513'; // Brown belt
    const beltY = y + height * 0.6;
    ctx.fillRect(x, beltY, width, height * 0.15);
    
    // Belt buckle
    ctx.fillStyle = '#FFD700'; // Gold buckle
    ctx.fillRect(x + width * 0.4, beltY, width * 0.2, height * 0.15);

    // Draw Santa's hat
    ctx.fillStyle = '#DC143C'; // Red hat
    ctx.fillRect(x, y - 8, width, 8);
    ctx.fillStyle = '#FFFFFF'; // White trim
    ctx.fillRect(x, y - 2, width, 2);
    
    // Hat pom-pom
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x + width - 4, y - 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw Santa's beard
    ctx.fillStyle = '#FFFFFF';
    const beardY = y + height * 0.4;
    ctx.fillRect(x + 2, beardY, width - 4, height * 0.3);

    // Draw eyes
    ctx.fillStyle = '#000000';
    const eyeSize = 3;
    const eyeY = y + height * 0.25;
    if (direction === 1) {
      ctx.fillRect(x + width * 0.6, eyeY, eyeSize, eyeSize);
      ctx.fillRect(x + width * 0.8, eyeY, eyeSize, eyeSize);
    } else {
      ctx.fillRect(x + width * 0.1, eyeY, eyeSize, eyeSize);
      ctx.fillRect(x + width * 0.3, eyeY, eyeSize, eyeSize);
    }
  };

  const drawGrinchEnemy = (ctx, x, y, width, height) => {
    // Grinch green body
    ctx.fillStyle = '#228B22';
    ctx.fillRect(x, y, width, height);

    // Grinch head (darker green)
    ctx.fillStyle = '#006400';
    ctx.fillRect(x + 5, y, width - 10, height * 0.7);

    // Evil grinning mouth
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 8, y + height * 0.4, width - 16, 3);

    // Angry eyes
    ctx.fillStyle = '#FF0000'; // Red angry eyes
    ctx.fillRect(x + 8, y + height * 0.2, 4, 4);
    ctx.fillRect(x + width - 12, y + height * 0.2, 4, 4);

    // Grinch hair tufts
    ctx.fillStyle = '#228B22';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 5 + i * 6, y - 3, 3, 5);
    }
  };

  const drawCokeBottle = (ctx, x, y, width, height, animation) => {
    // Bottle body (classic Coke red)
    ctx.fillStyle = '#DC143C';
    
    // Bottle shape - narrower at top and bottom
    const bottleWidth = width * 0.8;
    const bottleX = x + (width - bottleWidth) / 2;
    
    // Main bottle body
    ctx.fillRect(bottleX, y + 5, bottleWidth, height - 10);
    
    // Bottle neck (narrower)
    const neckWidth = bottleWidth * 0.6;
    const neckX = bottleX + (bottleWidth - neckWidth) / 2;
    ctx.fillRect(neckX, y, neckWidth, 8);
    
    // Bottle cap
    ctx.fillStyle = '#FFD700'; // Gold cap
    ctx.fillRect(neckX, y, neckWidth, 3);
    
    // Coke label
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bottleX + 2, y + height * 0.3, bottleWidth - 4, height * 0.3);
    
    // Sparkle effect
    const sparkleOffset = Math.sin(animation) * 2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bottleX + bottleWidth * 0.7 + sparkleOffset, y + height * 0.1, 2, 2);
  };

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    // Draw Christmas background
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height);
    gradient.addColorStop(0, '#87CEEB'); // Light blue sky
    gradient.addColorStop(0.7, '#FFFFFF'); // White snow
    gradient.addColorStop(1, '#F0F8FF'); // Alice blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    // Draw snowflakes
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.508 + Date.now() * 0.01) % GAME_CONFIG.width;
      const y = (i * 73.853 + Date.now() * 0.02) % GAME_CONFIG.height;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw platforms (icy/snowy)
    ctx.fillStyle = '#E6E6FA'; // Lavender ice
    ctx.strokeStyle = '#4169E1'; // Royal blue ice edge
    ctx.lineWidth = 2;
    platforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw moving platforms (Christmas colors)
    ctx.fillStyle = '#228B22'; // Christmas green
    ctx.strokeStyle = '#DC143C'; // Christmas red edge
    movingPlatforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw coke bottle coins
    coins.forEach(coin => {
      if (!coin.collected) {
        drawCokeBottle(ctx, coin.x, coin.y, coin.width, coin.height, coin.animation);
      }
    });

    // Draw Christmas power-ups
    powerUps.forEach(powerUp => {
      if (!powerUp.collected) {
        if (powerUp.type === 'mushroom') {
          // Christmas mushroom (red with white spots)
          ctx.fillStyle = '#DC143C';
          ctx.fillRect(powerUp.x, powerUp.y, 32, 32);
          ctx.fillStyle = '#FFFFFF';
          // White spots
          ctx.beginPath();
          ctx.arc(powerUp.x + 10, powerUp.y + 10, 3, 0, Math.PI * 2);
          ctx.arc(powerUp.x + 22, powerUp.y + 15, 4, 0, Math.PI * 2);
          ctx.arc(powerUp.x + 15, powerUp.y + 25, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (powerUp.type === 'fireFlower') {
          // Christmas fire flower (red and green)
          ctx.fillStyle = '#DC143C';
          ctx.fillRect(powerUp.x, powerUp.y, 32, 32);
          ctx.fillStyle = '#228B22';
          ctx.fillRect(powerUp.x + 8, powerUp.y + 8, 16, 16);
        } else if (powerUp.type === 'star') {
          // Christmas star (gold with sparkles)
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(powerUp.x + 16, powerUp.y + 16, 16, 0, Math.PI * 2);
          ctx.fill();
          // Sparkle points
          ctx.fillStyle = '#FFFFFF';
          const sparkleTime = Date.now() * 0.01;
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI / 3) + sparkleTime;
            const sparkleX = powerUp.x + 16 + Math.cos(angle) * 12;
            const sparkleY = powerUp.y + 16 + Math.sin(angle) * 12;
            ctx.fillRect(sparkleX - 1, sparkleY - 1, 2, 2);
          }
        }
      }
    });

    // Draw Grinch enemies
    enemies.forEach(enemy => {
      if (!enemy.defeated) {
        drawGrinchEnemy(ctx, enemy.x, enemy.y, enemy.width, enemy.height);
      }
    });

    // Draw Christmas fireballs (candy canes!)
    fireballs.forEach(fireball => {
      // Candy cane stripes
      ctx.fillStyle = '#DC143C'; // Red
      ctx.fillRect(fireball.x, fireball.y, fireball.width, fireball.height);
      ctx.fillStyle = '#FFFFFF'; // White
      for (let i = 0; i < fireball.width; i += 4) {
        ctx.fillRect(fireball.x + i, fireball.y, 2, fireball.height);
      }
    });

    // Draw particles with Christmas colors
    particles.forEach(particle => {
      const alpha = particle.life / 30;
      if (particle.type === 'coin' || particle.type === 'fireball-coin') {
        ctx.fillStyle = `rgba(220, 20, 60, ${alpha})`; // Christmas red
      } else if (particle.type === 'fireball-defeat') {
        ctx.fillStyle = `rgba(34, 139, 34, ${alpha})`; // Christmas green
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; // White snow
      }
      
      // Snowflake-like particles
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Santa Marko
    drawSantaMarko(
      ctx, 
      player.x, 
      player.y, 
      player.width, 
      player.height, 
      player.direction, 
      player.powerUp, 
      player.invincible
    );

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
    <div className="marko-adventure christmas-theme">
      <div className="game-hud">
        <div className="hud-item">SCORE: {score.toLocaleString()}</div>
        <div className="hud-item">LIVES: {lives}</div>
        <div className="hud-item">WORLD: {world}-{level}</div>
        <div className="hud-item">SANTA MARKO: {player.powerUp.toUpperCase()}</div>
      </div>

      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.width}
        height={GAME_CONFIG.height}
        className="game-canvas"
      />

      <div className="game-controls">
        <div>Arrow Keys/WASD: Move | Space/Up: Jump | Shift: Run | Down: Duck | X: Candy Cane Fire! | ESC: Pause</div>
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
            <p>Ho Ho Ho! Final Score: {score.toLocaleString()}</p>
            <button onClick={restartGame}>PLAY AGAIN</button>
            <button onClick={onExit}>EXIT TO PORTAL</button>
          </div>
        </div>
      )}

      {gameState === 'levelComplete' && (
        <div className="game-overlay">
          <div className="overlay-content">
            <h2>LEVEL COMPLETE!</h2>
            <p>Christmas Bonus: {lives * 1000} points</p>
            <p>Score: {score.toLocaleString()}</p>
            {world < WORLD_CONFIG.totalWorlds || level < WORLD_CONFIG.levelsPerWorld ? (
              <button onClick={nextLevel}>NEXT LEVEL</button>
            ) : (
              <div>
                <h3>MERRY CHRISTMAS!</h3>
                <p>Santa Marko saved Christmas!</p>
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