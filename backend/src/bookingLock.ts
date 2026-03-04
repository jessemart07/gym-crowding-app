export class BookingLock {
  private chains = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(key) ?? Promise.resolve();

    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const chain = previous.then(() => current);
    this.chains.set(key, chain);
    await previous;

    try {
      return await work();
    } finally {
      release();
      if (this.chains.get(key) === chain) {
        this.chains.delete(key);
      }
    }
  }
}
