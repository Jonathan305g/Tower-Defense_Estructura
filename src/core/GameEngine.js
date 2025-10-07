import AssetLoader from './AssetLoader.js';
import PathManager from './PathManager.js';
import Cozy from '../entities/Cozy.js';
import UndoRedoManager from '../managers/UndoRedoManager.js';
import CircularQueue from './structures/CircularQueue.js';

class GameEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = this.createCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.assetLoader = new AssetLoader();
        this.pathManager = new PathManager();
        this.undoRedoManager = new UndoRedoManager();
        
        this.cozys = [];
        this.cozyQueue = new CircularQueue(50); // Cola circular para actualización de estado
        this.waves = [];
        this.currentWaveIndex = 0;
        this.playerHealth = 100;
        this.score = 0;
        this.gold = 100;
        
        this.lastTime = 0;
        this.spawnTimer = 0;
        
        this.setupEventListeners();
        this.init();
    }

    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        this.container.appendChild(canvas);
        return canvas;
    }

    async init() {
        this.showLoadingMessage();
        
        try {
            await this.assetLoader.loadGameAssets();
            this.setupWaves();
            this.start();
        } catch (error) {
            console.error('Error cargando recursos:', error);
            this.showErrorMessage();
        }
    }

    showLoadingMessage() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Cargando Tower Defense...', this.canvas.width/2, this.canvas.height/2);
    }

    showErrorMessage() {
        this.ctx.fillStyle = 'red';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Error cargando recursos. Verifica la consola.', this.canvas.width/2, this.canvas.height/2);
    }

    setupWaves() {
        this.waves = [
            {
                name: "Oleada 1 - Básica",
                cozys: [
                    { type: 'monstruo', delay: 0 },
                    { type: 'monstruo', delay: 2 },
                    { type: 'monstruo', delay: 4 }
                ]
            },
            {
                name: "Oleada 2 - Velocidad", 
                cozys: [
                    { type: 'monstruo', delay: 0 },
                    { type: 'demonio', delay: 1 },
                    { type: 'monstruo', delay: 2 },
                    { type: 'demonio', delay: 3 },
                    { type: 'mini-dragon', delay: 4 }
                ]
            },
            {
                name: "Oleada 3 - Mixta",
                cozys: [
                    { type: 'monstruo', delay: 0 },
                    { type: 'demonio', delay: 0.5 },
                    { type: 'genio', delay: 1 },
                    { type: 'dragon', delay: 2 },
                    { type: 'mini-dragon', delay: 1.5 },
                    { type: 'monstruo', delay: 2.5 }
                ]
            }
        ];
    }

    setupEventListeners() {
        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undo();
        });

        document.getElementById('redo-btn').addEventListener('click', () => {
            this.redo();
        });
    }

    undo() {
        if (this.undoRedoManager.undo()) {
            console.log('Undo realizado');
            this.updateUI();
        }
    }

    redo() {
        if (this.undoRedoManager.redo()) {
            console.log('Redo realizado');
            this.updateUI();
        }
    }

    startWave() {
        if (this.currentWaveIndex >= this.waves.length) {
            console.log("🎉 ¡Has completado todas las oleadas!");
            return;
        }

        const wave = this.waves[this.currentWaveIndex];
        console.log(`🌊 Iniciando: ${wave.name}`);

        wave.cozys.forEach(cozyConfig => {
            setTimeout(() => {
                const cozy = new Cozy(
                    cozyConfig.type,
                    this.pathManager.getCurrentPath(),
                    this.assetLoader
                );
                this.cozys.push(cozy);
                this.cozyQueue.enqueue(cozy); // Agregar a la cola circular
            }, cozyConfig.delay * 1000);
        });

        this.currentWaveIndex++;
        this.updateUI();
    }

    start() {
        this.lastTime = performance.now();
        setTimeout(() => this.startWave(), 2000);
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Actualizar enemigos usando la cola circular
        this.cozyQueue.updateAll(cozy => {
            if (cozy.isActive) {
                cozy.update(deltaTime);
                
                if (!cozy.isActive && cozy.state !== 'death') {
                    this.playerTakeDamage(10);
                }
            }
        });

        // Filtrar enemigos inactivos y dar recompensas
        const initialCount = this.cozys.length;
        this.cozys = this.cozys.filter(cozy => cozy.isActive);
        
        if (this.cozys.length < initialCount) {
            this.cozys.forEach(cozy => {
                if (!cozy.isActive && cozy.state === 'death') {
                    this.gold += cozy.reward;
                    this.score += cozy.reward * 10;
                }
            });
        }

        // Iniciar siguiente oleada si es necesario
        if (this.cozys.length === 0 && this.currentWaveIndex < this.waves.length) {
            setTimeout(() => this.startWave(), 3000);
        }

        this.updateUI();
    }

    playerTakeDamage(damage) {
        this.playerHealth -= damage;
        if (this.playerHealth <= 0) {
            this.playerHealth = 0;
            console.log("💀 ¡Game Over!");
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const background = this.assetLoader.getImage('mapa');
        if (background) {
            this.ctx.drawImage(background, 0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.cozys.forEach(cozy => cozy.draw(this.ctx));
    }

    updateUI() {
        document.getElementById('health').textContent = this.playerHealth;
        document.getElementById('gold').textContent = this.gold;
        document.getElementById('wave').textContent = `${this.currentWaveIndex}/${this.waves.length}`;
        
        // Actualizar estados de botones undo/redo
        document.getElementById('undo-btn').disabled = !this.undoRedoManager.canUndo();
        document.getElementById('redo-btn').disabled = !this.undoRedoManager.canRedo();
    }
}

export default GameEngine;