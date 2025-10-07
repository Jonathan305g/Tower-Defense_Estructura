// src/game.js - Lógica principal del juego
import GameEngine from './core/GameEngine.js';

class GameManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.gameEngine = null;
        this.isPaused = false;
        
        this.initGame();
        this.initEventListeners();
        console.log("🎮 Game Manager inicializado");
    }

    async initGame() {
        try {
            // Mostrar mensaje de carga
            this.showLoadingMessage();
            
            // Inicializar el motor del juego
            this.gameEngine = new GameEngine('game-canvas');
            await this.gameEngine.init();
            
            // Ocultar mensaje de carga
            this.hideLoadingMessage();
            
            // Iniciar actualización de la UI
            this.startUIUpdate();
            
        } catch (error) {
            console.error('Error al inicializar el juego:', error);
            this.showErrorMessage('Error al cargar el juego: ' + error.message);
        }
    }

    initEventListeners() {
        // Botón de pausa
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.togglePause();
        });

        // Botón de menú
        document.getElementById('menu-btn').addEventListener('click', () => {
            this.returnToMenu();
        });

        // Botón de sonido
        document.getElementById('sound-btn').addEventListener('click', () => {
            this.toggleSound();
        });

        // Botones de pausa
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('quit-btn').addEventListener('click', () => {
            this.returnToMenu();
        });

        // Botones de game over
        document.getElementById('restart-game-btn').addEventListener('click', () => {
            this.restartGame();
        });

        document.getElementById('menu-game-btn').addEventListener('click', () => {
            this.returnToMenu();
        });

        // Botones de deshacer/rehacer
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.gameEngine.undo();
        });

        document.getElementById('redo-btn').addEventListener('click', () => {
            this.gameEngine.redo();
        });

        // Selección de torres
        document.querySelectorAll('.tower-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const towerType = e.currentTarget.dataset.tower;
                this.selectTower(towerType);
            });
        });

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.togglePause();
            }
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.gameEngine.undo();
            }
            if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.gameEngine.redo();
            }
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.gameEngine.pause();
            this.showPauseOverlay();
        } else {
            this.gameEngine.resume();
            this.hidePauseOverlay();
        }
        
        // Actualizar texto del botón
        document.getElementById('pause-btn').textContent = 
            this.isPaused ? '▶️ Reanudar' : '⏸️ Pausa';
    }

    toggleSound() {
        // Implementar toggle de sonido
        const soundBtn = document.getElementById('sound-btn');
        const isMuted = soundBtn.textContent.includes('🔇');
        
        soundBtn.textContent = isMuted ? '🔊 Sonido' : '🔇 Mute';
        this.gameEngine.toggleSound(!isMuted);
    }

    returnToMenu() {
        if (confirm('¿Estás seguro de que quieres salir al menú? Se perderá el progreso actual.')) {
            window.location.href = 'index.html';
        }
    }

    restartGame() {
        if (confirm('¿Estás seguro de que quieres reiniciar el juego?')) {
            location.reload();
        }
    }

    selectTower(towerType) {
        if (this.gameEngine) {
            this.gameEngine.selectTower(towerType);
            
            // Resaltar torre seleccionada
            document.querySelectorAll('.tower-item').forEach(item => {
                item.classList.remove('selected');
            });
            document.querySelector(`[data-tower="${towerType}"]`).classList.add('selected');
        }
    }

    startUIUpdate() {
        // Actualizar UI periódicamente
        setInterval(() => {
            if (this.gameEngine && !this.isPaused) {
                this.updateUI();
            }
        }, 100);
    }

    updateUI() {
        // Actualizar estadísticas
        document.getElementById('health-value').textContent = this.gameEngine.playerHealth;
        document.getElementById('gold-value').textContent = this.gameEngine.gold;
        document.getElementById('wave-value').textContent = `${this.gameEngine.currentWaveIndex}/${this.gameEngine.waves.length}`;
        document.getElementById('score-value').textContent = this.gameEngine.score;

        // Actualizar botones de deshacer/rehacer
        document.getElementById('undo-btn').disabled = !this.gameEngine.canUndo();
        document.getElementById('redo-btn').disabled = !this.gameEngine.canRedo();

        // Actualizar estado de las torres (coste, disponibilidad)
        document.querySelectorAll('.tower-item').forEach(item => {
            const towerType = item.dataset.tower;
            const cost = this.getTowerCost(towerType);
            const canAfford = this.gameEngine.gold >= cost;
            
            item.querySelector('.tower-cost').textContent = cost;
            item.style.opacity = canAfford ? '1' : '0.5';
        });

        // Verificar game over
        if (this.gameEngine.playerHealth <= 0) {
            this.showGameOver();
        }
    }

    getTowerCost(towerType) {
        const costs = {
            'basic': 50,
            'rapid': 75,
            'powerful': 100
        };
        return costs[towerType] || 50;
    }

    showPauseOverlay() {
        document.getElementById('pause-overlay').classList.remove('hidden');
    }

    hidePauseOverlay() {
        document.getElementById('pause-overlay').classList.add('hidden');
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.gameEngine.score;
        document.getElementById('gameover-overlay').classList.remove('hidden');
    }

    showLoadingMessage() {
        // Podrías implementar un overlay de carga
        console.log("🔄 Cargando juego...");
    }

    hideLoadingMessage() {
        console.log("✅ Juego cargado");
    }

    showErrorMessage(message) {
        alert(message);
    }
}

// Inicializar el juego cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    new GameManager('game-container');
});

export default GameManager;