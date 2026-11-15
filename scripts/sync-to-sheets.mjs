import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
let appsScriptUrl = process.env.VITE_APPS_SCRIPT_URL || "";
let adminPasswordHash = process.env.VITE_ADMIN_PASSWORD_HASH || "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  if (!appsScriptUrl) {
    const match = envContent.match(/^VITE_APPS_SCRIPT_URL=(.+)$/m);
    if (match) {
      appsScriptUrl = match[1].trim();
    }
  }
  if (!adminPasswordHash) {
    const hashMatch = envContent.match(/^VITE_ADMIN_PASSWORD_HASH=(.+)$/m);
    if (hashMatch) {
      adminPasswordHash = hashMatch[1].trim();
    }
  }
}

if (!appsScriptUrl) {
  console.error("Chưa cấu hình VITE_APPS_SCRIPT_URL trong .env.local");
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), "local-invitations.private.json");
const rawItems = JSON.parse(fs.readFileSync(inputPath, "utf8"));

const payload = {
  action: "syncInvitations",
  invitations: rawItems.map((inv) => ({
    ...inv,
    admin_password_hash: inv.admin_password_hash || adminPasswordHash || "",
    rsvp_status_options: Array.isArray(inv.rsvp_status_options)
      ? inv.rsvp_status_options.join(" | ")
      : String(inv.rsvp_status_options || ""),
  })),
};

console.log(`Đang gửi ${rawItems.length} bản ghi thiệp mời lên Google Sheets...`);
console.log(`URL: ${appsScriptUrl}`);

// Bước 1: Gửi POST với redirect: "manual" (vì Google Apps Script trả về 302 sang script.googleusercontent.com chỉ nhận GET)
let res = await fetch(appsScriptUrl, {
  method: "POST",
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify(payload),
  redirect: "manual",
});

if ([301, 302, 303, 307, 308].includes(res.status)) {
  const redirectUrl = res.headers.get("location");
  if (redirectUrl) {
    res = await fetch(redirectUrl, { method: "GET" });
  }
}

let text = await res.text();

// Bước 2: Nếu POST bị 401/403, thử gửi từng bản ghi qua GET ?action=saveInvitation&payload=...
if (res.status === 401 || res.status === 403 || text.includes("Không tìm thấy trang")) {
  console.log(`\nPOST trả về HTTP ${res.status}. Đang thử phương thức GET dự phòng...`);
  let getSuccessCount = 0;
  for (const inv of payload.invitations) {
    const singlePayload = encodeURIComponent(
      JSON.stringify({ action: "saveInvitation", invitation: inv }),
    );
    const getUrl = `${appsScriptUrl}?action=saveInvitation&payload=${singlePayload}`;
    const getRes = await fetch(getUrl, { method: "GET", redirect: "follow" });
    const getText = await getRes.text();
    if (getRes.ok && getText.trim().startsWith("{")) {
      console.log(`  ✓ Đã lưu [${inv.id}] (${inv.recipient_label}): ${getText.trim()}`);
      getSuccessCount += 1;
    } else {
      console.error(`  ✗ Lỗi HTTP ${getRes.status} khi gọi Apps Script.`);
      console.error(`  Nội dung phản hồi (500 ký tự đầu): ${getText.slice(0, 500)}`);
      console.error(
        `\n⚠️ NGUYÊN NHÂN LỖI 401 TỪ GOOGLE APPS SCRIPT:\n` +
          `1. Khi bạn bấm "New deployment" (Triển khai mới) trên Google Apps Script, Google sẽ sinh ra một URL "/exec" MỚI — hãy copy URL mới đó dán vào VITE_APPS_SCRIPT_URL trong file .env.local.\n` +
          `2. Hoặc trong mục Deploy -> Manage deployments -> Edit:\n` +
          `   - "Execute as" (Thực thi dưới dạng): phải chọn "Me" (Email của bạn)\n` +
          `   - "Who has access" (Ai có quyền truy cập): phải chọn "Anyone" (Bất kỳ ai)\n` +
          `   - Nếu lần đầu thêm quyền SpreadsheetApp, Google sẽ hiện bảng "Authorize access" (Cấp quyền truy cập) -> bạn cần bấm Review permissions -> Advanced -> Go to ... (unsafe) -> Allow.`,
      );
      process.exit(1);
    }
  }
  if (getSuccessCount > 0) {
    console.log(`\n✅ Hoàn tất đồng bộ ${getSuccessCount}/${payload.invitations.length} thiệp lên Google Sheets!`);
    process.exit(0);
  }
}

console.log(`HTTP Status: ${res.status}`);
console.log(`Response từ Google Apps Script: ${text}`);
