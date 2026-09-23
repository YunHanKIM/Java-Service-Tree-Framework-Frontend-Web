import dns from "node:dns";
import net from "node:net";

// 링크 가져오기는 서버가 사용자 대신 임의 URL에 요청을 보낸다 — 내부망·클라우드 메타데이터
// 주소(169.254.169.254 등)로 향하는 요청을 막아 SSRF 발판이 되지 않게 한다.
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (!net.isIPv6(ip)) return true;
  const v6 = ip.toLowerCase();
  // IPv4-mapped(::ffff:a.b.c.d)은 URL 파서가 16진수(::ffff:7f00:1)로 정규화하기도 한다 — 두 표기 모두 IPv4로 되돌려 검사
  const mapped = v6.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
  if (mapped) {
    if (mapped[1]) return isPrivateIp(mapped[1]);
    const hi = parseInt(mapped[2], 16);
    const lo = parseInt(mapped[3], 16);
    return isPrivateIp(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  // 전역 유니캐스트(2000::/3)만 허용 — 루프백·링크로컬·ULA·IPv4 호환·NAT64 등 나머지는 전부 차단.
  // 6to4(2002::/16)는 내부 IPv4를 품을 수 있어 함께 차단
  const firstHextet = v6.startsWith("::") ? 0 : parseInt(v6.split(":")[0], 16);
  return firstHextet < 0x2000 || firstHextet > 0x3fff || firstHextet === 0x2002;
}

/** dns.lookup과 같은 시그니처 — undici 커넥터가 실제로 연결할 주소를 이 함수로 해석하게 해서 DNS rebinding을 막는다 */
export function guardedLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void
): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateIp(a.address))) {
      return callback(Object.assign(new Error(`blocked private address for ${hostname}`), { code: "EPRIVATE" }), "");
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

export class UnsafeUrlError extends Error {}

/** http(s)이고, 호스트가 공인 IP로만 해석될 때 통과. 아니면 UnsafeUrlError */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("올바른 URL이 아니에요.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("http/https 주소만 가져올 수 있어요.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  try {
    addresses = net.isIP(host) ? [host] : (await dns.promises.lookup(host, { all: true })).map((a) => a.address);
  } catch {
    throw new UnsafeUrlError("주소를 찾을 수 없어요. URL을 다시 확인해주세요.");
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new UnsafeUrlError("내부 네트워크 주소는 가져올 수 없어요.");
  }
  return url;
}
