class TowerManager {
    constructor() {
        this.towers = [];
    }

    placeTower(towerData) {
        // Crea una torre y la agrega al array
        const tower = {
            ...towerData,
            level: 1,
            id: Date.now() + Math.random()
        };
        this.towers.push(tower);
        return tower;
    }

    removeTower(towerInstance) {
        this.towers = this.towers.filter(t => t.id !== towerInstance.id);
    }

    upgradeTower(towerInstance) {
        towerInstance.level += 1;
    }

    downgradeTower(towerInstance, prevLevel) {
        towerInstance.level = prevLevel;
    }

    getTowers() {
        return this.towers;
    }
}

export default TowerManager;