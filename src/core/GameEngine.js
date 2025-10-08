import PathManager from './PathManager.js';
import Queue from './structures/Queue.js';
import Stack from './structures/Stack.js';
import Cozy from '../entities/Cozy.js';

class GameEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = 800;
        this.height = 480;

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.className = 'game-canvas';
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.pathManager = new PathManager();

        this.paused = false;

        // Estado del juego
        this.playerHealth = 20;
        this.gold = 100;
        this.score = 0;

        // Enemigos activos
        this.enemies = [];

        // Estructuras solicitadas: Cola para spawn y Pila para historial
        this.spawnQueue = new Queue(); // agenda de spawns pendientes
        this.historyStack = new Stack(); // historial de oleadas/segmentos completados

        // Control de oleadas
        this.currentWaveIndex = 0;
        this.waveSegments = []; // segmentos dentro de la oleada actual
        this.activeSegment = null;
        this.timeSinceLastSpawn = 0;

        // Configurar oleadas según requerimiento
        this.waves = this.buildWaves();

        // Loop
        this.lastTime = performance.now();
        this._loop = this._loop.bind(this);
        requestAnimationFrame(this._loop);
    }

    // Define las oleadas y segmentos con rutas y tipos
    buildWaves() {
        const ruta1 = this.pathManager.getPath('ruta1');
        const ruta2 = this.pathManager.getPath('ruta2');

        const makeBatch = (type, count, pathName) => ({ type, count, pathName });

        return [
            // Oleada 1:
            // - ruta1: 5 monstruos, luego ruta2: 5 monstruos
            [
                makeBatch('monstruo', 5, 'ruta1'),
                makeBatch('monstruo', 5, 'ruta2')
            ],
            // Oleada 2:
            // - ruta1: 7 monstruos, luego ruta2: 4 monstruos y 1 genio
            [
                makeBatch('monstruo', 7, 'ruta1'),
                makeBatch('monstruo', 4, 'ruta2'),
                makeBatch('genio', 1, 'ruta2')
            ],
            // Oleada 3:
            // - ruta1 y ruta2: 10 monstruos (5 y 5 alternados), luego un dragón en ruta1
            [
                { type: 'monstruo', count: 10, pathName: ['ruta1','ruta2'], alternate: true },
                makeBatch('dragon', 1, 'ruta1')
            ]
        ];
    }

    startNextWave() {
        if (this.currentWaveIndex >= this.waves.length) return; // no más oleadas

        // Cargar segmentos de esta oleada
        const segments = this.waves[this.currentWaveIndex];
        this.waveSegments = [...segments]; // copia
        this.activeSegment = null;
        this.spawnQueue.clear();
        this.timeSinceLastSpawn = 0;

        // Comenzar primer segmento
        this.startNextSegment();
    }

    startNextSegment() {
        if (this.waveSegments.length === 0) {
            // Oleada completada
            this.historyStack.push({ wave: this.currentWaveIndex + 1, status: 'completed' });
            this.currentWaveIndex += 1;
            return;
        }
        this.activeSegment = this.waveSegments.shift();
        this.spawnQueue.clear();
        this.timeSinceLastSpawn = 0;

        const seg = this.activeSegment;
        const isAlt = Array.isArray(seg.pathName);

        if (seg.alternate && isAlt) {
            // Alternar rutas para 10 monstruos
            for (let i = 0; i < seg.count; i++) {
                const pathName = seg.pathName[i % seg.pathName.length];
                this.spawnQueue.enqueue({ type: 'monstruo', pathName, cooldown: 0.6 });
            }
        } else {
            for (let i = 0; i < seg.count; i++) {
                this.spawnQueue.enqueue({ type: seg.type, pathName: seg.pathName, cooldown: 0.6 });
            }
        }
    }

    spawnFromQueue() {
        if (this.spawnQueue.isEmpty()) return false;

        const job = this.spawnQueue.dequeue();
        const path = this.pathManager.getPath(job.pathName);
        const stats = Cozy.statsForType(job.type);
        const enemy = new Cozy({
            type: job.type,
            path,
            speed: stats.speed,
            hp: stats.hp
        });
        this.enemies.push(enemy);
        return true;
    }

    damageEnemy(enemy, dmg) {
        enemy.takeDamage(dmg);
        if (!enemy.isActive) {
            this.gold += enemy.goldReward;
            this.score += enemy.goldReward * 2;
        }
    }

    update(dt) {
        // Si no hay oleada activa y no hemos llegado al final, arrancar la siguiente
        if (!this.activeSegment && this.currentWaveIndex < this.waves.length) {
            this.startNextWave();
        }

        // Spawning control (una unidad cada ~0.6s si hay en cola)
        this.timeSinceLastSpawn += dt;
        if (this.timeSinceLastSpawn >= 0.6 && !this.spawnQueue.isEmpty()) {
            this.spawnFromQueue();
            this.timeSinceLastSpawn = 0;
        }

        // Actualizar enemigos y verificar objetivos
        for (const e of this.enemies) {
            if (!e.isActive) continue;
            e.update(dt);

            // Daño básico aleatorio (simula torres)
            if (Math.random() < 0.02) {
                this.damageEnemy(e, 8);
            }

            // ¿Llegó a la base?
            if (e.isActive && e.reachedGoal()) {
                e.isActive = false;
                this.playerHealth -= e.baseDamage;
                if (this.playerHealth < 0) this.playerHealth = 0;
            }
        }

        // Limpiar enemigos inactivos
        this.enemies = this.enemies.filter(e => e.isActive);

        // ¿Se completó el segmento actual? (no hay más en cola y no quedan activos de este segmento)
        if (this.activeSegment && this.spawnQueue.isEmpty()) {
            const anyActive = this.enemies.some(() => true);
            if (!anyActive) {
                // segment complete
                this.historyStack.push({ wave: this.currentWaveIndex + 1, segment: this.activeSegment, status: 'segment_completed' });
                this.activeSegment = null;
                this.startNextSegment();
            }
        }
    }

    drawBackground(ctx) {
        // Pasto
        ctx.fillStyle = '#77b255';
        ctx.fillRect(0, 0, this.width, this.height);
        // Camino
        this.pathManager.drawPaths(ctx);

        // Base (objetivo) en el final de cada ruta
        ctx.fillStyle = '#444';
        for (const name of this.pathManager.getAllPathNames()) {
            const path = this.pathManager.getPath(name);
            const end = path[path.length - 1];
            ctx.fillRect(end.x - 10, end.y - 10, 20, 20);
        }
    }

    drawHUD(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.fillText(`❤️ Vida: ${this.playerHealth}`, 12, 20);
        ctx.fillText(`💰 Oro: ${this.gold}`, 12, 40);
        const totalWaves = this.waves.length;
        ctx.fillText(`🌊 Oleada: ${Math.min(this.currentWaveIndex + (this.activeSegment ? 1 : 0), totalWaves)}/${totalWaves}`, 12, 60);

        // Mostrar tamaños de cola y pila
        ctx.fillText(`🧱 Cola spawns: ${this.spawnQueue.size()}`, 12, 80);
        ctx.fillText(`📚 Pila historial: ${this.historyStack.size()}`, 12, 100);
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground(ctx);
        // Enemigos
        for (const e of this.enemies) {
            e.draw(ctx);
        }
        this.drawHUD(ctx);
    }

    _loop(now) {
        const dt = Math.min(0.05, (now - this.lastTime) / 1000); // clamp dt
        this.lastTime = now;
        // Stop if game over
        if (this.playerHealth <= 0) {
            this.render();
            this.drawGameOver();
            return;
        }
        if (!this.paused) { this.update(dt); }
        this.render();
        requestAnimationFrame(this._loop);
    }

    drawGameOver() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0,0,this.width,this.height);
        ctx.fillStyle = '#fff';
        ctx.font = '32px sans-serif';
        ctx.fillText('GAME OVER', this.width/2 - 100, this.height/2);
        ctx.restore();
    }

    togglePause() { this.paused = !this.paused; }
    setPaused(v) { this.paused = !!v; }
    isPaused() { return this.paused; }
}

export default GameEngine;
