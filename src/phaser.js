// src/phaser.js
// Phaser wrapper: escena, rutas y spawns con animaciones individuales por estado.

// Función helper para obtener Phaser cuando esté disponible
function getPhaserLib() {
  if (typeof window !== 'undefined' && window.Phaser) {
    return window.Phaser;
  }
  throw new Error('Phaser.js no está cargado. Asegúrate de incluir phaser.min.js antes que este módulo.');
}


const DEFAULT_ENEMIES = {
  monstruo: {
    walk:   { src: { type: 'sheet', path: 'assets/sprites/monstruo/walk.png',   fw: 40, fh: 40, frames: 6 },  anim: { start: 0, end: 7, frameRate: 1, repeat: -1 } },
    attack: { src: { type: 'sheet', path: 'assets/sprites/monstruo/attack.png', fw: 100, fh: 100, frames: 5 },  anim: { start: 0, end: 5, frameRate: 1, repeat: -1 } },
    death:  { src: { type: 'sheet', path: 'assets/sprites/monstruo/death.png',  fw: 100, fh: 100, frames: 6 },  anim: { start: 0, end: 5, frameRate: 1, repeat: 0  } },
  },
  demonio: {
    walk:   { src: { type: 'sheet', path: 'assets/sprites/demonio/walk.png',   fw: 100, fh: 100, frames: 6 },  anim: { start: 0, end: 5, frameRate: 1, repeat: -1 } },
    attack: { src: { type: 'sheet', path: 'assets/sprites/demonio/attack.png', fw: 100, fh: 100, frames: 4 },  anim: { start: 0, end: 3, frameRate: 1, repeat: -1 } },
    death:  { src: { type: 'sheet', path: 'assets/sprites/demonio/death.png',  fw: 100, fh: 100, frames: 6 },  anim: { start: 0, end: 5, frameRate: 1, repeat: 0  } },
  },
  genio: {
    walk:   { src: { type: 'sheet', path: 'assets/sprites/genio/walk.png',   fw: 40, fh: 40, frames: 6 },  anim: { start: 0, end: 5, frameRate: 1, repeat: -1 } },
    attack: { src: { type: 'sheet', path: 'assets/sprites/genio/attack.png', fw: 100, fh: 100, frames: 4 },  anim: { start: 0, end: 3, frameRate: 1, repeat: -1 } },
    death:  { src: { type: 'sheet', path: 'assets/sprites/genio/death.png',  fw: 100, fh: 100, frames: 6 },  anim: { start: 0, end: 5, frameRate: 1, repeat: 0  } },
  },
  dragon: {
    walk:   { src: { type: 'sheet', path: 'assets/sprites/dragon/walk.png',   fw: 50,  fh: 50, frames: 6 },  anim: { start: 0, end: 5, frameRate: 1, repeat: -1 } },
    attack: { src: { type: 'sheet', path: 'assets/sprites/dragon/attack.png', fw: 120, fh: 120, frames: 4 },  anim: { start: 0, end: 3, frameRate: 1, repeat: -1 } },
    death:  { src: { type: 'sheet', path: 'assets/sprites/dragon/death.png',  fw: 120, fh: 120, frames: 5 },  anim: { start: 0, end: 4, frameRate: 1, repeat: 0  } },
  },
  'mini-dragon': {
    walk:   { src: { type: 'sheet', path: 'assets/sprites/mini-dragon/walk.png',   fw: 70, fh: 70, frames: 5 },  anim: { start: 0, end: 5, frameRate: 1, repeat: -1 } },
    attack: { src: { type: 'sheet', path: 'assets/sprites/mini-dragon/attack.png', fw: 70, fh: 70, frames: 3 },  anim: { start: 0, end: 2, frameRate: 1, repeat: -1 } },
    death:  { src: { type: 'sheet', path: 'assets/sprites/mini-dragon/death.png',  fw: 70, fh: 70, frames: 4 },  anim: { start: 0, end: 3, frameRate: 1, repeat: 0  } },
  },
};

/** Packs adicionales que el usuario puede registrar en runtime (ej: idle/playing/feeding...) */
const EXTRA_PACKS = []; 
// Cada pack: { enemy: 'monstruo', sources: { state: {type, path, fw, fh, frames?} }, anims: [{key, start, end, frameRate, repeat}] }

/** Util */
const clampInt = (v, fallback=1) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// Longitud total de la ruta (suma de segmentos)
const pathTotalLength = (pts) => {
  let L = 0;
  for (let i = 0; i < pts.length - 1; i++) L += dist(pts[i], pts[i + 1]);
  return L;
};

// Punto en la ruta a cierta distancia 'offset' (px) desde el inicio
function pointAtDistance(pts, offset) {
  let d = offset;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const seg = dist(a, b);
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        segIndex: i,
        t,
        remaining: seg - d
      };
    }
    d -= seg;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, segIndex: pts.length - 2, t: 1, remaining: 0 };
}


