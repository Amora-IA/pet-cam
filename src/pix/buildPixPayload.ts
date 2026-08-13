interface PixInfo {
  key: string;
  name: string;
  city: string;
}

function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function sanitize(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^\x20-\x7e]/g, "") // ASCII-only, per the Pix BR Code spec
    .toUpperCase()
    .slice(0, maxLength);
}

// CRC16-CCITT (XModem), as required by the EMVCo/Pix BR Code spec.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Builds a static (no fixed amount) Pix "copia e cola" BR Code string. */
export function buildPixPayload({ key, name, city }: PixInfo): string {
  const merchantAccountInfo = tlv("26", tlv("00", "br.gov.bcb.pix") + tlv("01", key));
  const additionalData = tlv("62", tlv("05", "***"));

  const payload =
    tlv("00", "01") +
    merchantAccountInfo +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("58", "BR") +
    tlv("59", sanitize(name, 25)) +
    tlv("60", sanitize(city, 15)) +
    additionalData +
    "6304";

  return payload + crc16(payload);
}
