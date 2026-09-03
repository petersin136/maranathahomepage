/**
 * 모바일 시안 아트보드.
 *
 * 기존 작업 기준 375px → 390px (iPhone 14/15 CSS 논리 폭).
 * 소스 이미지는 해상도 대응용 2x 추출본. CSS·img 에는 1x 표시 크기만 넣는다.
 * 예: 파일 780×560 → width/height 또는 sizes 는 390×280.
 *
 * 좌우 여백 상수는 hairup-home과 같이 16이지만,
 * 실제 UI 패딩·콘텐츠 폭은 20 / 350 (390 − 20×2)을 쓴다.
 */
export const MOBILE_ARTBOARD_PX = 390;
export const MOBILE_GUTTER_PX = 16;
export const MOBILE_CONTENT_PX = MOBILE_ARTBOARD_PX - MOBILE_GUTTER_PX * 2;

/** 실제 모바일 UI 거터·콘텐츠 (시안 390 − 20×2) */
export const MOBILE_UI_GUTTER_PX = 20;
export const MOBILE_UI_CONTENT_PX = MOBILE_ARTBOARD_PX - MOBILE_UI_GUTTER_PX * 2;
