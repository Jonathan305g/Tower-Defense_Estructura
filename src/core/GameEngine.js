import AssetLoader from "./AssetLoader.js";
import PathManager from "./PathManager.js";
import Cozy from "../entities/Cozy.js";
import UndoRedoManager from "../managers/UndoRedoManager.js";
import CircularQueue from "./structures/CircularQueue.js";

class GameEngine {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext("2d");
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
    const canvas = document.createElement("canvas");
    canvas.id = "game-canvas";
    canvas.width = 800;
    canvas.height = 600;
    // Limpia el contenedor y agrega el canvas
    const container = document.getElementById(this.containerId);
    container.innerHTML = "";
    container.appendChild(canvas);
    return canvas; // <-- RETORNAR EL CANVAS
  }

  async init() {
    this.showLoadingMessage();

    try {
      await this.assetLoader.loadGameAssets();
      this.setupWaves();
      this.start();
    } catch (error) {
      console.error("Error cargando recursos:", error);
      this.showErrorMessage();
    }
  }

  draw(ctx) {
    const sprite = this.assetLoader.getEnemySprite(this.type, this.state);
    if (sprite) {
      ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
    } else {
      this.drawFallback(ctx);
    }
  }

  showLoadingMessage() {
    this.ctx.fillStyle = "white";
    this.ctx.font = "20px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "Cargando Tower Defense...",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  showErrorMessage() {
    this.ctx.fillStyle = "red";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "Error cargando recursos. Verifica la consola.",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  setupWaves() {
    this.waves = [
      {
        name: "Oleada 1 - Básica",
        cozys: [
          { type: "monstruo", delay: 0 },
          { type: "monstruo", delay: 2 },
          { type: "monstruo", delay: 4 },
        ],
      },
      {
        name: "Oleada 2 - Velocidad",
        cozys: [
          { type: "monstruo", delay: 0 },
          { type: "demonio", delay: 1 },
          { type: "monstruo", delay: 2 },
          { type: "demonio", delay: 3 },
          { type: "mini-dragon", delay: 4 },
        ],
      },
      {
        name: "Oleada 3 - Mixta",
        cozys: [
          { type: "monstruo", delay: 0 },
          { type: "demonio", delay: 0.5 },
          { type: "genio", delay: 1 },
          { type: "dragon", delay: 2 },
          { type: "mini-dragon", delay: 1.5 },
          { type: "monstruo", delay: 2.5 },
        ],
      },
    ];
  }

  setupEventListeners() {
    document.getElementById("undo-btn").addEventListener("click", () => {
      this.undo();
    });

    document.getElementById("redo-btn").addEventListener("click", () => {
      this.redo();
    });
  }

  undo() {
    if (this.undoRedoManager.undo()) {
      console.log("Undo realizado");
      this.updateUI();
    }
  }

  redo() {
    if (this.undoRedoManager.redo()) {
      console.log("Redo realizado");
      this.updateUI();
    }
  }
  // Spawnea UN enemigo (objeto) y programa el siguiente a los 2s
_spawnCozy(cozyConfig) {
  // 1) Entidad lógica (objeto Cozy)
  const cozy = new Cozy(
    cozyConfig.type,
    this.pathManager.getCurrentPath(),
    this.assetLoader
  );
  this.cozys.push(cozy);
  this.cozyQueue.enqueue(cozy); // sigue usando tu cola circular

  const intervalSeconds = 2;                   // tu intervalo entre spawns
  const startOffset = Math.floor(speed * 10); 

  // 2) Representación visual en Phaser (si está disponible)
  if (this.phaserGame) {
    const routeName = this.pathManager.current || "ruta1";
    const speed = this.enemySpeed[cozyConfig.type] ?? 90;

    spawnEnemyOnPath(this.phaserGame, cozyConfig.type, routeName, {
      speed,
      scale: cozyConfig.type === "dragon" ? 1.2 : (cozyConfig.type === "mini-dragon" ? 0.9 : 1),
      action: "walk"
    });
  }
}


  startWave() {
  if (this.currentWaveIndex >= this.waves.length) {
    console.log("🎉 ¡Has completado todas las oleadas!");
    return;
  }

  const wave = this.waves[this.currentWaveIndex];
  console.log(`🌊 Iniciando: ${wave.name}`);

  let i = 0;
  const spawnNext = () => {
    if (i >= wave.cozys.length) return;       // terminó de programar esta oleada
    const cozyConfig = wave.cozys[i++];
    this._spawnCozy(cozyConfig);               // crea 1 enemigo (objeto) y lo lanza
    setTimeout(spawnNext, 5000);               // espera 5s y crea el siguiente
  };

  spawnNext();

  // mantenemos tu flujo: avanzas el índice y dejas que update() dispare la siguiente oleada
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
    this.cozyQueue.updateAll((cozy) => {
      if (cozy.isActive) {
        cozy.update(deltaTime);

        if (!cozy.isActive && cozy.state !== "death") {
          this.playerTakeDamage(cozy.baseDamage ?? 1);
        }
      }
    });

    // Filtrar enemigos inactivos y dar recompensas
    const initialCount = this.cozys.length;
    this.cozys = this.cozys.filter((cozy) => cozy.isActive);

    if (this.cozys.length < initialCount) {
      this.cozys.forEach((cozy) => {
        if (!cozy.isActive && cozy.state === "death") {
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

  drawBackground(ctx) {
    const bg = this.bgImage || this.assetLoader.getImage("mapa");
    if (bg) {
      ctx.drawImage(bg, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      // fallback si no hay imagen
      ctx.fillStyle = "#2c2c2c";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    // dibuja las rutas encima del fondo
    this.pathManager.drawPaths(ctx);
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (typeof this.drawBackground === "function") {
      this.drawBackground(this.ctx);
    } else {
      // ultra-fallback (por si alguien elimina el método)
      const background = this.assetLoader.getImage("mapa");
      if (background) {
        this.ctx.drawImage(
          background,
          0,
          0,
          this.canvas.width,
          this.canvas.height
        );
      }
    }

    this.cozys.forEach((cozy) => cozy.draw(this.ctx));
  }

  updateUI() {
    document.getElementById("health").textContent = this.playerHealth;
    document.getElementById("gold").textContent = this.gold;
    document.getElementById(
      "wave"
    ).textContent = `${this.currentWaveIndex}/${this.waves.length}`;

    // Actualizar estados de botones undo/redo
    document.getElementById("undo-btn").disabled =
      !this.undoRedoManager.canUndo();
    document.getElementById("redo-btn").disabled =
      !this.undoRedoManager.canRedo();
  }
}

export default GameEngine;
