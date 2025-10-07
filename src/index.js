import GameEngine from './core/GameEngine.js';

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const game = new GameEngine('game-container');
});