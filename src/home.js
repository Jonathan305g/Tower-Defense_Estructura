// src/home.js - Lógica de la pantalla de inicio

class HomeManager {
    constructor() {
        this.modal = document.getElementById('instructions-modal');
        this.initEventListeners();
        console.log("🏠 Home Manager inicializado");
    }

    initEventListeners() {
        // Botón de iniciar juego
        const startButton = document.getElementById('start-game');
        startButton.addEventListener('click', () => {
            this.startGame();
        });

        // Botón de seleccionar nivel
        const levelButton = document.getElementById('select-level');
        levelButton.addEventListener('click', () => {
            this.selectLevel();
        });

        // Botón de instrucciones
        const instructionsButton = document.getElementById('show-instructions');
        instructionsButton.addEventListener('click', () => {
            this.showInstructions();
        });

        // Cerrar modal
        const closeModal = document.querySelector('.close-modal');
        closeModal.addEventListener('click', () => {
            this.closeModal();
        });

        // Cerrar modal al hacer clic fuera
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.closeModal();
            }
        });

        // Cerrar modal con ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.modal.style.display === 'block') {
                this.closeModal();
            }
        });
    }

    startGame() {
        console.log("🚀 Iniciando juego...");
        
        // Animación de transición
        this.playTransitionAnimation(() => {
            // Redirigir a la página del juego
            window.location.href = 'game.html';
            
            // O si prefieres cargar en la misma página:
            // this.hideHome();
            // this.showGame();
        });
    }

    selectLevel() {
        console.log("📊 Seleccionar nivel - Función en desarrollo");
        // Aquí puedes implementar la selección de niveles
        alert('🎮 Sistema de niveles en desarrollo. Por ahora inicia el juego básico.');
    }

    showInstructions() {
        console.log("❓ Mostrando instrucciones");
        this.modal.style.display = 'block';
        
        // Animación de entrada
        setTimeout(() => {
            this.modal.querySelector('.modal-content').style.transform = 'translateY(0)';
            this.modal.querySelector('.modal-content').style.opacity = '1';
        }, 10);
    }

    closeModal() {
        const modalContent = this.modal.querySelector('.modal-content');
        modalContent.style.transform = 'translateY(-20px)';
        modalContent.style.opacity = '0';
        
        setTimeout(() => {
            this.modal.style.display = 'none';
        }, 300);
    }

    playTransitionAnimation(callback) {
        const homeContainer = document.getElementById('home-container');
        
        // Efecto de desvanecimiento
        homeContainer.style.opacity = '0';
        homeContainer.style.transform = 'scale(0.9)';
        homeContainer.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            if (callback) callback();
        }, 500);
    }

    // Métodos para mostrar/ocultar home y juego en la misma página
    hideHome() {
        document.getElementById('home-container').style.display = 'none';
    }

    showGame() {
        // Esta función cargaría el juego en la misma página
        // Necesitarías tener un contenedor del juego en index.html
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.style.display = 'block';
            
            // Inicializar el juego
            import('./game.js').then(module => {
                const GameManager = module.default;
                new GameManager('game-container');
            });
        }
    }
}

// Inicializar el Home Manager cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    new HomeManager();
});

export default HomeManager;