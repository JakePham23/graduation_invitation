import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PBKDF2_ITERATIONS = 210_000;
const INPUT_FILE = process.argv[2] || "local-invitations.private.json";
const OUTPUT_FILE = "src/data/encrypted-invitations.json";

function toSlug(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function encryptRecord(item) {
  const password = String(item.password ?? "").trim();
  if (password.length < 4) {
    throw new Error(`Thư "${item.id}" cần mật khẩu tối thiểu 4 ký tự.`);
  }

  const pepper = String(item.private_pepper ?? "").trim();
  const passphrase = pepper ? `${password}:${pepper}` : password;

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 32, "sha256");

  const secretPayload = {
    salutation: item.salutation,
    opening_story: item.opening_story,
    heartfelt_message: item.heartfelt_message,
    invitation_body: item.invitation_body,
    event_date: item.event_date,
    ceremony_time: item.ceremony_time,
    photo_time_slot: item.photo_time_slot,
    venue_detail: item.venue_detail,
    parking_and_map: item.parking_and_map,
    dress_code: item.dress_code,
    emergency_contact: item.emergency_contact,
    closing_signature: item.closing_signature,
    rsvp_status_options: Array.isArray(item.rsvp_status_options)
      ? item.rsvp_status_options
      : String(item.rsvp_status_options ?? "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean),
    post_ceremony_party: item.post_ceremony_party || "",
  };

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(secretPayload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const combinedCiphertext = Buffer.concat([encrypted, authTag]);

  const slug = toSlug(item.recipient_label) || toSlug(item.id) || "invite";
  const shortHash = crypto
    .createHash("sha256")
    .update(`${item.id}:${password}`)
    .digest("hex")
    .slice(0, 8);
  const routeHash = String(item.route_hash ?? "").trim() || `${slug}-${shortHash}`;

  const result = {
    id: item.id,
    route_hash: routeHash,
    recipient_label: item.recipient_label,
    relationship_tag: item.relationship_tag,
    password_hint: item.password_hint,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ciphertext: combinedCiphertext.toString("base64"),
    uses_server_pepper: Boolean(pepper),
  };

  if (item.auto_unlock_qr !== false && !pepper) {
    result.default_qr_key = password;
  }

  return result;
}

function main() {
  const inputPath = path.resolve(process.cwd(), INPUT_FILE);
  if (!fs.existsSync(inputPath)) {
    console.error(`Không tìm thấy file nguồn: ${inputPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!Array.isArray(raw)) {
    console.error("File nguồn phải là một mảng JSON các thư mời.");
    process.exit(1);
  }

  const output = raw.map(encryptRecord);
  const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Đã mã hóa ${output.length} thư mời vào ${OUTPUT_FILE}`);
}

main();
