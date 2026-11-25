/** The 23 nations of the Figma "flag" component, same order, then Thailand; [ISO code, racing code, Thai name]. */
export const NATIONS: readonly (readonly [string, string, string])[] = [
  ["JP", "JPN", "ญี่ปุ่น"], ["AR", "ARG", "อาร์เจนตินา"], ["IT", "ITA", "อิตาลี"], ["BE", "BEL", "เบลเยียม"],
  ["US", "USA", "สหรัฐอเมริกา"], ["HK", "HKG", "ฮ่องกง"], ["PR", "PUR", "เปอร์โตริโก"], ["BB", "BRB", "บาร์เบโดส"],
  ["IE", "IRE", "ไอร์แลนด์"], ["DE", "GER", "เยอรมนี"], ["PA", "PAN", "ปานามา"], ["GB", "GBR", "สหราชอาณาจักร"],
  ["FR", "FRA", "ฝรั่งเศส"], ["VE", "VEN", "เวเนซุเอลา"], ["AU", "AUS", "ออสเตรเลีย"], ["NZ", "NZL", "นิวซีแลนด์"],
  ["DO", "DOM", "โดมินิกัน"], ["CA", "CAN", "แคนาดา"], ["AE", "UAE", "สหรัฐอาหรับเอมิเรตส์"], ["MX", "MEX", "เม็กซิโก"],
  ["ZA", "RSA", "แอฟริกาใต้"], ["CL", "CHI", "ชิลี"], ["PE", "PER", "เปรู"], ["TH", "THA", "ไทย"],
];
/**
 * Special horse "flags" for Japanese horses: the JRA training centre the horse is stabled at, drawn as a pill
 * badge instead of a flag (Figma "Trainer" component): MIHO red, RITTO blue. Only the horse flag offers them.
 */
export const CENTERS: readonly (readonly [string, string, string])[] = [
  ["MIHO", "MIHO", "มิโฮะ (Miho)"], ["RITTO", "RITTO", "ริตโต (Ritto)"],
];
export const CENTER_COLOR: Record<string, string> = { MIHO: "#CD0202", RITTO: "#00157D" };
const ALL = [...NATIONS, ...CENTERS];
export const nationName = (c: string) => (c ? ALL.find((n) => n[0] === c)?.[2] ?? c : "ไม่ใส่ธง");
export const nationCode = (c: string) => ALL.find((n) => n[0] === c)?.[1] ?? c;
