import Command from './Command.js';

class PlaceTowerCommand extends Command {
    constructor(towerManager, towerData, gameEngine) {
        super();
        this.towerManager = towerManager;
        this.towerData = towerData;
        this.gameEngine = gameEngine; // Referencia para manejar dinero
        this.towerInstance = null;
        this.cost = towerData.cost || 0; // Guardar el costo
        this.wasFirstExecution = true; // Para saber si es primera vez o redo
    }

    execute() {
        // Si es redo (no primera ejecución), cobrar dinero
        if (!this.wasFirstExecution) {
            if (this.gameEngine.gold >= this.cost) {
                this.gameEngine.gold -= this.cost;
                console.log(`💰 Redo: Cobrado ${this.cost} oro (Oro actual: ${this.gameEngine.gold})`);
            } else {
                console.log("❌ No hay suficiente oro para rehacer la torre");
                return; // No ejecutar si no hay dinero
            }
        }
        
        this.towerInstance = this.towerManager.placeTower(this.towerData);
        this.wasFirstExecution = false;
        
        if (this.gameEngine.updateUI) {
            this.gameEngine.updateUI();
        }
    }

    undo() {
        if (this.towerInstance) {
            this.towerManager.removeTower(this.towerInstance);
            
            // Devolver dinero
            this.gameEngine.gold += this.cost;
            console.log(`💰 Undo: Devuelto ${this.cost} oro (Oro actual: ${this.gameEngine.gold})`);
            
            if (this.gameEngine.updateUI) {
                this.gameEngine.updateUI();
            }
        }
    }
}

export default PlaceTowerCommand;