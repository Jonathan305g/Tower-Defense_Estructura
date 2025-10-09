// js/core/AssetLoader.js
class AssetLoader {
  constructor() {
    this.images = new Map();
    this.loadedCount = 0;
    this.totalCount = 0;
    this.isReady = false;
  }

  // Resuelve una ruta respecto del documento actual (game.html) o del módulo
  resolve(src) {
    try {
      return new URL(src, document.baseURI).href;
    } catch {
      return src;
    }
  }

  loadImage(name, src) {
    return new Promise((resolve, reject) => {
      this.totalCount++;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        this.images.set(name, img);
        this.loadedCount++;
        console.log(`✅ Cargado: ${name}`);
        resolve(img);
      };
      img.onerror = () => {
        console.error(`❌ Error cargando: ${name} (${src})`);
        reject(new Error(`No se pudo cargar: ${src}`));
      };
      img.src = this.resolve(src);
    });
  }

  async loadGameAssets() {
    console.log("🎮 Cargando assets del Tower Defense...");

    const enemies = ["monstruo", "demonio", "genio", "dragon", "mini-dragon"];
    const actions = ["walk", "attack", "death"];

    const loadPromises = [];

    // ---- Fallbacks para el mapa (elige el que exista en tu proyecto) ----
    // Prioridad: ./assets/...  ->  ../assets/...  ->  /assets/...
    const mapaCandidatos = [
      "./assets/maps/mapa1.jpg",
      "../assets/maps/mapa1.jpg",
      "/assets/maps/mapa1.jpg",
    ];

    // Cargamos el primero que funcione
    let mapaCargado = false;
    for (const ruta of mapaCandidatos) {
      try {
        await this.loadImage("mapa", ruta);
        mapaCargado = true;
        break;
      } catch (e) {
        // intenta la siguiente ruta
      }
    }
    if (!mapaCargado) {
      throw new Error("No se pudo cargar mapa1.jpg. Verifica su ubicación.");
    }

    // Sprites de TORRES (usando rutas y nombres correctos)
    const towerCandidatos = [
      { name: "basic_tower", paths: ["./assets/torres/torresSimples/TORRESIMPLE.png", "../assets/torres/torresSimples/TORRESIMPLE.png"] },
      { name: "advanced_tower", paths: ["./assets/torres/torresSimples/TorreBuena.png", "../assets/torres/torresSimples/TorreBuena.png"] },
      { name: "rapid_tower", paths: ["./assets/torres/torresSimples/torreMedio.png", "../assets/torres/torresSimples/torreMedio.png"] }
    ];

    for (const tower of towerCandidatos) {
      let cargada = false;
      for (const ruta of tower.paths) {
        try {
          await this.loadImage(tower.name, ruta);
          cargada = true;
          console.log(`✅ Torre cargada: ${tower.name}`);
          break;
        } catch (e) {
          // intenta la siguiente ruta o usa fallback
        }
      }
      if (!cargada) {
        console.log(`⚠️ Torre ${tower.name} no encontrada - usando fallback visual`);
      }
    }

    // Sprites de ENEMIGOS (mantengo tu convención)
    for (const enemy of enemies) {
      for (const action of actions) {
        const imageName = `enemy_${enemy}_${action}`;
        const imagePath = `./assets/sprites/${enemy}/${action}.png`;
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

  getTowerSprite(towerType) {
    const typeMap = {
      'basic': 'basic_tower',
      'rapid': 'rapid_tower', 
      'powerful': 'advanced_tower'
    };
    const imageName = typeMap[towerType] || 'basic_tower';
    const image = this.getImage(imageName);
    // Retorna null si la imagen no existe para activar fallback
    return image || null;
  }
}

export default AssetLoader;
