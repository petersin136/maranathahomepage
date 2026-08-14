/** 예약 UI·가능 시간 조회에서 쓰는 후보 슬롯 */
export const TIME_SLOT_GROUPS = {
  Morning: ["10:00", "10:30", "11:00", "11:30"],
  Afternoon: [
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00"
  ]
} as const;

export const CANDIDATE_TIMES: readonly string[] = [
  ...TIME_SLOT_GROUPS.Morning,
  ...TIME_SLOT_GROUPS.Afternoon
];
