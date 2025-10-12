import AssetLoader from "./AssetLoader.js";
import PathManager from "./PathManager.js";
import Cozy from "../entities/Cozy.js";
import UndoRedoManager from "../managers/UndoRedoManager.js";
import TowerManager from "../managers/TowerManager.js";
import PlaceTowerCommand from "../commands/PlaceTowerCommand.js";
import CircularQueue from "./structures/CircularQueue.js";
import { spawnEnemyOnPath, initPhaser, setPaths } from "../phaser.js";

class GameEngine {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.canvas = null; // Se creará en init()
    this.ctx = null; // Se creará en init()
    this.assetLoader = new AssetLoader();
    this.pathManager = new PathManager();
    this.undoRedoManager = new UndoRedoManager();

    this.cozys = [];
    this.cozyQueue = new CircularQueue(50); // Cola circular para actualización de estado
    this.waves = [];
    this.currentWaveIndex = 0;
    this.playerHealth = 100;
    this.score = 0;
    this.gold = 110; // Más oro inicial para comprar más torres
    this.waitingNextWave = false; // evita programar múltiples timers entre oleadas
    this.isPaused = false;

    // enemy speeds used when spawning with phaser
    this.enemySpeed = {
      monstruo: 90,
      demonio: 120,
      genio: 100,
      dragon: 80,
      "mini-dragon": 140,
    };

    // Towers
    this.towerManager = new TowerManager();
    this.placementMode = false;
    this.placementType = "basic";
    this.previewTower = null;

    this.lastTime = 0;
    this.spawnTimer = 0;

