// src/core/PathManager.js

/**
 * Administra las rutas del juego (secuencias de puntos {x,y}).
 * - Incluye rutas por defecto: ruta1 y ruta2 (según tus coordenadas).
 * - Provee utilidades para obtener/exportar rutas.
 * - Mantiene compatibilidad con render 2D clásico vía drawPaths(ctx).
 */
class PathManager {
  constructor() {
    /** @type {Map<string, Array<{x:number,y:number}>>} */
    this.paths = new Map();

    /** Ruta actualmente activa (por defecto 'ruta1') */
    this.current = 'ruta1';

    this.addDefaultPaths();
  }

  /**
   * Agrega o reemplaza una ruta.
   * @param {string} name
   * @param {Array<{x:number,y:number}>} points
   */
  addPath(name, points) {
    if (!Array.isArray(points) || points.length < 2) {
      console.warn(`[PathManager] La ruta "${name}" requiere al menos 2 puntos.`);
      return;
    }
    // Clon superficial para evitar mutaciones accidentales externas
    this.paths.set(name, points.map(p => ({ x: p.x, y: p.y })));
  }

  /**
   * Obtiene la ruta por nombre.
   * @param {string} name
   * @returns {Array<{x:number,y:number}>|undefined}
   */
  getPath(name) {
    const pts = this.paths.get(name);
    return pts ? pts.map(p => ({ x: p.x, y: p.y })) : undefined;
  }

  /**
   * Establece la ruta actual si existe.
   * @param {string} name
   */
  setCurrent(name) {
    if (this.paths.has(name)) this.current = name;
    else console.warn(`[PathManager] No existe la ruta "${name}".`);
  }

  /**
   * Devuelve la ruta actual, o la primera disponible, o un array vacío.
   * @returns {Array<{x:number,y:number}>}
   */
  getCurrentPath() {
    const cur = this.getPath(this.current);
    if (cur && cur.length >= 2) return cur;

    const names = this.getAllPathNames();
    if (names.length > 0) {
      const first = this.getPath(names[0]);
      if (first && first.length >= 2) return first;
    }
    return [];
  }

  /**
   * Nombres de todas las rutas.
   * @returns {string[]}
   */
  getAllPathNames() {
    return Array.from(this.paths.keys());
  }

  /**
   * Exporta todas las rutas como objeto plano { nombre: puntos[] }.
   * Útil para pasarlo a Phaser: setPaths(game, pm.exportPaths()).
   * @returns {Record<string, Array<{x:number,y:number}>>}
   */
  exportPaths() {
    const out = {};
    for (const [name, pts] of this.paths.entries()) {
      out[name] = pts.map(p => ({ x: p.x, y: p.y }));
    }
    return out;
  }

  /**
   * Rutas por defecto (según tus coordenadas confirmadas).
   * Ruta 1:
   * (0,130) → (101,123) → (240,370) → (405,425) → (526,347) → (610,245) → (716,226)
   * Ruta 2:
   * (0,130) → (101,123) → (203,175) → (425,128) → (610,245) → (716,226)
   */
  addDefaultPaths() {
    this.addPath('ruta1', [
      { x: 0,   y: 130 },
      { x: 175, y: 123 },
      { x: 240, y: 350 },
      { x: 400, y: 455 },
      { x: 600, y: 347 },
      { x: 660, y: 245 },
      { x: 716, y: 226 }
    ]);

    this.addPath('ruta2', [
      { x: 0,   y: 130 },
      { x: 101, y: 123 },
      { x: 203, y: 175 },
      { x: 425, y: 128 },
      { x: 610, y: 245 },
      { x: 716, y: 226 }
    ]);
  }

  /**
   * Dibuja las rutas sobre un contexto 2D (compatibilidad con motor previo).
   * Ignorado por Phaser (que usa su propio canvas), pero útil para debug.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawPaths(ctx) {
    if (!ctx) return;

    ctx.save();
    for (const [, pts] of this.paths.entries()) {
      if (!pts || pts.length < 2) continue;

      // Camino principal
      ctx.beginPath();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Borde/contraste
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#5c3a1a';
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

export default PathManager;
