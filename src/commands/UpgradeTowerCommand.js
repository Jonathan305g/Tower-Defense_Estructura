import Command from './Command.js';

class UpgradeTowerCommand extends Command {
    constructor(towerManager, towerInstance) {
        super();
        this.towerManager = towerManager;
        this.towerInstance = towerInstance;
        this.prevLevel = towerInstance.level;
    }

    execute() {
        this.towerManager.upgradeTower(this.towerInstance);
    }

    undo() {
        this.towerManager.downgradeTower(this.towerInstance, this.prevLevel);
    }
}

export default UpgradeTowerCommand;