/** ---------- ESCENA PRINCIPAL ---------- */
class MainScene extends getPhaserLib().Scene {
  constructor() {
    super('MainScene');
    this.pathsByName = {};         // { ruta1: [{x,y},...], ... }
    this.enemiesGroup = null;
    this._ready = false;
    this._registered = new Set();  // anim keys ya creadas
  }

  setPaths(pathsByName) {
    this.pathsByName = { ...(pathsByName || {}) };
  }

  preload() {
    // Fondo
    this.load.image('mapa', 'assets/maps/mapa1.jpg');

    // --- Carga assets de DEFAULT_ENEMIES ---
    for (const [enemy, states] of Object.entries(DEFAULT_ENEMIES)) {
      for (const [state, def] of Object.entries(states)) {
        const texKey = `${enemy}_${state}`;
        const src = def.src || {};
        if (src.type === 'sheet') {
          this.load.spritesheet(texKey, src.path, {
            frameWidth: clampInt(src.fw),
            frameHeight: clampInt(src.fh)
          });
        } else if (src.type === 'image') {
          this.load.image(texKey, src.path);
        }
      }
    }

    // --- Carga assets de EXTRA_PACKS ---
    for (const pack of EXTRA_PACKS) {
      const { enemy, sources } = pack;
      if (!enemy || !sources) continue;
      for (const [state, src] of Object.entries(sources)) {
        const texKey = `${enemy}_${state}`;
        if (src.type === 'sheet') {
          this.load.spritesheet(texKey, src.path, {
            frameWidth: clampInt(src.fw),
            frameHeight: clampInt(src.fh)
          });
        } else if (src.type === 'image') {
          this.load.image(texKey, src.path);
        }
      }
    }
  }

  create() {
    // Fondo ajustado
    const gw = this.scale.width, gh = this.scale.height;
    this.add.image(0, 0, 'mapa').setOrigin(0, 0).setDisplaySize(gw, gh);

    this.enemiesGroup = this.add.group();

    // Crear animaciones por defecto
    this._createDefaultAnims();
    // Crear animaciones adicionales definidas por el usuario
    this._createExtraAnims();

    this._ready = true;
  }

