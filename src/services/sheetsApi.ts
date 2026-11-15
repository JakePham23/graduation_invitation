import type { PlainInvitationRecord, WishEntry } from "@/types/invitation";
import type { ThemePreset } from "@/config/theme";
import { sha256Hex, toRouteSlug } from "@/lib/crypto";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL?.trim() || "";

function stripUnsafeText(input: string, maxLen: number): string {
  return input.replace(/[<>]/g, "").trim().slice(0, maxLen);
}

export function isSheetsConfigured(): boolean {
  return Boolean(APPS_SCRIPT_URL);
}

export async function fetchWishes(): Promise<WishEntry[]> {
  if (!APPS_SCRIPT_URL) {
    return [];
  }

  const url = `${APPS_SCRIPT_URL}?action=wishes`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Không thể tải lời chúc (${res.status}).`);
  }

  const data = (await res.json()) as { ok?: boolean; wishes?: unknown[] };
  if (!Array.isArray(data?.wishes)) {
    return [];
  }

  return data.wishes
    .map((item, idx) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? `wish-${idx}`),
        name: String(row.name ?? "Khách mời"),
        relationship: String(row.relationship ?? ""),
        message: String(row.message ?? ""),
        createdAt: String(row.createdAt ?? ""),
      };
    })
    .filter((w) => w.message.length > 0);
}

export async function submitWish(payload: {
  name: string;
  relationship: string;
  message: string;
}): Promise<WishEntry> {
  const cleanPayload = {
    action: "addWish",
    name: stripUnsafeText(payload.name, 80),
    relationship: stripUnsafeText(payload.relationship, 60),
    message: stripUnsafeText(payload.message, 500),
  };

  if (!cleanPayload.name || !cleanPayload.message) {
    throw new Error("Vui lòng nhập tên và lời chúc của bạn.");
  }

  if (!APPS_SCRIPT_URL) {
    throw new Error("Chưa cấu hình VITE_APPS_SCRIPT_URL.");
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(cleanPayload),
  });

  if (!res.ok) {
    throw new Error("Không thể gửi lời chúc lên Google Sheets.");
  }

  return {
    id: `local-${Date.now()}`,
    name: cleanPayload.name,
    relationship: cleanPayload.relationship,
    message: cleanPayload.message,
    createdAt: new Date().toLocaleDateString("vi-VN"),
  };
}

/**
 * Xác thực quyền mở khóa từ tab Invitations_Private trên Google Sheet (Public/Private hybrid).
 * Gửi SHA-256(id + ":" + password) lên Apps Script, không gửi mật khẩu gốc.
 */
export async function verifyServerPepper(
  id: string,
  password: string,
): Promise<string> {
  if (!APPS_SCRIPT_URL) {
    throw new Error("Chưa cấu hình VITE_APPS_SCRIPT_URL.");
  }

  const clientProof = await sha256Hex(`${id}:${password}`);
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "verifyAccess", id, clientProof }),
  });

  if (!res.ok) {
    throw new Error("Không thể kết nối máy chủ xác thực Google Sheets.");
  }

  const data = (await res.json()) as { ok?: boolean; privatePepper?: string; error?: string };
  if (!data.ok || !data.privatePepper) {
    throw new Error(data.error || "Mật khẩu chưa chính xác.");
  }

  return data.privatePepper;
}

export async function submitRsvp(payload: {
  id: string;
  recipientLabel: string;
  rsvpStatus: string;
  note?: string;
}): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    throw new Error("Chưa cấu hình VITE_APPS_SCRIPT_URL.");
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "rsvp",
      id: stripUnsafeText(payload.id, 64),
      recipientLabel: stripUnsafeText(payload.recipientLabel, 100),
      rsvpStatus: stripUnsafeText(payload.rsvpStatus, 100),
      note: stripUnsafeText(payload.note ?? "", 300),
    }),
  });

  if (!res.ok) {
    throw new Error("Không thể lưu xác nhận tham dự.");
  }
}

/**
 * Tải danh sách thiệp mời (18 cột) trực tiếp từ Google Sheets.
 */
export async function fetchInvitationsFromSheet(): Promise<PlainInvitationRecord[]> {
  if (!APPS_SCRIPT_URL) {
    return [];
  }

  const url = `${APPS_SCRIPT_URL}?action=invitations`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Không thể tải danh sách thiệp từ Google Sheets (${res.status}).`);
  }

  const data = (await res.json()) as {
    ok?: boolean;
    invitations?: Record<string, unknown>[];
  };

  if (!Array.isArray(data?.invitations)) {
    return [];
  }

  return data.invitations
    .map((row) => {
      const id = String(row.id ?? "").trim();
      const recipientLabel = String(row.recipient_label ?? "").trim();
      const passwordHint = String(row.password_hint ?? "").trim();
      const routeHash =
        String(row.route_hash ?? "").trim() ||
        toRouteSlug(id.replace(/^inv-/, "")) ||
        toRouteSlug(recipientLabel) ||
        "thiepmoi";
      const passwordFromHint = passwordHint.match(/:\s*([a-zA-Z0-9_-]{4,})/)?.[1];
      const password = String(row.password ?? "").trim() || passwordFromHint || `${routeHash}2026`;

      const rawRsvp = row.rsvp_status_options;
      const rsvpOptions = Array.isArray(rawRsvp)
        ? rawRsvp.map((s) => String(s).trim()).filter(Boolean)
        : String(rawRsvp ?? "")
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);

      return {
        id: id || `inv-${routeHash}`,
        route_hash: routeHash,
        recipient_label: recipientLabel || "Khách Quý",
        relationship_tag: String(row.relationship_tag ?? "Khách mời").trim(),
        password_hint: passwordHint || `Mật khẩu mẫu: ${password}`,
        password,
        admin_password_hash: String(row.admin_password_hash ?? "").trim(),
        private_pepper: "",
        auto_unlock_qr: false,
        salutation: String(row.salutation ?? "").trim(),
        opening_story: String(row.opening_story ?? "").trim(),
        heartfelt_message: String(row.heartfelt_message ?? "").trim(),
        invitation_body: String(row.invitation_body ?? "").trim(),
        event_date: String(row.event_date ?? "").trim(),
        ceremony_time: String(row.ceremony_time ?? "").trim(),
        photo_time_slot: String(row.photo_time_slot ?? "").trim(),
        venue_detail: String(row.venue_detail ?? "").trim(),
        parking_and_map: String(row.parking_and_map ?? "").trim(),
        dress_code: String(row.dress_code ?? "").trim(),
        emergency_contact: String(row.emergency_contact ?? "").trim(),
        closing_signature: String(row.closing_signature ?? "").trim(),
        rsvp_status_options:
          rsvpOptions.length > 0 ? rsvpOptions : ["Sẽ tham dự đúng giờ"],
        post_ceremony_party: String(row.post_ceremony_party ?? "").trim(),
      } satisfies PlainInvitationRecord;
    })
    .filter((item) => Boolean(item.id && item.recipient_label));
}

