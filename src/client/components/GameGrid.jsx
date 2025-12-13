import React from 'react';
import './GameGrid.css';

export default function GameGrid({ games, onGameSelect }) {
  return (
    <div className="game-grid">
      {games.map((game) => (
        <button
          key={game.id}
          className={`game-button ${game.status}`}
          onClick={() => onGameSelect(game)}
          disabled={game.status === 'coming-soon'}
        >
          <div className="game-button-inner">
            <div className="game-number">{game.id.toString().padStart(2, '0')}</div>
            <div className="game-name">{game.name}</div>
            <div className="game-status">
              {game.status === 'available' ? 'READY' : 'COMING SOON'}
            </div>
          </div>
          <div className="game-button-glow"></div>
        </button>
      ))}
    </div>
  );
}