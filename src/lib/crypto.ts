import type {
  CoverLetterSecret,
  EncryptedInvitationRecord,
  PlainInvitationRecord,
} from "@/types/invitation";

const PBKDF2_ITERATIONS = 210_000;

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function toRouteSlug(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  usages: KeyUsage[] = ["decrypt"],
): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

/**
 * Mã hóa trực tiếp một bản ghi thiệp mời ngay trên trình duyệt (Admin Home)
 * bằng Web Crypto API (PBKDF2 210,000 vòng + AES-256-GCM).
 */
export async function encryptInvitation(
  item: PlainInvitationRecord,
): Promise<EncryptedInvitationRecord> {
  if (!window.crypto?.subtle) {
    throw new Error("Trình duyệt không hỗ trợ Web Crypto API (cần HTTPS hoặc localhost).");
  }

  const password = String(item.password || "").trim() || `${toRouteSlug(item.id || item.recipient_label)}2026`;
  const pepper = String(item.private_pepper || "").trim();
  const passphrase = pepper ? `${password}:${pepper}` : password;

  const salt = new Uint8Array(new ArrayBuffer(16));
  const iv = new Uint8Array(new ArrayBuffer(12));
  window.crypto.getRandomValues(salt);
  window.crypto.getRandomValues(iv);

  const key = await deriveAesKey(passphrase, salt, ["encrypt"]);

  const secretPayload: CoverLetterSecret = {
    salutation: item.salutation || "",
    opening_story: item.opening_story || "",
    heartfelt_message: item.heartfelt_message || "",
    invitation_body: item.invitation_body || "",
    event_date: item.event_date || "",
    ceremony_time: item.ceremony_time || "",
    photo_time_slot: item.photo_time_slot || "",
    venue_detail: item.venue_detail || "",
    parking_and_map: item.parking_and_map || "",
    dress_code: item.dress_code || "",
    emergency_contact: item.emergency_contact || "",
    closing_signature: item.closing_signature || "",
    rsvp_status_options: Array.isArray(item.rsvp_status_options)
      ? item.rsvp_status_options.map((s) => String(s).trim()).filter(Boolean)
      : String(item.rsvp_status_options || "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean),
    post_ceremony_party: item.post_ceremony_party || "",
  };

  const encodedPlaintext = new TextEncoder().encode(JSON.stringify(secretPayload));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedPlaintext,
  );

  const routeHash =
    String(item.route_hash || "").trim() ||
    toRouteSlug(item.id.replace(/^inv-/, "")) ||
    toRouteSlug(item.recipient_label) ||
    "thiepmoi";

  const record: EncryptedInvitationRecord = {
    id: item.id.trim(),
    route_hash: routeHash,
    recipient_label: item.recipient_label.trim(),
    relationship_tag: item.relationship_tag.trim() || "Khách quý",
    password_hint: item.password_hint.trim(),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
    uses_server_pepper: Boolean(pepper),
  };

  if (item.auto_unlock_qr !== false && !pepper) {
    record.default_qr_key = password;
  }

  return record;
}

/**
 * Giải mã nội dung Cover Letter bằng Web Crypto API (PBKDF2 + AES-256-GCM).
 * Nếu sai mật khẩu hoặc thiếu privatePepper hợp lệ, GCM tag sẽ từ chối giải mã.
 */
export async function decryptInvitation(
  record: EncryptedInvitationRecord,
  password: string,
  privatePepper = "",
): Promise<CoverLetterSecret> {
  if (!window.crypto?.subtle) {
    throw new Error("Trình duyệt không hỗ trợ Web Crypto API (cần HTTPS hoặc localhost).");
  }

  const salt = base64ToBytes(record.salt);
  const iv = base64ToBytes(record.iv);
  const ciphertext = base64ToBytes(record.ciphertext);

  const passphrase = privatePepper ? `${password}:${privatePepper}` : password;
  const key = await deriveAesKey(passphrase, salt, ["decrypt"]);

  const plaintextBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const jsonText = new TextDecoder().decode(plaintextBuffer);
  return JSON.parse(jsonText) as CoverLetterSecret;
}
