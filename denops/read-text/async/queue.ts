// Async queue for producer-consumer pattern

export class AsyncQueue<T> {
  private items: T[] = [];
  private resolvers: Array<(item: T | null) => void> = [];
  private closed = false;
  private error: Error | null = null;

  // Producer: Add item to queue
  push(item: T): void {
    if (this.closed) {
      throw new Error("Cannot push to closed queue");
    }

    if (this.resolvers.length > 0) {
      // Consumer is waiting, resolve immediately
      const resolver = this.resolvers.shift()!;
      resolver(item);
    } else {
      // No consumer waiting, buffer the item
      this.items.push(item);
    }
  }

  // Consumer: Pull item from queue (async, waits if empty)
  async pull(): Promise<T | null> {
    if (this.error) {
      throw this.error;
    }

    if (this.items.length > 0) {
      return this.items.shift()!;
    }

    if (this.closed) {
      return null; // Signal completion
    }

    // Wait for next item
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  // Signal completion (no more items will be added)
  close(): void {
    this.closed = true;
    // Resolve all waiting consumers with null
    for (const resolver of this.resolvers) {
      resolver(null);
    }
    this.resolvers = [];
  }

  // Signal error condition
  abort(error: Error): void {
    this.error = error;
    this.closed = true;
    // Wake up waiting consumers so they can throw
    for (const resolver of this.resolvers) {
      resolver(null);
    }
    this.resolvers = [];
  }

  isClosed(): boolean {
    return this.closed;
  }

  hasError(): boolean {
    return this.error !== null;
  }

  getError(): Error | null {
    return this.error;
  }

  size(): number {
    return this.items.length;
  }
}
