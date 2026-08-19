// Standard Indian GST state/UT codes (fixed by the GST council, not something
// this app's data ever needs to edit) - looked up by the state name already
// stored on company_settings/customers/suppliers, for printing "State Code"
// on a tax invoice the way every real GST invoice shows it.
const GST_STATE_CODES: Record<string, string> = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  punjab: "03",
  chandigarh: "04",
  uttarakhand: "05",
  haryana: "06",
  delhi: "07",
  rajasthan: "08",
  "uttar pradesh": "09",
  bihar: "10",
  sikkim: "11",
  "arunachal pradesh": "12",
  nagaland: "13",
  manipur: "14",
  mizoram: "15",
  tripura: "16",
  meghalaya: "17",
  assam: "18",
  "west bengal": "19",
  jharkhand: "20",
  odisha: "21",
  chhattisgarh: "22",
  "madhya pradesh": "23",
  gujarat: "24",
  "daman and diu": "25",
  "dadra and nagar haveli and daman and diu": "26",
  maharashtra: "27",
  "andhra pradesh (old)": "28",
  karnataka: "29",
  goa: "30",
  lakshadweep: "31",
  kerala: "32",
  "tamil nadu": "33",
  puducherry: "34",
  "andaman and nicobar islands": "35",
  telangana: "36",
  "andhra pradesh": "37",
  ladakh: "38",
};

export function gstStateCode(stateName: string | null | undefined): string | null {
  if (!stateName) return null;
  return GST_STATE_CODES[stateName.trim().toLowerCase()] ?? null;
}
