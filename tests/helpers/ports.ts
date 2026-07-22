import assert from "node:assert/strict";
import net from "node:net";

export async function occupyConsecutivePorts(
  count: number,
): Promise<{ servers: net.Server[]; start: number }> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const servers: net.Server[] = [];
    try {
      const first = await listenOnPort(0);
      servers.push(first);
      const address = first.address();
      assert.ok(address && typeof address !== "string");
      if (address.port + count > 65_535) {
        await closeServers(servers);
        continue;
      }
      for (let offset = 1; offset <= count; offset += 1) {
        servers.push(await listenOnPort(address.port + offset));
      }
      const available = servers.pop();
      assert.ok(available);
      await closeServer(available);
      return { servers, start: address.port };
    } catch {
      await closeServers(servers);
    }
  }
  throw new Error("could not reserve consecutive test ports");
}

export async function closeServers(
  servers: readonly net.Server[],
): Promise<void> {
  await Promise.all(servers.map(closeServer));
}

function listenOnPort(port: number): Promise<net.Server> {
  const server = net.createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeAllListeners("error");
      resolve(server);
    });
  });
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