    this._uiWired = false; // ← evita registrar listeners duplicados
    this.setupEventListeners();
    // init() se llama manualmente desde index.html
  }

  // Alias por si alguien llama render() en vez de draw()
  render() { this.draw(); }

  // ⏸️ Usa #pause-overlay y #pause-btn + clase .hidden
  togglePause() {
    this.isPaused = !this.isPaused;

    const overlay = document.getElementById("pause-overlay");
    if (overlay) overlay.classList.toggle("hidden", !this.isPaused);

    const btn = document.getElementById("pause-btn");
    if (btn) btn.textContent = this.isPaused ? "▶️ Reanudar" : "⏸️ Pausa";

    console.log(this.isPaused ? "⏸️ Juego en pausa" : "▶️ Juego reanudado");
  }

  // 🔗 Engancha botones/teclas de la UI (idempotente)
  connectUIControls() {
    if (this._uiWired) return; // no registrar dos veces
    const pauseBtn  = document.getElementById("pause-btn");
    const resumeBtn = document.getElementById("resume-btn");
    const restartBtn = document.getElementById("restart-btn");
    const quitBtn = document.getElementById("quit-btn");

    if (pauseBtn)  pauseBtn.addEventListener("click", () => this.togglePause(), { once: false });
    if (resumeBtn) resumeBtn.addEventListener("click", () => { if (this.isPaused) this.togglePause(); }, { once: false });

    // opcionales
    if (restartBtn) restartBtn.addEventListener("click", () => { /* this.restart?.(); */ if (this.isPaused) this.togglePause(); });
    if (quitBtn)    quitBtn.addEventListener("click", () => { /* this.goToMenu?.(); */ if (this.isPaused) this.togglePause(); });

    // Atajo de teclado: P para pausar/reanudar
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "p") this.togglePause();
    });

    this._uiWired = true;
    console.log("[UI] Controles de pausa conectados");
  }

  createCanvas() {
    // NO limpiar el contenedor - Phaser necesita crear su canvas
    const container = document.getElementById(this.containerId);

    // Crear canvas overlay para torres (encima de Phaser)
    const canvas = document.createElement("canvas");
    canvas.id = "towers-overlay";
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "auto"; // Permite interacción de mouse
    canvas.style.zIndex = "10"; // Encima de Phaser

    // Asegurar que el contenedor tenga position relative
    if (
      container.style.position !== "relative" &&
      container.style.position !== "absolute"
    ) {
      container.style.position = "relative";
    }

    container.appendChild(canvas);
    return canvas;
  }

  async init() {
    // this.showLoadingMessage(); // Removido temporalmente
    try {
      // Inicializar Phaser primero
      this.phaserGame = await initPhaser(this.containerId, 800, 600);

      // Crear canvas overlay DESPUÉS de Phaser
      this.canvas = this.createCanvas();
      this.ctx = this.canvas.getContext("2d");

      // Pasar las rutas a Phaser
      const pathsByName = {};
      for (const [name, points] of this.pathManager.paths.entries()) {
        pathsByName[name] = points;
      }
      await setPaths(this.phaserGame, pathsByName);

      await this.assetLoader.loadGameAssets();
      this.setupWaves();

      // Configurar eventos de mouse del canvas DESPUÉS de crearlo
      this._attachCanvasHandlers();

      // Remover mensaje de carga
      const loadingMsg = document.getElementById("loading-message");
      if (loadingMsg) loadingMsg.remove();

      this.start();

      // 🔗 Enganchar botones de UI (pausa/continuar/etc.)
      this.connectUIControls();
    } catch (error) {
      console.error("Error cargando recursos:", error);
      this.showErrorMessage();
    }
  }

  showLoadingMessage() {
    const container = document.getElementById(this.containerId);
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-message";
    loadingDiv.style.cssText = `
      position: absolute; top: 50%; left: 50%; 
      transform: translate(-50%, -50%); 
      color: white; font-size: 20px; 
      text-align: center; z-index: 100;
    `;
    loadingDiv.textContent = "Cargando Tower Defense...";
    container.appendChild(loadingDiv);
  }

  showErrorMessage() {
    const container = document.getElementById(this.containerId);
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: absolute; top: 50%; left: 50%; 
      transform: translate(-50%, -50%); 
      color: red; font-size: 16px; 
      text-align: center; z-index: 100;
    `;
    errorDiv.textContent = "Error cargando recursos. Verifica la consola.";
    container.appendChild(errorDiv);
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
          { type: "demonio", delay: 2 },
          { type: "monstruo", delay: 4 },
          { type: "demonio", delay: 6 },
          { type: "mini-dragon", delay: 8 },
        ],
      },
      {
        name: "Oleada 3 - Mixta",
        cozys: [
          { type: "monstruo", delay: 0 },
          { type: "demonio", delay: 2 },
          { type: "genio", delay: 4 },
          { type: "dragon", delay: 6 },
          { type: "mini-dragon", delay: 8 },
          { type: "monstruo", delay: 10 },
        ],
      },
    ];
  }

  setupEventListeners() {
    // Botones de undo/redo
    document.getElementById("undo-btn").addEventListener("click", () => {
      this.undo();
    });
    document.getElementById("redo-btn").addEventListener("click", () => {
      this.redo();
    });

    // Panel de Torres: activar modo colocación
    const towerItems = document.querySelectorAll(".tower-item");
    towerItems.forEach((item) => {
      item.addEventListener("click", () => {
        const type = item.dataset.tower || "basic";
        this.placementMode = true;
        this.placementType = type;
        this.previewTower = null;
        // visual feedback en UI
        towerItems.forEach((i) => i.classList.remove("placing"));
        item.classList.add("placing");
        console.log("Modo colocación activado:", type);
      });
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

  // Spawnea UN enemigo (objeto)
  _spawnCozy(cozyConfig) {
    // 1) Entidad lógica (objeto Cozy)
    const cozy = new Cozy(
      cozyConfig.type,
      this.pathManager.getCurrentPath(),
      this.assetLoader
    );
    this.cozys.push(cozy);
    this.cozyQueue.enqueue(cozy); // sigue usando tu cola circular

    // 2) Representación visual en Phaser (si está disponible)
    if (this.phaserGame) {
      const routeName = this.pathManager.current || "ruta1";
      const speed = this.enemySpeed[cozyConfig.type] ?? 90;

      spawnEnemyOnPath(this.phaserGame, cozyConfig.type, routeName, {
        speed,
        scale:
          cozyConfig.type === "dragon"
            ? 1.2
            : cozyConfig.type === "mini-dragon"
            ? 0.9
            : 1,
        action: "walk",
      });
    }
  }

  startWave() {
    if (this.currentWaveIndex >= this.waves.length) {
      console.log("🎉 ¡Has completado todas las oleadas!");
      // NO mostrar victoria aquí - esperar a que no haya enemigos
      return;
    }

    if (this.cozys.length > 0) {
      console.log("⏳ Aún hay enemigos activos; se inicia la nueva oleada cuando terminen.");
      return;
    }

    const wave = this.waves[this.currentWaveIndex];
    console.log(`🌊 Iniciando: ${wave.name}`);

    let i = 0;
    const spawnNext = () => {
      if (i >= wave.cozys.length) return; // terminó de programar esta oleada
      const cozyConfig = wave.cozys[i++];
      this._spawnCozy(cozyConfig); // crea 1 enemigo (objeto) y lo lanza
      setTimeout(spawnNext, 6000); // espera 6s y crea el siguiente
    };

    spawnNext();

    // avanzas el índice y dejas que update() dispare la siguiente oleada
    this.currentWaveIndex++;
    this.updateUI();
  }

  start() {
    // Guardar tiempo inicial
    this.lastTime = performance.now();

    // Iniciar la primera oleada después de 2 segundos
    setTimeout(() => this.startWave(), 2000);

    // Iniciar el bucle principal del juego
    requestAnimationFrame(this.gameLoop.bind(this));

    // Habilitar manejadores del canvas (para colocar torres, etc.)
    this._attachCanvasHandlers();

    // Sincronizar canvas múltiples veces para asegurar alineación visual
    setTimeout(() => this._syncCanvasToPhaser(), 100);
    setTimeout(() => this._syncCanvasToPhaser(), 500);
    setTimeout(() => this._syncCanvasToPhaser(), 1000);

    // Re-sincronizar al cambiar el tamaño de la ventana
    window.addEventListener("resize", () => this._syncCanvasToPhaser());
  }

  _syncCanvasToPhaser() {
    try {
      const container = document.getElementById(this.containerId);
      if (!container) return;

      // Encontrar el canvas de Phaser y el overlay
      const phaserCanvas = Array.from(
        container.querySelectorAll("canvas")
      ).find((c) => c.id !== "towers-overlay");
      const overlay = document.getElementById("towers-overlay");
      if (!overlay || !phaserCanvas) return;
      if (phaserCanvas) {
        const rect = phaserCanvas.getBoundingClientRect();
        const crect = container.getBoundingClientRect();

        // Sincronizar posición y tamaño exacto del overlay con Phaser
        overlay.style.left = rect.left - crect.left + "px";
        overlay.style.top = rect.top - crect.top + "px";
        overlay.width = Math.floor(rect.width);
        overlay.height = Math.floor(rect.height);
        overlay.style.width = Math.floor(rect.width) + "px";
        overlay.style.height = Math.floor(rect.height) + "px";

        console.log(
          `🎯 Canvas sincronizado: ${overlay.width}x${overlay.height} en posición (${overlay.style.left}, ${overlay.style.top})`
        );
      } else {
        // fallback: fill container
        const crect = container.getBoundingClientRect();
        overlay.style.left = "0px";
        overlay.style.top = "0px";
        overlay.width = Math.floor(crect.width);
        overlay.height = Math.floor(crect.height);
        overlay.style.width = Math.floor(crect.width) + "px";
        overlay.style.height = Math.floor(crect.height) + "px";
      }
    } catch (e) {
      // ignore
    }
  }

  _attachCanvasHandlers() {
    const canvas = this.canvas;
    if (!canvas) return;

    // click to place tower
    canvas.addEventListener("click", (ev) => {
      if (!this.placementMode) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;

      console.log(
        `🎯 Click en: (${Math.round(x)}, ${Math.round(
          y
        )}) - Canvas: ${canvas.width}x${canvas.height} - Rect: ${Math.round(
          rect.width
        )}x${Math.round(rect.height)}`
      );

      // validation
      if (!this.towerManager.canPlaceAt(x, y, this.pathManager)) {
        console.log("No puedes colocar allí");
        return;
      }

      const cost = this._getCostForType(this.placementType);
      if (this.gold < cost) {
        console.log("Oro insuficiente");
        return;
      }

      // execute via undoRedoManager
      const cmd = new PlaceTowerCommand(
        this.towerManager,
        { x, y, type: this.placementType, cost, assetLoader: this.assetLoader },
        this
      );
      this.undoRedoManager.execute(cmd);
      this.gold -= cost; // Descuento inicial (primera colocación)
      this.placementMode = false;
      this.previewTower = null;

      this.updateUI();
      // clear UI placing state
      try {
        document
          .querySelectorAll(".tower-item.placing")
          .forEach((el) => el.classList.remove("placing"));
      } catch (e) {}
    });

    // move to update preview
    canvas.addEventListener("mousemove", (ev) => {
      if (!this.placementMode) return;
      const rect = canvas.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      if (!this.previewTower)
        this.previewTower = {
          x,
          y,
          type: this.placementType,
          range: 80,
        };
      else {
        this.previewTower.x = x;
        this.previewTower.y = y;
      }
    });

    // ESC to cancel placement
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" || ev.key === "Esc") {
        if (this.placementMode) {
          this.placementMode = false;
          this.previewTower = null;
          try {
            document
              .querySelectorAll(".tower-item.placing")
              .forEach((el) => el.classList.remove("placing"));
          } catch (e) {}
        }
      }
    });
  }

  _getCostForType(type) {
    switch (type) {
      case "rapid":
        return 75;
      case "powerful":
        return 100;
      default:
        return 50;
    }
  }

  gameLoop(currentTime) {
    // Calcular el tiempo transcurrido desde el último frame
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Si el juego no está en pausa, actualizar y renderizar
    if (!this.isPaused) {
      this.update(deltaTime); // Actualiza enemigos, torres, proyectiles, etc.
      this.draw();            // Dibuja en el canvas
    }
    // Volver a llamar al siguiente frame
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {
    const currentTime = performance.now();

    // Actualizar enemigos usando la cola circular
    this.cozyQueue.updateAll((cozy) => {
      if (cozy.isActive) {
        cozy.update(deltaTime);

        if (!cozy.isActive && cozy.state !== "death") {
          const damage = cozy.baseDamage ?? 1;
          const enemyName =
            {
              monstruo: "Monstruo",
              demonio: "Demonio",
              genio: "Genio",
              dragon: "Dragón",
              "mini-dragon": "Mini-Dragón",
            }[cozy.type] || cozy.type;

          this.playerTakeDamage(damage);
          console.log(
            `💔 ¡${enemyName} atravesó las defensas! -${damage} salud (Salud restante: ${this.playerHealth})`
          );
        }
      }
    });

    // 🏰 COMBATE DE TORRES: actualizar todas las torres
    const towers = this.towerManager.getTowers();
    const activeEnemies = this.cozys.filter(
      (cozy) => cozy.isActive && cozy.state !== "death"
    );

    towers.forEach((tower) => {
      const result = tower.update(activeEnemies, currentTime);
      if (result) {
        // 💰 Recompensas
        if (result.killed) {
          const killReward = (result.target.reward || 15) + 25;
          this.gold += killReward;
          this.score += killReward * 10;
          console.log(`💀 Torre eliminó enemigo! +${killReward} oro`);
        } else {
          const hitReward = 8;
          this.gold += hitReward;
          this.score += hitReward * 5;
          console.log(`🎯 Torre golpeó enemigo! +${hitReward} oro`);
        }
      }
    });

    // Filtrar enemigos inactivos
    this.cozys = this.cozys.filter((cozy) => cozy.isActive);

    // Siguiente oleada 3 s después de eliminar TODOS los enemigos
    if (
      this.cozys.length === 0 &&
      this.currentWaveIndex < this.waves.length &&
      !this.waitingNextWave
    ) {
      this.waitingNextWave = true;
      console.log("🕒 Siguiente oleada en 3 segundos...");
      setTimeout(() => {
        this.waitingNextWave = false;
        this.startWave();
      }, 3000);
    }

    // Victoria cuando no hay más oleadas ni enemigos
    if (
      this.cozys.length === 0 &&
      this.currentWaveIndex >= this.waves.length &&
      !document.getElementById("victory-message")
    ) {
      console.log("🎉 ¡VICTORIA COMPLETA! Todas las oleadas derrotadas");
      this.showVictoryMessage();
    }

    this.updateUI();
  }

  playerTakeDamage(damage) {
    this.playerHealth -= damage;
    if (this.playerHealth <= 0) {
      this.playerHealth = 0;
      console.log("💀 ¡Game Over!");
      this.showGameOverMessage();
    }
  }

  showVictoryMessage() {
    const container = document.getElementById(this.containerId);
    const victoryDiv = document.createElement("div");
    victoryDiv.id = "victory-message";
    victoryDiv.style.cssText = `
      position: absolute; top: 50%; left: 50%; 
      transform: translate(-50%, -50%); 
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white; font-size: 24px; font-weight: bold;
      text-align: center; z-index: 200;
      padding: 30px; border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 3px solid #FFD700;
    `;
    victoryDiv.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 10px;">🏆</div>
      <div>¡FELICITACIONES!</div>
      <div style="font-size: 18px; margin-top: 10px;">Has defendido exitosamente</div>
      <div style="font-size: 18px;">contra todas las oleadas</div>
      <div style="font-size: 16px; margin-top: 15px; color: #FFD700;">
        Puntuación Final: ${this.score} | Oro: ${this.gold}
      </div>
    `;
    container.appendChild(victoryDiv);
  }

  showGameOverMessage() {
    const container = document.getElementById(this.containerId);
    const gameOverDiv = document.createElement("div");
    gameOverDiv.id = "gameover-message";
    gameOverDiv.style.cssText = `
      position: absolute; top: 50%; left: 50%; 
      transform: translate(-50%, -50%); 
      background: linear-gradient(135deg, #f44336, #d32f2f);
      color: white; font-size: 24px; font-weight: bold;
      text-align: center; z-index: 200;
      padding: 30px; border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 3px solid #ff5722;
    `;
    gameOverDiv.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 10px;">💀</div>
      <div>GAME OVER</div>
      <div style="font-size: 18px; margin-top: 10px;">Tu base ha sido destruida</div>
      <div style="font-size: 16px; margin-top: 15px; color: #ffcdd2;">
        Puntuación: ${this.score} | Oleada: ${this.currentWaveIndex}/${this.waves.length}
      </div>
    `;
    container.appendChild(gameOverDiv);
  }

  drawBackground(ctx) {
    // Phaser maneja el fondo ahora
  }

  draw() {
    // Limpiar canvas overlay (transparente - Phaser maneja el fondo)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Enemigos
    this.cozys.forEach((cozy) => cozy.draw(this.ctx));

    // Torres
    const towers = this.towerManager.getTowers();
    for (const t of towers) {
      t.draw(this.ctx);
    }

    // Preview colocación
    if (this.previewTower) {
      const p = this.previewTower;
      const can = this.towerManager.canPlaceAt(p.x, p.y, this.pathManager);
      this.ctx.save();
      this.ctx.globalAlpha = 0.95;
      this.ctx.beginPath();
      this.ctx.fillStyle = can
        ? "rgba(100,255,150,0.25)"
        : "rgba(255,100,100,0.25)";
      this.ctx.strokeStyle = can ? "rgba(0,200,100,0.6)" : "rgba(200,0,0,0.6)";
      this.ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  updateUI() {
    document.getElementById("health").textContent = this.playerHealth;
    document.getElementById("gold").textContent = this.gold;
    document.getElementById("wave").textContent = `${this.currentWaveIndex}/${this.waves.length}`;

    // Actualizar estados de botones undo/redo
    document.getElementById("undo-btn").disabled =
      !this.undoRedoManager.canUndo();
    document.getElementById("redo-btn").disabled =
      !this.undoRedoManager.canRedo();
  }
}

export default GameEngine;
