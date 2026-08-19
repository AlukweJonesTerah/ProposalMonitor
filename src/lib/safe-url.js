import { lookup } from 'dns/promises';
import { isIP } from 'net';

function ipv4ToInt(address) {
  return address.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function inIPv4Range(address, base, bits) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(address) & mask) === (ipv4ToInt(base) & mask);
}

function isPrivateIPv4(address) {
  return (
    inIPv4Range(address, '0.0.0.0', 8) ||       // "this" network
    inIPv4Range(address, '10.0.0.0', 8) ||      // private
    inIPv4Range(address, '100.64.0.0', 10) ||   // CGNAT / shared address space
    inIPv4Range(address, '127.0.0.0', 8) ||     // loopback
    inIPv4Range(address, '169.254.0.0', 16) ||  // link-local (includes cloud metadata: 169.254.169.254)
    inIPv4Range(address, '172.16.0.0', 12) ||   // private
    inIPv4Range(address, '192.0.0.0', 24) ||    // IETF protocol assignments
    inIPv4Range(address, '192.0.2.0', 24) ||    // documentation (TEST-NET-1)
    inIPv4Range(address, '192.168.0.0', 16) ||  // private
    inIPv4Range(address, '198.18.0.0', 15) ||   // benchmarking
    inIPv4Range(address, '198.51.100.0', 24) || // documentation (TEST-NET-2)
    inIPv4Range(address, '203.0.113.0', 24) ||  // documentation (TEST-NET-3)
    ipv4ToInt(address) >= ipv4ToInt('224.0.0.0') // multicast, reserved, broadcast
  );
}

function isPrivateIPv6(address) {
  const normalised = address.toLowerCase();
  if (normalised === '::' || normalised === '::1') return true;
  // IPv4-mapped (::ffff:a.b.c.d) or legacy IPv4-compatible (::a.b.c.d) addresses
  // carry their real target in the last 32 bits; check that, not the wrapper.
  const mapped = normalised.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return /^f[cd][0-9a-f]{2}:/.test(normalised) || normalised.startsWith('fe80:') || normalised.startsWith('ff');
}

function isPrivateAddress(address) {
  return isIP(address) === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
}

// Rejects anything that isn't a plain public http(s) address. Blocks dangerous
// schemes (javascript:, file:, data:, ...) and server-side request forgery
// targets: localhost, private/link-local/CGNAT/documentation ranges, cloud
// metadata endpoints, and IPv4-mapped IPv6. Used for every user-submitted link
// across both tenants: source intake, source review add/edit, and one-off
// analysis, so the check only needs to be this thorough in one place.
export async function assertPublicUrl(value, label = 'submitted') {
  const url = new URL(String(value || '').trim());
  const hostname = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(`Enter a public http(s) URL without login details: ${value}`);
  }
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error(`Private-network URLs cannot be ${label}: ${value}`);
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error(`Private-network URLs cannot be ${label}: ${value}`);
  }
  return url;
}
