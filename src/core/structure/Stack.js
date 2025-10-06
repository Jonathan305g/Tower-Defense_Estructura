// src/core/structures/Stack.js
class Stack {
  constructor() {
    this.items = [];
  }

  // Agregar una acción a la pila
  push(element) {
    this.items.push(element);
  }

  // Remover la última acción
  pop() {
    if (this.isEmpty()) {
      return "Stack is empty";
    }
    return this.items.pop();
  }

  // Ver la última acción sin removerla
  peek() {
    if (this.isEmpty()) {
      return "Stack is empty";
    }
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }
}

export default Stack;