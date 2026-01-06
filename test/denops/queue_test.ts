import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { AsyncQueue } from "../../denops/read-text/async/queue.ts";

describe("AsyncQueue - basic operations", () => {
  it("should push and pull items in order", async () => {
    const queue = new AsyncQueue<number>();
    queue.push(1);
    queue.push(2);
    queue.push(3);

    assertEquals(await queue.pull(), 1);
    assertEquals(await queue.pull(), 2);
    assertEquals(await queue.pull(), 3);
  });

  it("should return size correctly", () => {
    const queue = new AsyncQueue<string>();
    assertEquals(queue.size(), 0);
    queue.push("a");
    assertEquals(queue.size(), 1);
    queue.push("b");
    assertEquals(queue.size(), 2);
  });

  it("should decrease size on pull", async () => {
    const queue = new AsyncQueue<number>();
    queue.push(1);
    queue.push(2);
    assertEquals(queue.size(), 2);

    await queue.pull();
    assertEquals(queue.size(), 1);

    await queue.pull();
    assertEquals(queue.size(), 0);
  });
});

describe("AsyncQueue - async waiting", () => {
  it("should wait for item when queue is empty", async () => {
    const queue = new AsyncQueue<number>();

    const pullPromise = queue.pull();
    setTimeout(() => queue.push(42), 10);

    assertEquals(await pullPromise, 42);
  });

  it("should resolve multiple waiting consumers in order", async () => {
    const queue = new AsyncQueue<number>();

    const pull1 = queue.pull();
    const pull2 = queue.pull();
    const pull3 = queue.pull();

    queue.push(1);
    queue.push(2);
    queue.push(3);

    assertEquals(await pull1, 1);
    assertEquals(await pull2, 2);
    assertEquals(await pull3, 3);
  });

  it("should handle interleaved push and pull", async () => {
    const queue = new AsyncQueue<string>();

    queue.push("first");
    assertEquals(await queue.pull(), "first");

    const waitingPull = queue.pull();
    queue.push("second");
    assertEquals(await waitingPull, "second");
  });
});

describe("AsyncQueue - close behavior", () => {
  it("should return null when closed and empty", async () => {
    const queue = new AsyncQueue<number>();
    queue.close();

    assertEquals(await queue.pull(), null);
    assertEquals(queue.isClosed(), true);
  });

  it("should resolve waiting consumers with null on close", async () => {
    const queue = new AsyncQueue<number>();

    const pullPromise = queue.pull();
    queue.close();

    assertEquals(await pullPromise, null);
  });

  it("should throw when pushing to closed queue", () => {
    const queue = new AsyncQueue<number>();
    queue.close();

    try {
      queue.push(1);
      throw new Error("Expected error");
    } catch (e) {
      assertEquals((e as Error).message, "Cannot push to closed queue");
    }
  });

  it("should allow pulling remaining items after close", async () => {
    const queue = new AsyncQueue<number>();
    queue.push(1);
    queue.push(2);
    queue.close();

    assertEquals(await queue.pull(), 1);
    assertEquals(await queue.pull(), 2);
    assertEquals(await queue.pull(), null);
  });

  it("should resolve multiple waiting consumers with null on close", async () => {
    const queue = new AsyncQueue<number>();

    const pull1 = queue.pull();
    const pull2 = queue.pull();
    queue.close();

    assertEquals(await pull1, null);
    assertEquals(await pull2, null);
  });
});

describe("AsyncQueue - abort behavior", () => {
  it("should set error and close queue on abort", () => {
    const queue = new AsyncQueue<number>();
    const error = new Error("Test abort");

    queue.abort(error);

    assertEquals(queue.isClosed(), true);
    assertEquals(queue.hasError(), true);
    assertEquals(queue.getError(), error);
  });

  it("should throw error on pull after abort", async () => {
    const queue = new AsyncQueue<number>();
    const error = new Error("Abort error");

    queue.abort(error);

    await assertRejects(
      () => queue.pull(),
      Error,
      "Abort error"
    );
  });

  it("should wake waiting consumers on abort", async () => {
    const queue = new AsyncQueue<number>();

    const pullPromise = queue.pull();
    queue.abort(new Error("Pipeline aborted"));

    assertEquals(await pullPromise, null);
    assertEquals(queue.hasError(), true);
  });

  it("should not have error before abort", () => {
    const queue = new AsyncQueue<number>();

    assertEquals(queue.hasError(), false);
    assertEquals(queue.getError(), null);
  });
});

describe("AsyncQueue - edge cases", () => {
  it("should handle empty queue state correctly", () => {
    const queue = new AsyncQueue<number>();

    assertEquals(queue.size(), 0);
    assertEquals(queue.isClosed(), false);
    assertEquals(queue.hasError(), false);
  });

  it("should handle rapid push/pull cycles", async () => {
    const queue = new AsyncQueue<number>();

    for (let i = 0; i < 100; i++) {
      queue.push(i);
      const result = await queue.pull();
      assertEquals(result, i);
    }

    assertEquals(queue.size(), 0);
  });

  it("should handle different types", async () => {
    const stringQueue = new AsyncQueue<string>();
    stringQueue.push("hello");
    assertEquals(await stringQueue.pull(), "hello");

    const objectQueue = new AsyncQueue<{ id: number }>();
    objectQueue.push({ id: 42 });
    assertEquals(await objectQueue.pull(), { id: 42 });

    const arrayQueue = new AsyncQueue<number[]>();
    arrayQueue.push([1, 2, 3]);
    assertEquals(await arrayQueue.pull(), [1, 2, 3]);
  });
});
