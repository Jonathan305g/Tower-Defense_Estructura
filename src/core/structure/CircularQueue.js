// src/core/structures/CircularQueue.js
class CircularQueue {
  constructor(size) {
    this.size = size;
    this.queue = new Array(size);
    this.front = -1;
    this.rear = -1;
  }

  enqueue(element) {
    if ((this.rear + 1) % this.size === this.front) {
      console.log("Queue is full!");
      return;
    }

    if (this.front === -1) {
      this.front = 0;
    }

    this.rear = (this.rear + 1) % this.size;
    this.queue[this.rear] = element;
  }

  dequeue() {
    if (this.front === -1) {
      console.log("Queue is empty!");
      return;
    }

    const dequeuedElement = this.queue[this.front];
    
    if (this.front === this.rear) {
      this.front = -1;
      this.rear = -1;
    } else {
      this.front = (this.front + 1) % this.size;
    }

    return dequeuedElement;
  }

  // Para actualizar HP de todos los Cozys en la cola
  updateAll(callback) {
    if (this.front === -1) return;
    
    let i = this.front;
    while (i !== this.rear) {
      callback(this.queue[i]);
      i = (i + 1) % this.size;
    }
    callback(this.queue[this.rear]);
  }
}