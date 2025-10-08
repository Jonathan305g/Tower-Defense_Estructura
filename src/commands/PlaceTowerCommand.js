import Command from './Command.js';

class PlaceTowerCommand extends Command {
    constructor(towerManager, towerData) {
        super();
        this.towerManager = towerManager;
        this.towerData = towerData;
        this.towerInstance = null;
    }

    execute() {
        this.towerInstance = this.towerManager.placeTower(this.towerData);
    }

    undo() {
        if (this.towerInstance) {
            this.towerManager.removeTower(this.towerInstance);
        }
    }
}

export default PlaceTowerCommand;