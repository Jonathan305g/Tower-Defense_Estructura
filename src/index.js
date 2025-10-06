import GameEngine from './core/GameEngine.js';

// Inicializar el juego cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const gameEngine = new GameEngine('game-container');
    gameEngine.start();
});
// En tu archivo principal
const gameEngine = new GameEngine('game-container');
gameEngine.start();