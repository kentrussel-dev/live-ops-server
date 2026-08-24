import { GameServer } from '../models/GameServer';
import { getIO } from '../socket';

let simulationInterval: NodeJS.Timeout | null = null;

/**
 * Simulates realistic real-time telemetry fluctuations (CCU, ping, CPU, memory, bandwidth, tick rate)
 * across the server fleet every 12 seconds.
 */
export function startTelemetrySimulator(intervalMs: number = 12000): void {
  if (simulationInterval) return;

  console.log(`[Telemetry Simulator] Started background fleet simulation (interval: ${intervalMs / 1000}s).`);

  simulationInterval = setInterval(async () => {
    try {
      const servers = await GameServer.find({});
      if (!servers || servers.length === 0) return;

      const updatedServers = await Promise.all(
        servers.map(async (server) => {
          if (server.status === 'offline') {
            server.currentPlayers = 0;
            server.pingMs = 0;
            server.cpuUsagePct = 0;
            server.memoryUsagePct = 0;
            server.bandwidthMbps = 0;
            server.lastHeartbeat = new Date();
            await server.save();
            return server.toObject();
          }

          if (server.status === 'maintenance') {
            server.currentPlayers = 0;
            server.pingMs = Math.max(5, Math.min(20, Math.round(server.pingMs || 10)));
            server.cpuUsagePct = 5.0;
            server.memoryUsagePct = 12.0;
            server.bandwidthMbps = 0.5;
            server.lastHeartbeat = new Date();
            await server.save();
            return server.toObject();
          }

          if (server.status === 'draining') {
            // Steadily reduce player count
            const reduction = Math.floor(Math.random() * 15) + 5;
            server.currentPlayers = Math.max(0, server.currentPlayers - reduction);
            server.pingMs = Math.max(12, Math.min(100, (server.pingMs || 25) + (Math.floor(Math.random() * 5) - 2)));
            server.cpuUsagePct = parseFloat(Math.max(5, Math.min(80, (server.cpuUsagePct || 30) + (Math.random() * 4 - 2))).toFixed(1));
            server.memoryUsagePct = parseFloat(Math.max(10, Math.min(85, (server.memoryUsagePct || 40) + (Math.random() * 2 - 1))).toFixed(1));
            server.tickRateHz = parseFloat((59.8 + Math.random() * 0.2).toFixed(1));
            server.bandwidthMbps = parseFloat((server.currentPlayers * 0.15 + Math.random() * 2).toFixed(1));
            server.uptimeSeconds = (server.uptimeSeconds || 0) + Math.round(intervalMs / 1000);
            server.lastHeartbeat = new Date();
            await server.save();
            return server.toObject();
          }

          // Active server ('online' or 'high_load')
          // 1. Organic player drift (+/- 3 to 15 players)
          const playerDrift = Math.floor(Math.random() * 21) - 10;
          server.currentPlayers = Math.max(
            15,
            Math.min(server.maxPlayers, (server.currentPlayers || 200) + playerDrift)
          );

          // 2. High load state trigger
          const loadRatio = server.currentPlayers / server.maxPlayers;
          if (loadRatio >= 0.88) {
            server.status = 'high_load';
          } else {
            server.status = 'online';
          }

          // 3. Realistic Ping drift (+/- 1 to 3 ms)
          const pingDrift = Math.floor(Math.random() * 7) - 3;
          server.pingMs = Math.max(14, Math.min(120, (server.pingMs || 30) + pingDrift));

          // 4. Dynamic CPU Usage based on load + small random variance
          const targetCpu = loadRatio * 60 + 22 + (Math.random() * 6 - 3);
          server.cpuUsagePct = parseFloat(
            Math.max(10, Math.min(96, (server.cpuUsagePct || 40) * 0.75 + targetCpu * 0.25)).toFixed(1)
          );

          // 5. Dynamic Memory Usage based on load
          const targetMem = loadRatio * 45 + 32 + (Math.random() * 4 - 2);
          server.memoryUsagePct = parseFloat(
            Math.max(15, Math.min(94, (server.memoryUsagePct || 50) * 0.8 + targetMem * 0.2)).toFixed(1)
          );

          // 6. Tick rate jitter (59.8 to 60.0 Hz)
          server.tickRateHz = parseFloat((59.8 + Math.random() * 0.2).toFixed(1));

          // 7. Bandwidth scaling
          server.bandwidthMbps = parseFloat(
            (server.currentPlayers * 0.18 + Math.random() * 3).toFixed(1)
          );

          // 8. Increment uptime
          server.uptimeSeconds = (server.uptimeSeconds || 0) + Math.round(intervalMs / 1000);
          server.lastHeartbeat = new Date();

          await server.save();
          return server.toObject();
        })
      );

      // Broadcast live telemetry tick over Socket.IO
      const io = getIO();
      if (io) {
        io.emit('servers:telemetry_tick', updatedServers);
      }
    } catch (err) {
      console.error('[Telemetry Simulator Error]:', err);
    }
  }, intervalMs);
}

export function stopTelemetrySimulator(): void {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log('[Telemetry Simulator] Background fleet simulation stopped.');
  }
}
