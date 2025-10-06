class GameEngine {
  constructor() {
    this.cozys = []; // Array de Cozys activos
    this.lastTime = 0;
    // ... otras inicializaciones
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  gameLoop(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convertir a segundos
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {
    // Actualizar cada Cozy
    this.cozys.forEach(cozy => cozy.update(deltaTime));

    // Eliminar los Cozys que llegaron al final o murieron
    this.cozys = this.cozys.filter(cozy => !cozy.reachedEnd && cozy.hp > 0);
  }

  draw() {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar el camino (opcional)
    this.drawPath(ctx);

    // Dibujar cada Cozy
    this.cozys.forEach(cozy => cozy.draw(ctx));
  }

  drawPath(ctx) {
    // Dibujar el camino como una línea que une los waypoints
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    ctx.stroke();
  }

  // Método para agregar Cozys (por ejemplo, al inicio de una oleada)
  addCozy(cozy) {
    this.cozys.push(cozy);
  }
}

// src/core/GameEngine.js
class GameEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.canvas = this.createCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.deltaTime = 0;
        
        this.animationManager = new AnimationManager();
        this.particleSystem = new ParticleSystem();
        this.cozys = [];
        this.path = this.generatePath();
        
        this.setupEventListeners();
    }

    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.style.border = '1px solid black';
        this.container.appendChild(canvas);
        return canvas;
    }

    generatePath() {
        // Generar camino predefinido
        return [
            { x: -50, y: 300 },
            { x: 200, y: 300 },
            { x: 200, y: 150 },
            { x: 400, y: 150 },
            { x: 400, y: 450 },
            { x: 600, y: 450 },
            { x: 600, y: 300 },
            { x: 850, y: 300 }
        ];
    }

    start() {
        this.spawnWave();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    gameLoop(currentTime) {
        this.deltaTime = (currentTime - this.lastTime) / 1000; // Convertir a segundos
        this.lastTime = currentTime;

        // Actualizar lógica del juego
        this.update(this.deltaTime);
        
        // Renderizar
        this.draw();
        
        // Continuar el loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update(deltaTime) {
        // Actualizar Cozys
        this.cozys.forEach(cozy => cozy.update(deltaTime));
        
        // Eliminar Cozys inactivos
        this.cozys = this.cozys.filter(cozy => cozy.isActive);
        
        // Actualizar sistema de partículas
        this.particleSystem.update(deltaTime);
        
        // Spawn de nuevos Cozys si es necesario
        if (this.cozys.length === 0) {
            this.spawnWave();
        }
    }

    draw() {
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar camino
        this.drawPath();
        
        // Dibujar partículas
        this.particleSystem.draw(this.ctx);
        
        // Dibujar Cozys
        this.cozys.forEach(cozy => cozy.draw(this.ctx));
        
        // Dibujar UI
        this.drawUI();
    }

    drawPath() {
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 40;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.path[0].x, this.path[0].y);
        
        for (let i = 1; i < this.path.length; i++) {
            this.ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        
        this.ctx.stroke();
        
        // Borde del camino
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    spawnWave() {
        const waveTypes = ['basic', 'fast', 'tank'];
        
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const type = waveTypes[Math.floor(Math.random() * waveTypes.length)];
                const cozy = new Cozy(type, this.path, this.animationManager);
                cozy.particleSystem = this.particleSystem;
                this.cozys.push(cozy);
            }, i * 1000); // Spawn cada segundo
        }
    }

    drawUI() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Cozys activos: ${this.cozys.length}`, 10, 20);
    }
}