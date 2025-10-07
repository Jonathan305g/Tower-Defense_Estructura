import Stack from '../core/structures/Stack.js';

class UndoRedoManager {
    constructor() {
        this.undoStack = new Stack();
        this.redoStack = new Stack();
    }

    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = new Stack(); // Limpiar redo stack al hacer nueva acción
    }

    undo() {
        if (!this.undoStack.isEmpty()) {
            const command = this.undoStack.pop();
            command.undo();
            this.redoStack.push(command);
            return true;
        }
        return false;
    }

    redo() {
        if (!this.redoStack.isEmpty()) {
            const command = this.redoStack.pop();
            command.execute();
            this.undoStack.push(command);
            return true;
        }
        return false;
    }

    canUndo() {
        return !this.undoStack.isEmpty();
    }

    canRedo() {
        return !this.redoStack.isEmpty();
    }
}

export default UndoRedoManager;