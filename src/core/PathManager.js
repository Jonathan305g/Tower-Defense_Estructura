class PathManager {
    constructor() {
        this.paths = new Map();
        this.addDefaultPaths();
    }

    addPath(name, points) {
        this.paths.set(name, points);
    }

    getPath(name) {
        return this.paths.get(name);
    }

    getAllPathNames() {
        return Array.from(this.paths.keys());
    }

    addDefaultPaths() {
        // Ruta 1 (mapa1) — usando las coordenadas provistas por el usuario
        this.addPath('ruta1', [
            { x: 0,   y: 130 }, // Inicio
            { x: 101, y: 123 },
            { x: 240, y: 370 },
            { x: 405, y: 425 },
            { x: 526, y: 347 },
            { x: 610, y: 245 },
            { x: 716, y: 226 }  // Fin
        ]);

        // Ruta 2 (mapa1) — usando las coordenadas provistas por el usuario
        this.addPath('ruta2', [
            { x: 0,   y: 130 }, // Inicio
            { x: 101, y: 123 },
            { x: 203, y: 175 },
            { x: 425, y: 128 },
            { x: 610, y: 245 },
            { x: 716, y: 226 }  // Fin
        ]);
    }

    drawPaths(ctx) {
        ctx.save();
        for (const [name, pts] of this.paths.entries()) {
            // Camino: línea gruesa
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

            // Borde
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#5c3a1a';
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();

            // (Opcional para debug) Puntos
            // for (const p of pts) {
            //   ctx.beginPath();
            //   ctx.fillStyle = '#333';
            //   ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            //   ctx.fill();
            // }
        }
        ctx.restore();
    }
}

export default PathManager;
