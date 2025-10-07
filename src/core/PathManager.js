class PathManager {
    constructor() {
        this.paths = new Map();
        this.currentPath = null;
        this.initializePaths();
    }

    initializePaths() {
        this.addPath('basic', [
            { x: -50, y: 300 },
            { x: 100, y: 300 },
            { x: 100, y: 150 },
            { x: 300, y: 150 },
            { x: 300, y: 400 },
            { x: 500, y: 400 },
            { x: 500, y: 250 },
            { x: 700, y: 250 },
            { x: 700, y: 450 },
            { x: 850, y: 450 }
        ]);

        this.currentPath = this.getPath('basic');
    }

    addPath(name, waypoints) {
        this.paths.set(name, waypoints);
    }

    getPath(name) {
        return this.paths.get(name) || this.paths.get('basic');
    }

    setCurrentPath(name) {
        this.currentPath = this.getPath(name);
        return this.currentPath;
    }

    getCurrentPath() {
        return this.currentPath;
    }

    drawPath(ctx) {
        if (!this.currentPath || this.currentPath.length < 2) return;

        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 40;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        
        for (let i = 1; i < this.currentPath.length; i++) {
            ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        
        ctx.stroke();

        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

export default PathManager;