import dns from "node:dns/promises";
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
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
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
    addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
  } catch {
    throw new UnsafeUrlError("주소를 찾을 수 없어요. URL을 다시 확인해주세요.");
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new UnsafeUrlError("내부 네트워크 주소는 가져올 수 없어요.");
  }
  return url;
}
