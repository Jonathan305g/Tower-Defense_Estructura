import Tower from '../entities/Tower.js';

class TowerManager {
    constructor() {
        /** @type {Tower[]} */
        this.towers = [];
    }

    /**
     * Valida si se puede colocar una torre en (x,y).
     * Evita colocar sobre otras torres o sobre el path (simple aproximación: distancia minima).
     */
    canPlaceAt(x, y, pathManager, minDistanceFromPath = 30) {
        // No sobre otras torres
        for (const t of this.towers) {
            const dx = t.x - x;
            const dy = t.y - y;
            if (dx * dx + dy * dy <= (32 * 32)) return false;
        }

        // No sobre la ruta (comprueba distancia punto-segmento para cada segmento)
        const path = pathManager.getCurrentPath();
        if (path && path.length >= 2) {
            for (let i = 0; i < path.length - 1; i++) {
                const a = path[i], b = path[i + 1];
                const d = this._pointToSegmentDistance({ x, y }, a, b);
                if (d < minDistanceFromPath) return false;
            }
        }

        return true;
    }

    _pointToSegmentDistance(p, a, b) {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const wx = p.x - a.x;
        const wy = p.y - a.y;
        const c1 = vx * wx + vy * wy;
        if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
        const c2 = vx * vx + vy * vy;
        if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
        const t = c1 / c2;
        const projx = a.x + t * vx;
        const projy = a.y + t * vy;
        return Math.hypot(p.x - projx, p.y - projy);
    }

    placeTower(towerData) {
        const tower = new Tower({
            x: towerData.x,
            y: towerData.y,
            type: towerData.type || 'basic',
            cost: towerData.cost || 50,
            level: towerData.level || 1,
            assetLoader: towerData.assetLoader
        });
        this.towers.push(tower);
        return tower;
    }

    removeTower(towerInstance) {
        this.towers = this.towers.filter(t => t.id !== towerInstance.id);
    }

    upgradeTower(towerInstance) {
        towerInstance.upgrade();
    }

    downgradeTower(towerInstance, prevLevel) {
        towerInstance.level = prevLevel;
    }

    getTowers() {
        return this.towers;
    }
}

export default TowerManager;