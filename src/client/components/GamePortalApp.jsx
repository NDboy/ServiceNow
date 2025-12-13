import React, { useState } from 'react';
import GameGrid from './GameGrid.jsx';
import MarkoAdventure from '../game/MarkoAdventure.jsx';
import './GamePortalApp.css';

export default function GamePortalApp() {
  const [currentView, setCurrentView] = useState('portal');
  const [selectedGame, setSelectedGame] = useState(null);

  const games = [
    { id: 1, name: 'Marko Adventure', status: 'available', component: MarkoAdventure },
    { id: 2, name: 'Second Game', status: 'coming-soon' },
    { id: 3, name: 'Third Game', status: 'coming-soon' },
    { id: 4, name: 'Fourth Game', status: 'coming-soon' },
    { id: 5, name: 'Fifth Game', status: 'coming-soon' },
    { id: 6, name: 'Sixth Game', status: 'coming-soon' },
    { id: 7, name: 'Seventh Game', status: 'coming-soon' },
    { id: 8, name: 'Eighth Game', status: 'coming-soon' },
    { id: 9, name: 'Ninth Game', status: 'coming-soon' },
    { id: 10, name: 'Tenth Game', status: 'coming-soon' },
    { id: 11, name: 'Eleventh Game', status: 'coming-soon' },
    { id: 12, name: 'Twelfth Game', status: 'coming-soon' },
    { id: 13, name: 'Thirteenth Game', status: 'coming-soon' },
    { id: 14, name: 'Fourteenth Game', status: 'coming-soon' },
    { id: 15, name: 'Fifteenth Game', status: 'coming-soon' },
    { id: 16, name: 'Sixteenth Game', status: 'coming-soon' }
  ];

  const handleGameSelect = (game) => {
    if (game.status === 'available' && game.component) {
      setSelectedGame(game);
      setCurrentView('game');
    }
  };

  const handleBackToPortal = () => {
    setCurrentView('portal');
    setSelectedGame(null);
  };

  if (currentView === 'game' && selectedGame) {
    const GameComponent = selectedGame.component;
    return (
      <div className="game-container">
        <button className="back-button" onClick={handleBackToPortal}>
          ← Back to Portal
        </button>
        <GameComponent onExit={handleBackToPortal} />
      </div>
    );
  }

  return (
    <div className="game-portal">
      <div className="stars"></div>
      <div className="background-mario"></div>
      
      <header className="portal-header">
        <h1 className="neon-text">GAME PORTAL</h1>
        <div className="subtitle">Experience the 80's Gaming Revolution</div>
      </header>

      <GameGrid games={games} onGameSelect={handleGameSelect} />
      
      <footer className="portal-footer">
        <div className="footer-text">Press START to begin your adventure!</div>
      </footer>
    </div>
  );
}