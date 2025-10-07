class AssetLoader {
    constructor() {
        this.images = new Map();
        this.loadedCount = 0;
        this.totalCount = 0;
        this.isReady = false;
    }

    loadImage(name, src) {
        return new Promise((resolve, reject) => {
            this.totalCount++;
            const img = new Image();
            
            img.onload = () => {
                this.images.set(name, img);
                this.loadedCount++;
                console.log(`✅ Cargado: ${name}`);
                resolve(img);
            };
            
            img.onerror = () => {
                console.error(`❌ Error cargando: ${name}`);
                reject(new Error(`No se pudo cargar: ${src}`));
            };
            
            img.src = src;
        });
    }

    async loadGameAssets() {
        console.log("🎮 Cargando assets del Tower Defense...");
        
        const enemies = ['monstruo', 'demonio', 'genio', 'dragon', 'mini-dragon'];
        const actions = ['walk', 'attack', 'death']; // Cambiado de 'move' a 'walk'
        
        const loadPromises = [];

        // Cargar mapa
        loadPromises.push(this.loadImage('mapa', '../assets/maps/mapa1.jpg'));

        // Cargar sprites de ENEMIGOS (Cozy)
        for (const enemy of enemies) {
            for (const action of actions) {
                const imageName = `enemy_${enemy}_${action}`;
                const imagePath = `../assets/sprites/${enemy}/${action}.png`;
                loadPromises.push(this.loadImage(imageName, imagePath));
            }
        }

        await Promise.all(loadPromises);
        this.isReady = true;
        console.log("🎉 ¡Todos los assets cargados!");
    }

    getImage(name) {
        return this.images.get(name);
    }

    getEnemySprite(enemyType, action) {
        return this.getImage(`enemy_${enemyType}_${action}`);
    }
}

export default AssetLoader;