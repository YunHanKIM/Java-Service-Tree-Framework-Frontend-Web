import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 마운트 후 클라이언트 전용 데이터(localStorage 등)를 읽어 setState하는 패턴은
      // SSR 하이드레이션 불일치를 피하기 위해 필요하다 — shadcn이 생성한
      // src/hooks/use-mobile.ts조차 동일 패턴이라 error로 두면 그 파일도 걸린다.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
