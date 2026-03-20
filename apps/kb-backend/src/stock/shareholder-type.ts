export const HOLDER_TYPE_LABELS: Record<string, string> = {
  ID: "individual",
  CP: "corporate",
  MF: "mutual_fund",
  IB: "financial_institution",
  IS: "insurance",
  SC: "securities_company",
  PF: "pension_fund",
  FD: "foundation",
  OT: "others",
};

export const getHolderTypeLabel = (typeCode: string) =>
  HOLDER_TYPE_LABELS[typeCode] ?? "unknown";