/**
 * Gửi & lưu 1 bản ghi thiệp (đầy đủ 18 cột) lên Google Sheets.
 */
export async function saveInvitationToSheet(
  invitation: PlainInvitationRecord,
): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  const normalized = {
    ...invitation,
    rsvp_status_options: Array.isArray(invitation.rsvp_status_options)
      ? invitation.rsvp_status_options.join(" | ")
      : String(invitation.rsvp_status_options || ""),
  };

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveInvitation",
        invitation: normalized,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean };
      if (data?.ok) return true;
    }
  } catch {
    // Chuyển sang phương thức GET dự phòng bên dưới
  }

  const getUrl = `${APPS_SCRIPT_URL}?action=saveInvitation&payload=${encodeURIComponent(
    JSON.stringify({ action: "saveInvitation", invitation: normalized }),
  )}`;
  const getRes = await fetch(getUrl, { method: "GET" });
  if (!getRes.ok) {
    throw new Error(`Không thể gửi dữ liệu thiệp lên Google Sheets (${getRes.status}).`);
  }
  const getData = (await getRes.json()) as { ok?: boolean };
  return Boolean(getData?.ok);
}

/**
 * Đồng bộ toàn bộ danh sách thiệp (18 cột) lên Google Sheets.
 */
export async function syncInvitationsToSheet(
  invitations: PlainInvitationRecord[],
): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  const normalizedList = invitations.map((inv) => ({
    ...inv,
    rsvp_status_options: Array.isArray(inv.rsvp_status_options)
      ? inv.rsvp_status_options.join(" | ")
      : String(inv.rsvp_status_options || ""),
  }));

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "syncInvitations",
        invitations: normalizedList,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean };
      if (data?.ok) return true;
    }
  } catch {
    // Chuyển sang đồng bộ từng bản ghi qua GET bên dưới
  }

  for (const item of invitations) {
    await saveInvitationToSheet(item);
  }
  return true;
}

/**
 * Xóa 1 thiệp khỏi Google Sheets theo id.
 */
export async function deleteInvitationFromSheet(id: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "deleteInvitation",
      id,
    }),
  });

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as { ok?: boolean };
  return Boolean(data?.ok);
}

/**
 * Lấy preset màu đang cấu hình trên Google Sheets (tab Settings).
 */
export async function fetchThemePresetFromSheet(): Promise<ThemePreset | null> {
  if (!APPS_SCRIPT_URL) {
    return null;
  }

  const res = await fetch(`${APPS_SCRIPT_URL}?action=getTheme`, { method: "GET" });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as { ok?: boolean; themePreset?: string };
  if (!data?.ok) {
    return null;
  }
  return data.themePreset === "pastel" ? "pastel" : "classic";
}

/**
 * Lưu preset màu từ trang Admin lên Google Sheets để áp dụng cho toàn bộ khách mời.
 */
export async function saveThemePresetToSheet(themePreset: ThemePreset): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "setTheme",
        themePreset,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean };
      if (data?.ok) return true;
    }
  } catch {
    // Chuyển sang GET dự phòng
  }

  const getUrl = `${APPS_SCRIPT_URL}?action=setTheme&payload=${encodeURIComponent(
    JSON.stringify({ action: "setTheme", themePreset }),
  )}`;
  const getRes = await fetch(getUrl, { method: "GET" });
  if (!getRes.ok) {
    return false;
  }
  const getData = (await getRes.json()) as { ok?: boolean };
  return Boolean(getData?.ok);
}
