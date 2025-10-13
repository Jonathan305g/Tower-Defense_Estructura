// src/home.js - Lógica de la pantalla de inicio

class HomeManager {
    constructor() {
        this.instructionsModal = document.getElementById('instructions-modal'); // (Antiguo this.modal)
        this.levelModal = document.getElementById('level-modal'); // NUEVO

        this.levelOptions = document.querySelectorAll('.level-option'); // NUEVO
        this.levelDisplay = document.getElementById('current-selected-level');

        this.loadSelectedLevel();
        this.initEventListeners();
        console.log("🏠 Home Manager inicializado");
    }

    loadSelectedLevel() {
        const level = localStorage.getItem('selectedLevel') || '1';
        if (this.levelDisplay) {
            this.levelDisplay.textContent = level;
        }
        return level;
    }

    //Guarda el nivel seleccionado
    saveLevel(level) {
        localStorage.setItem('selectedLevel', level);
        if (this.levelDisplay) {
            this.levelDisplay.textContent = level;
        }
        console.log(`✅ Nivel guardado: ${level}`);

        this.updateButtonStyles(level);
        this.closeLevelModal(); // Cierra automáticamente
    }

    updateButtonStyles(currentLevel) {
        this.levelOptions.forEach(button => {
            if (button.dataset.level === currentLevel) {
                // Si es el nivel actual, lo hacemos primario (pintado)
                button.classList.remove('btn-secondary');
                button.classList.add('btn-primary');
            } else {
                // Si no es el nivel actual, lo hacemos secundario (no pintado)
                button.classList.remove('btn-primary');
                button.classList.add('btn-secondary');
            }
        });
    }


    initEventListeners() {
        // --- Botones Principales ---

        // Cargar los estilos correctos al INICIO (Esta línea es crucial)
        this.updateButtonStyles(this.loadSelectedLevel());

        const startButton = document.getElementById('start-game');
        if (startButton) {
            startButton.addEventListener('click', () => {
                this.startGame();
            });
        }

        const levelButton = document.getElementById('select-level');
        if (levelButton) {
            levelButton.addEventListener('click', () => {
                this.selectLevel();
            });
        }

        const instructionsButton = document.getElementById('show-instructions');
        if (instructionsButton) {
            instructionsButton.addEventListener('click', () => {
                this.showInstructions();
            });
        }

        // --- Cerrar Modales ---

        // Cierre de modal de instrucciones
        if (this.instructionsModal) {
            const closeModalInstruction = this.instructionsModal.querySelector('.close-modal');
            if (closeModalInstruction) {
                closeModalInstruction.addEventListener('click', () => {
                    this.closeInstructionsModal();
                });
            }
        }

        // Cierre de modal de nivel
        if (this.levelModal) {
            const closeLevelModalBtn = this.levelModal.querySelector('.close-modal-level');
            if (closeLevelModalBtn) {
                closeLevelModalBtn.addEventListener('click', () => {
                    this.closeLevelModal();
                });
            }
        }


        // --- Selección de Nivel ---

        // Manejar la selección de botones de nivel
        if (this.levelOptions.length > 0) { // Comprueba que haya botones de nivel
            this.levelOptions.forEach(button => {
                button.addEventListener('click', (event) => {
                    const level = event.target.dataset.level;
                    this.saveLevel(level);
                });
            });
        }


        // --- Cierre Global de Modales ---

        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', (event) => {
            if (this.instructionsModal && event.target === this.instructionsModal) {
                this.closeInstructionsModal();
            }
            if (this.levelModal && event.target === this.levelModal) {
                this.closeLevelModal();
            }
        });

        // Cerrar modales con ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                if (this.instructionsModal && this.instructionsModal.style.display === 'block') {
                    this.closeInstructionsModal();
                }
                if (this.levelModal && this.levelModal.style.display === 'block') {
                    this.closeLevelModal();
                }
            }
        });
    }

    startGame() {
        console.log("🚀 Iniciando juego...");

        this.loadSelectedLevel();

        // Animación de transición (SIN CAMBIOS)
        this.playTransitionAnimation(() => {
            // Redirigir a la página del juego
            window.location.href = 'game.html';
        });
    }

    selectLevel() {
        console.log("📊 Mostrando selector de nivel");

        if (!this.levelModal) return;
        // Asegura que se muestre el nivel actualmente seleccionado antes de abrir
        this.loadSelectedLevel();

        this.levelModal.style.display = 'block';

        // Animación de entrada
        setTimeout(() => {
            const modalContent = this.levelModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transform = 'translateY(0)';
                modalContent.style.opacity = '1';
            }
        }, 10);
    }

    showInstructions() {
        console.log("❓ Mostrando instrucciones");
        if (!this.instructionsModal) return; // Salir si el modal no existe

        this.instructionsModal.style.display = 'block';

        // Animación de entrada
        setTimeout(() => {
            const modalContent = this.instructionsModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transform = 'translateY(0)';
                modalContent.style.opacity = '1';
            }
        }, 10);

    }

    closeInstructionsModal() {
        if (!this.instructionsModal) return;

        const modalContent = this.instructionsModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(-20px)';
            modalContent.style.opacity = '0';

            setTimeout(() => {
                this.instructionsModal.style.display = 'none';
            }, 300);
        }
    }

    closeLevelModal() {
        if (!this.levelModal) return;

        const modalContent = this.levelModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.transform = 'translateY(-20px)';
            modalContent.style.opacity = '0';

            setTimeout(() => {
                this.levelModal.style.display = 'none';

                modalContent.style.transform = 'translateY(0)';
                modalContent.style.opacity = '1';
            }, 300);
        } else {
            this.levelModal.style.display = 'none';
        }
    }

    playTransitionAnimation(callback) {
        const homeContainer = document.getElementById('home-container');
        if (!homeContainer) {
            if (callback) callback();
            return; // Salir si el contenedor no existe
        }

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
        const homeContainer = document.getElementById('home-container');
        if (homeContainer) {
            homeContainer.style.display = 'none';
        }
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