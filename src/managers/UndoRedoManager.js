// src/managers/UndoRedoManager.js
class UndoRedoManager {
  constructor() {
    this.undoStack = new Stack(); // Acciones realizadas
    this.redoStack = new Stack(); // Acciones deshechas
  }

  placeTower(tower) {
    // Lógica de colocación
    this.undoStack.push({
      type: 'PLACE_TOWER',
      tower: tower
    });
    this.redoStack = new Stack(); // Limpiar redo al hacer nueva acción
  }

  undo() {
    if (!this.undoStack.isEmpty()) {
      const action = this.undoStack.pop();
      this.redoStack.push(action);
      // Revertir la acción
      if (action.type === 'PLACE_TOWER') {
        // Remover la torre del juego
        gameWorld.removeTower(action.tower);
      }
    }
  }

  redo() {
    if (!this.redoStack.isEmpty()) {
      const action = this.redoStack.pop();
      this.undoStack.push(action);
      // Reaplicar la acción
      if (action.type === 'PLACE_TOWER') {
        gameWorld.placeTower(action.tower);
      }
    }
  }
}