  /** Crea animaciones del bloque por defecto */
  _createDefaultAnims() {
    for (const [enemy, states] of Object.entries(DEFAULT_ENEMIES)) {
      for (const [state, def] of Object.entries(states)) {
        const animKey = `${enemy}_${state}`;
        if (this._registered.has(animKey)) continue;
        const src = def.src || {};
        const anim = def.anim || {};
        const end = Math.max((anim.end ?? (src.frames ? src.frames - 1 : 0)), 0);
        const start = Math.max(anim.start ?? 0, 0);
        const frameRate = anim.frameRate ?? 6;
        const repeat = anim.repeat ?? -1;

        if (src.type === 'sheet') {
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(`${enemy}_${state}`, { start, end }),
              frameRate,
              repeat
            });
          }
        } else if (src.type === 'image') {
          // Crear “animación” de 1 frame para API uniforme
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: [{ key: `${enemy}_${state}`, frame: 0 }],
              frameRate: 1,
              repeat: -1
            });
          }
        }
        this._registered.add(animKey);
      }
    }
  }

  /** Crea animaciones extra (por ejemplo: idle, playing, feeding, hunger...) */
  _createExtraAnims() {
    for (const pack of EXTRA_PACKS) {
      const { enemy, sources, anims } = pack;
      if (!enemy || !sources) continue;

      // 1) Garantizar que todas las sources existan como textura
      for (const [state, src] of Object.entries(sources)) {
        const texKey = `${enemy}_${state}`;
        // Si es image, creamos anim de 1 frame; si es sheet, con frames indicados
        const animDef = (anims || []).find(a => a.key === state);
        const start = Math.max(animDef?.start ?? 0, 0);
        const end = Math.max(animDef?.end ?? ((src.type === 'sheet' && src.frames) ? src.frames - 1 : 0), 0);
        const frameRate = animDef?.frameRate ?? 6;
        const repeat = animDef?.repeat ?? -1;
        const animKey = `${enemy}_${state}`;
        if (this._registered.has(animKey)) continue;

        if (src.type === 'sheet') {
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: this.anims.generateFrameNumbers(texKey, { start, end }),
              frameRate,
              repeat
            });
          }
        } else if (src.type === 'image') {
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: [{ key: texKey, frame: 0 }],
              frameRate: 1,
              repeat: -1
            });
          }
        }
        this._registered.add(animKey);
      }
    }
  }

  /**
   * Spawnea un enemigo siguiendo una ruta, reproduciendo una animación por estado.
   * @param {string} enemy  (ej: 'monstruo')
   * @param {string} routeName ('ruta1' | 'ruta2' | ...)
   * @param {object} opts { speed(px/s)=80, delay(ms)=0, scale=1, autoRotate=true, action='walk', onArrive:fn }
   */
  spawnEnemyOnPath(enemy, routeName, opts = {}) {
    const points = this.pathsByName?.[routeName];
    if (!points || points.length < 2) {
      throw new Error(`[Phaser] Ruta inválida: "${routeName}"`);
    }

    const speed = (opts.speed ?? 80);
    const delay = (opts.delay ?? 0);
    const scale = (opts.scale ?? 1);
    const autoRotate = (opts.autoRotate ?? true);
    const action = (opts.action ?? 'walk');

  const rawOffset = Math.max(0, opts.startOffset || 0);
  const totalLen = pathTotalLength(points);
  const clampedOffset = Math.min(rawOffset, Math.max(0, totalLen - 1));
  const startPos = pointAtDistance(points, clampedOffset);

  const animKey = `${enemy}_${action}`;

    // Sprite en el inicio
    const spr = this.add.sprite(startPos.x, startPos.y, animKey, 0).setOrigin(0.5, 0.5);
    spr.setScale(scale);
    spr.play(animKey);
    spr.setData('enemy', enemy);
    spr.setData('state', action);
    this.enemiesGroup.add(spr);

   // Usar add en lugar de createTimeline para compatibilidad
  let currentDelay = delay;

  // Soluci´n simple: mover directamente al final de la ruta
  const endPoint = points[points.length - 1];
  const totalDistance = pathTotalLength(points);
  const totalDuration = Math.max((totalDistance / speed) * 1000, 1000);
  
  this.tweens.add({
    targets: spr,
    x: endPoint.x,
    y: endPoint.y,
    duration: totalDuration,
    ease: 'Linear',
    delay: currentDelay,
    onComplete: () => {
      if (typeof opts.onArrive === 'function') opts.onArrive(spr);
      else spr.anims.stop();
    }
  });

  return { sprite: spr };
}

  /**
   * Spawner simple en posición fija (por si quieres estados tipo "idle" en UI).
   */
  spawnEnemy(enemy, state = 'walk', x = 120, y = 220, scale = 1) {
    const animKey = `${enemy}_${state}`;
    const spr = this.add.sprite(x, y, animKey).setOrigin(0.5).setScale(scale);
    spr.play(animKey);
    spr.setData('enemy', enemy);
    spr.setData('state', state);
    this.enemiesGroup.add(spr);
    return spr;
  }

  /** Cambia la animación/estado de un sprite ya creado */
  playState(sprite, enemy, state) {
    const key = `${enemy}_${state}`;
    if (this.anims.exists(key)) {
      sprite.play(key, true);
      sprite.setData('state', state);
      return true;
    }
    console.warn(`[Phaser] Animación no encontrada: ${key}`);
    return false;
  }
}

/** ---------- API PÚBLICA ---------- */

/** Inicializa Phaser y retorna Game con `game.ready` (Promise) */
export function initPhaser(containerId = 'game-area', width = 800, height = 600) {
  const PhaserLib = getPhaserLib();
  let resolveReady;
  const ready = new Promise(res => (resolveReady = res));
  const game = new PhaserLib.Game({
    type: PhaserLib.AUTO,
    parent: containerId,
    width,
    height,
    backgroundColor: '#000000',
    scene: [MainScene],
    physics: { default: 'arcade' },
    callbacks: { postBoot: () => resolveReady() }
  });
  game.ready = ready;
  return game;
}

/** Registra rutas en la escena */
export async function setPaths(game, pathsByName) {
  await game.ready;
  const scene = game.scene.keys['MainScene'];
  scene.setPaths(pathsByName);
}

export function registerAnimPack(enemy, { sources, anims }) {
  EXTRA_PACKS.push({ enemy, sources, anims });
}

/** Spawnea un enemigo siguiendo una ruta */
export async function spawnEnemyOnPath(game, enemy, routeName, opts = {}) {
  await game.ready;
  const scene = game.scene.keys['MainScene'];
  return scene.spawnEnemyOnPath(enemy, routeName, opts);
}

/** Spawner simple en posición fija */
export async function spawnEnemy(game, enemy = 'monstruo', state = 'walk', x = 120, y = 220, scale = 1) {
  await game.ready;
  const scene = game.scene.keys['MainScene'];
  return scene.spawnEnemy(enemy, state, x, y, scale);
}

/** Cambia el estado/animación de un sprite ya creado */
export async function playState(game, sprite, enemy, state) {
  await game.ready;
  const scene = game.scene.keys['MainScene'];
  return scene.playState(sprite, enemy, state);
}
