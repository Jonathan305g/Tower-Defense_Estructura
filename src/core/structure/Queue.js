// src/core/structures/Queue.js
class Queue {
  constructor() {
    this.items = [];
  }

  // Agregar un Cozy a la cola
  enqueue(element) {
    this.items.push(element);
  }

  // Remover el primer Cozy de la cola
  dequeue() {
    if (this.isEmpty()) {
      return "Queue is empty";
    }
    return this.items.shift();
  }

  // Ver el primer Cozy sin removerlo
  peek() {
    if (this.isEmpty()) {
      return "Queue is empty";
    }
    return this.items[0];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  print() {
    console.log(this.items.join(" -> "));
  }
}

export default Queue;