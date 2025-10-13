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

    this.currentLevel = this.loadSelectedLevel();

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

  // método para cargar el nivel seleccionado
  loadSelectedLevel() {
    const level = localStorage.getItem('selectedLevel');
    return level ? parseInt(level) : 1; // Por defecto nivel 1
  }

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
    const pauseBtn = document.getElementById("pause-btn");
    const resumeBtn = document.getElementById("resume-btn");
    const restartBtn = document.getElementById("restart-btn");
    const quitBtn = document.getElementById("quit-btn");

    if (pauseBtn) pauseBtn.addEventListener("click", () => this.togglePause(), { once: false });
    if (resumeBtn) resumeBtn.addEventListener("click", () => { if (this.isPaused) this.togglePause(); }, { once: false });

    // opcionales
    if (restartBtn) restartBtn.addEventListener("click", () => { /* this.restart?.(); */ if (this.isPaused) this.togglePause(); });
    if (quitBtn) quitBtn.addEventListener("click", () => { /* this.goToMenu?.(); */ if (this.isPaused) this.togglePause(); });

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

      this.updateUI();

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
    console.log(`🎮 Configurando oleadas para Nivel ${this.currentLevel}`);

    if (this.currentLevel === 1) {
      // NIVEL 1 - Fácil (3 oleadas)
      this.waves = [
        {
          name: "Oleada 1 - Introducción",
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
          name: "Oleada 3 - Desafío Final",
          cozys: [
            { type: "monstruo", delay: 0 },
            { type: "demonio", delay: 2 },
            { type: "mini-dragon", delay: 4 },
            { type: "monstruo", delay: 6 },
            { type: "mini-dragon", delay: 8 },
          ],
        },
      ];

      // Configuración inicial para nivel 1
      this.playerHealth = 100;
      this.gold = 110;

      // Establecer ruta 1 (Correcto para Nivel 1)
      this.pathManager.setCurrent('ruta1');

    } else if (this.currentLevel === 2) {

      // NIVEL 2 - Difícil (5 oleadas)
      this.waves = [
        {
          name: "Oleada 1 - Calentamiento Rápido",
          cozys: [
            { type: "demonio", delay: 0.1 },
            { type: "demonio", delay: 0.2 },
            { type: "genio", delay: 0.3 },
            { type: "mini-dragon", delay: 0.4 },
            { type: "monstruo", delay: 0.5 },
            { type: "demonio", delay: 0.6 },
          ], // Total 7
        },
        {
          name: "Oleada 2 - Ataque Mixto",
          cozys: [
            { type: "genio", delay: 0 },
            { type: "demonio", delay: 1.5 },
            { type: "dragon", delay: 3 },
            { type: "mini-dragon", delay: 4.5 },
            { type: "dragon", delay: 6 },
            { type: "genio", delay: 7.5 },
            { type: "monstruo", delay: 9 },
            { type: "mini-dragon", delay: 10.5 },
            { type: "demonio", delay: 0.1 },
            { type: "demonio", delay: 0.2 },
            { type: "genio", delay: 0.3 },
            { type: "mini-dragon", delay: 0.4 },
          ], // Total 9
        },
        {
          name: "Oleada 3 - Asalto de Dragones",
          cozys: [
            { type: "dragon", delay: 0 },
            { type: "dragon", delay: 1.5 },
            { type: "mini-dragon", delay: 3 },
            { type: "mini-dragon", delay: 4.5 },
            { type: "dragon", delay: 6 },
            { type: "demonio", delay: 7.5 },
            { type: "genio", delay: 9 },
            { type: "dragon", delay: 10.5 },
            { type: "demonio", delay: 0.1 },
            { type: "demonio", delay: 0.2 },
            { type: "genio", delay: 0.3 },
            { type: "mini-dragon", delay: 0.4 },
            { type: "monstruo", delay: 0.5 },
          ], // Total 8
        },
        {
          name: "Oleada 4 - El Muro de Tanques",
          cozys: [
            { type: "genio", delay: 0 },
            { type: "dragon", delay: 1.5 },
            { type: "genio", delay: 3 },
            { type: "dragon", delay: 4.5 },
            { type: "genio", delay: 6 },
            { type: "dragon", delay: 7.5 },
            { type: "dragon", delay: 9 },
            { type: "demonio", delay: 0.1 },
            { type: "demonio", delay: 0.2 },
            { type: "genio", delay: 0.3 },
            { type: "mini-dragon", delay: 0.4 },
            { type: "monstruo", delay: 0.5 },
            { type: "demonio", delay: 0.6 },
          ], // Total 7
        },
        {
          name: "Oleada 5 - Asalto Final",
          cozys: [
            { type: "dragon", delay: 0 },
            { type: "mini-dragon", delay: 1 },
            { type: "genio", delay: 2 },
            { type: "demonio", delay: 3 },
            { type: "dragon", delay: 4 },
            { type: "mini-dragon", delay: 5 },
            { type: "genio", delay: 6 },
            { type: "dragon", delay: 7 },
            { type: "dragon", delay: 8 },
            { type: "demonio", delay: 9 },
            { type: "genio", delay: 10 },
            { type: "demonio", delay: 0.1 },
            { type: "demonio", delay: 0.2 },
            { type: "genio", delay: 0.3 },
            { type: "mini-dragon", delay: 0.4 },
            { type: "monstruo", delay: 0.5 },
            { type: "demonio", delay: 0.6 },
            { type: "genio", delay: 2 },
            { type: "demonio", delay: 3 },
            { type: "dragon", delay: 4 },
            { type: "mini-dragon", delay: 5 },
          ], // Total 11
        },
      ];


      // Ajustar velocidades de enemigos según el nivel
      if (this.currentLevel === 2) {
        // Enemigos más rápidos en nivel 2
        this.enemySpeed = {
          monstruo: 200,
          demonio: 200,
          genio: 200,
          dragon: 200,
          "mini-dragon": 160,
        };
      }

      // Configuración inicial para nivel 2
      this.playerHealth = 75;
      this.gold = 80; // Más oro inicial para el nivel difícil

      // ⚠️ Se eliminó this.pathManager.setCurrent('ruta2'); 
      // para permitir que _spawnCozy() elija aleatoriamente.
    }


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

  // src/core/GameEngine.js

  // Spawnea UN enemigo (objeto)
  _spawnCozy(cozyConfig) {
    // 🔑 PASO 1: Elegir la ruta aleatoria (Lógica de bifurcación)
    let routeName = "ruta1";
    if (this.currentLevel === 2) {
      // 50% de probabilidad de usar 'ruta1' o 'ruta2'
      routeName = Math.random() < 0.5 ? 'ruta1' : 'ruta2';
    }

    // 🔑 PASO 2: OBTENER LOS PUNTOS EXACTOS DE LA RUTA ELEGIDA
    // Se usa getPath() en lugar de getCurrentPath() para evitar errores de estado interno
    const pathPoints = this.pathManager.getPath(routeName);

    if (!pathPoints || pathPoints.length < 2) {
      console.error(`[GameEngine] No se encontraron puntos para la ruta: ${routeName}`);
      return; // Detiene la creación si la ruta no existe
    }

    // 1) Entidad lógica (objeto Cozy)
    const cozy = new Cozy(
      cozyConfig.type,
      pathPoints, // 👈 Se le pasan los puntos DIRECTOS de la ruta aleatoria
      this.assetLoader
    );
    this.cozys.push(cozy);
    this.cozyQueue.enqueue(cozy);

    // Opcional: Actualizar el PathManager con la última ruta usada
    this.pathManager.setCurrent(routeName);

    // 2) Representación visual en Phaser (si está disponible)
    if (this.phaserGame) {
      const speed = this.enemySpeed[cozyConfig.type] ?? 90;

      // 👈 Se usa la ruta elegida para Phaser
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

    const spawnIntervalMs = this.currentLevel === 2 ? 2000 : 6000;

    let i = 0;
    const spawnNext = () => {
      if (i >= wave.cozys.length) return; // terminó de programar esta oleada
      const cozyConfig = wave.cozys[i++];
      this._spawnCozy(cozyConfig); // crea 1 enemigo (objeto) y lo lanza
      setTimeout(spawnNext, spawnIntervalMs); // espera 6s y crea el siguiente
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
      } catch (e) { }
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
          } catch (e) { }
        }
      }
    });
  }

  _getCostForType(type) {
    // Costos base (Nivel 1)
    let cost = 0;
    switch (type) {
      case "rapid":
        cost = 75;
        break;
      case "powerful":
        cost = 100;
        break;
      default:
        cost = 50;
        break;
    }

    // Aumentar el costo para el Nivel 2
    if (this.currentLevel === 2) {
      // Aumento del 40% en el costo para Nivel 2 (50*1.4 = 70)
      return Math.round(cost * 1.4);
    }
    return cost;
  }

  gameLoop(currentTime) {
    // Calcular el tiempo transcurrido desde el último frame
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Si el juego no está en pausa, actualizar y renderizar
    if (!this.isPaused) {
      this.update(deltaTime); // Actualiza enemigos, torres, proyectiles, etc.
      this.draw();            // Dibuja en el canvas
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

    const damageMultiplier = this.currentLevel === 2 ? 0.001 : 1;
    const goldMultiplier = this.currentLevel === 2 ? 0.10 : 1;

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
      this.currentWaveIndex >= this.waves.length && 
      this.cozys.every(cozy => !cozy.isActive) // ✅ todos los enemigos eliminados
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
  const modal = document.getElementById("victory-modal");
  const scoreNode = document.getElementById("victory-score");
  const goldNode = document.getElementById("victory-gold");
  const btnClose = document.getElementById("victory-close");

  if (!modal || !scoreNode || !goldNode) return;

  // Rellenar datos
  scoreNode.textContent = this.score;
  goldNode.textContent = this.gold;

  // Mostrar modal
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // Cerrar (opcional: puedes reiniciar juego aquí si quieres)
  if (btnClose) {
    btnClose.onclick = () => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      // this.restartGame(); // <- si quieres reiniciar
    };
  }
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

    const scoreEl = document.getElementById("score-value");
    if (scoreEl) scoreEl.textContent = this.score;

    // 🔑 CORRECCIÓN: Actualizar los costos de las torres en la UI
    document.querySelectorAll(".towers-list .tower-item").forEach((item) => {
      const towerType = item.getAttribute("data-tower");
      const costElement = item.querySelector(".tower-cost");

      if (costElement) {
        // Obtiene el costo real (70 para basic tower en Nivel 2)
        costElement.textContent = this._getCostForType(towerType);
      }
    });


    const levelDisplay = document.getElementById("current-level");
    if (levelDisplay) {
      levelDisplay.textContent = this.currentLevel;
    }

    const totalWaves = this.waves.length;
    document.getElementById("wave").textContent = `${this.currentWaveIndex}/${totalWaves}`;

    if (this.currentLevel === 2) {
      // Nivel 2 tiene 5 oleadas
      document.getElementById("wave").textContent = `${this.currentWaveIndex}/5`;
    } else {
      // Nivel 1 tiene 3 oleadas
      document.getElementById("wave").textContent = `${this.currentWaveIndex}/3`;
    }


    // Actualizar estados de botones undo/redo
    document.getElementById("undo-btn").disabled =
      !this.undoRedoManager.canUndo();
    document.getElementById("redo-btn").disabled =
      !this.undoRedoManager.canRedo();
  }
}

export default GameEngine;