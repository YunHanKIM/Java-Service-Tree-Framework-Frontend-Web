// 한글 받침 유무에 따라 '로'/'으로' 조사를 고른다 (받침 없음 또는 'ㄹ' 받침 → 로, 그 외 받침 → 으로)
export function roParticle(word: string): "로" | "으로" {
  const lastChar = word.at(-1);
  if (!lastChar) return "로";
  const code = lastChar.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "로"; // 한글 음절 범위 밖(영문 등)이면 기본값
  const jongseongIndex = code % 28;
  return jongseongIndex === 0 || jongseongIndex === 8 ? "로" : "으로";
}
