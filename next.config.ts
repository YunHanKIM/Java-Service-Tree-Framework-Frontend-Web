import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 네이티브 바이너리·워커 스레드를 쓰는 서버 전용 패키지는 번들링하지 않고 Node require로 불러온다
  serverExternalPackages: ["pdf-parse", "playwright", "playwright-core", "tesseract.js"],
};

export default nextConfig;
