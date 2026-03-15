'use strict';

const net = require('net');

/**
 * Find a free port on the host.
 * @param {string} [host="127.0.0.1"] - Host to bind to.
 * @param {number} [startPort=32768] - Start of ephemeral range.
 * @returns {Promise<number>} A free port number.
 */
const findFreePort = (host = '127.0.0.1', startPort = 32768) => {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, host, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      // Port in use, try next
      if (startPort < 65535) {
        resolve(findFreePort(host, startPort + 1));
      } else {
        reject(new Error('No free ports available'));
      }
    });
  });
};

/**
 * Rewrite port mappings in a compose-style ports array to use explicit host ports.
 *
 * Handles these formats:
 * - "80" → "127.0.0.1:FREE:80"
 * - "127.0.0.1::80" → "127.0.0.1:FREE:80"
 * - "::80" → "127.0.0.1:FREE:80"
 * - ":80" → "127.0.0.1:FREE:80"
 * - "127.0.0.1:8080:80" → unchanged (already has host port)
 * - "8080:80" → unchanged
 *
 * @param {Array<string|Object>} ports - Array of port mappings.
 * @returns {Promise<Array<string>>} Rewritten port mappings.
 */
const allocatePorts = async ports => {
  if (!ports || !Array.isArray(ports)) return ports;

  const result = [];
  for (const port of ports) {
    if (typeof port !== 'string') {
      // Object format or number — pass through
      result.push(port);
      continue;
    }

    // Parse the port spec
    // Formats: "80", ":80", "::80", "127.0.0.1::80", "8080:80", "127.0.0.1:8080:80"
    const parts = port.split(':');

    if (parts.length === 1) {
      // "80" — just container port, no host port
      const freePort = await findFreePort();
      result.push(`127.0.0.1:${freePort}:${parts[0]}`);
    } else if (parts.length === 2) {
      if (parts[0] === '') {
        // ":80" — empty host port
        const freePort = await findFreePort();
        result.push(`127.0.0.1:${freePort}:${parts[1]}`);
      } else {
        // "8080:80" — has host port, pass through
        result.push(port);
      }
    } else if (parts.length === 3) {
      const [host, hostPort, containerPort] = parts;
      if (hostPort === '') {
        // "127.0.0.1::80" or "::80" — empty host port
        const bindHost = host || '127.0.0.1';
        const freePort = await findFreePort(bindHost);
        result.push(`${bindHost}:${freePort}:${containerPort}`);
      } else {
        // "127.0.0.1:8080:80" — fully specified, pass through
        result.push(port);
      }
    } else {
      // Unknown format, pass through
      result.push(port);
    }
  }
  return result;
};

module.exports = {findFreePort, allocatePorts};
