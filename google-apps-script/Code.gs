/**
 * Google Apps Script Web App cho Graduation Invitation (Đồng bộ 2 chiều Google Sheets <-> Web).
 *
 * 1. Tab dữ liệu thiệp 21 cột (tự động nhận diện tab có cột đầu là "id" & "recipient_label", hoặc tab tên "Invitations" / trang tính đầu tiên):
 *    id | recipient_label | relationship_tag | password_hint | salutation | opening_story | heartfelt_message | invitation_body | event_date | ceremony_time | photo_time_slot | venue_detail | parking_and_map | dress_code | emergency_contact | closing_signature | rsvp_status_options | post_ceremony_party | route_hash | password | admin_password_hash
 *
 * 2. Tab "Wishes": timestamp | name | relationship | message
 * 3. Tab "RSVP": timestamp | id | recipient_label | rsvp_status | note
 * 4. Tab "Invitations_Private" (tùy chọn): id | proof_sha256 | private_pepper
 */

// Nếu bạn tạo Apps Script rời bên ngoài Google Sheet, hãy dán ID của file Google Sheet vào giữa 2 dấu nháy dưới đây
// (Lấy từ link Google Sheet: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_O_DAY/edit)
// Nếu bạn mở từ bên trong Google Sheet (Extensions -> Apps Script) thì để trống "" cũng được.
var SPREADSHEET_ID = "";

var INVITATION_HEADERS = [
  "id",
  "recipient_label",
  "relationship_tag",
  "password_hint",
  "salutation",
  "opening_story",
  "heartfelt_message",
  "invitation_body",
  "event_date",
  "ceremony_time",
  "photo_time_slot",
  "venue_detail",
  "parking_and_map",
  "dress_code",
  "emergency_contact",
  "closing_signature",
  "rsvp_status_options",
  "post_ceremony_party",
  "route_hash",
  "password",
  "admin_password_hash"
];

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error(
    "Không tìm thấy Google Sheet! Hãy mở Apps Script từ bên trong Google Sheet (Extensions -> Apps Script) hoặc điền SPREADSHEET_ID ở dòng 14 của Code.gs."
  );
}

/**
 * BẤM NÚT "▷ Run" (Chạy) HÀM NÀY TRÊN APPS SCRIPT ĐỂ CẤP QUYỀN (AUTHORIZE) CHO GOOGLE SHEET!
 */
function authorizeAndTest() {
  var ss = getSpreadsheet();
  var sheet = getOrCreateInvitationsSheet(ss);
  Logger.log("Đã kết nối thành công tới Google Sheet: " + ss.getName() + " | Tab: " + sheet.getName());
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeText(val, maxLen) {
  return String(val || "").replace(/[<>]/g, "").trim().slice(0, maxLen || 2000);
}

/**
 * Tìm trang tính chứa 18 cột dữ liệu thiệp mời (ưu tiên tab có cột A1="id" & B1="recipient_label",
 * hoặc tab tên "Invitations", nếu chưa có thì tự tạo tab "Invitations" với đủ 18 cột).
 */
function getOrCreateInvitationsSheet(ss) {
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    if (sh.getLastRow() >= 1 && sh.getLastColumn() >= 2) {
      var firstRow = sh.getRange(1, 1, 1, 2).getValues()[0];
      if (
        String(firstRow[0] || "").trim().toLowerCase() === "id" &&
        String(firstRow[1] || "").trim().toLowerCase() === "recipient_label"
      ) {
        return sh;
      }
    }
  }

  var namedSheet = ss.getSheetByName("Invitations") || ss.getSheetByName("Sheet1") || ss.getSheetByName("Trang tính1");
  if (namedSheet) {
    if (namedSheet.getLastRow() === 0) {
      namedSheet.appendRow(INVITATION_HEADERS);
    }
    return namedSheet;
  }

  var created = ss.insertSheet("Invitations");
  created.appendRow(INVITATION_HEADERS);
  return created;
}

function rowToInvitationObj(row) {
  var rsvpRaw = String(row[16] || "").trim();
  var rsvpArr = rsvpRaw
    ? rsvpRaw.split("|").map(function(s) { return s.trim(); }).filter(Boolean)
    : ["Sẽ tham dự đúng giờ"];

  return {
    id: String(row[0] || "").trim(),
    recipient_label: String(row[1] || "").trim(),
    relationship_tag: String(row[2] || "").trim(),
    password_hint: String(row[3] || "").trim(),
    salutation: String(row[4] || "").trim(),
    opening_story: String(row[5] || "").trim(),
    heartfelt_message: String(row[6] || "").trim(),
    invitation_body: String(row[7] || "").trim(),
    event_date: String(row[8] || "").trim(),
    ceremony_time: String(row[9] || "").trim(),
    photo_time_slot: String(row[10] || "").trim(),
    venue_detail: String(row[11] || "").trim(),
    parking_and_map: String(row[12] || "").trim(),
    dress_code: String(row[13] || "").trim(),
    emergency_contact: String(row[14] || "").trim(),
    closing_signature: String(row[15] || "").trim(),
    rsvp_status_options: rsvpArr,
    post_ceremony_party: String(row[17] || "").trim(),
    route_hash: String(row[18] || "").trim(),
    password: String(row[19] || "").trim(),
    admin_password_hash: String(row[20] || "").trim()
  };
}

function invitationObjToRow(item) {
  var rsvpStr = Array.isArray(item.rsvp_status_options)
    ? item.rsvp_status_options.join(" | ")
    : String(item.rsvp_status_options || "");

  return [
    sanitizeText(item.id, 100),
    sanitizeText(item.recipient_label, 150),
    sanitizeText(item.relationship_tag, 100),
    sanitizeText(item.password_hint, 250),
    sanitizeText(item.salutation, 300),
    sanitizeText(item.opening_story, 1500),
    sanitizeText(item.heartfelt_message, 1500),
    sanitizeText(item.invitation_body, 1500),
    sanitizeText(item.event_date, 200),
    sanitizeText(item.ceremony_time, 250),
    sanitizeText(item.photo_time_slot, 250),
    sanitizeText(item.venue_detail, 500),
    sanitizeText(item.parking_and_map, 500),
    sanitizeText(item.dress_code, 300),
    sanitizeText(item.emergency_contact, 300),
    sanitizeText(item.closing_signature, 200),
    sanitizeText(rsvpStr, 600),
    sanitizeText(item.post_ceremony_party, 600),
    sanitizeText(item.route_hash, 120),
    sanitizeText(item.password, 120),
    sanitizeText(item.admin_password_hash, 128)
  ];
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "wishes";
  var ss = getSpreadsheet();

  // Cho phép gọi các action ghi dữ liệu qua GET ?action=...&payload=... để tránh lỗi 302 redirect CORS
  if (e && e.parameter && e.parameter.payload) {
    try {
      var parsedPayload = JSON.parse(e.parameter.payload);
      return handleWriteAction(ss, parsedPayload);
    } catch (err) {
      return jsonResponse({ ok: false, error: String(err) });
    }
  }

  if (action === "getTheme") {
    return jsonResponse({ ok: true, themePreset: getThemePresetSetting(ss) });
  }

  if (action === "invitations") {
    var invSheet = getOrCreateInvitationsSheet(ss);
    var invRows = invSheet.getDataRange().getValues();
    var invitations = [];
    for (var r = 1; r < invRows.length; r++) {
      if (!invRows[r][0] && !invRows[r][1]) continue;
      invitations.push(rowToInvitationObj(invRows[r]));
    }
    return jsonResponse({
      ok: true,
      invitations: invitations,
      themePreset: getThemePresetSetting(ss)
    });
  }

  if (action === "wishes") {
    var sheet = ss.getSheetByName("Wishes");
    if (!sheet) return jsonResponse({ ok: true, wishes: [] });
    var rows = sheet.getDataRange().getValues();
    var wishes = [];
    for (var i = 1; i < rows.length; i++) {
      if (!rows[i][3]) continue;
      wishes.push({
        id: "w-" + i,
        createdAt: rows[i][0] ? Utilities.formatDate(new Date(rows[i][0]), "Asia/Ho_Chi_Minh", "dd/MM/yyyy") : "",
        name: String(rows[i][1] || "Khách mời"),
        relationship: String(rows[i][2] || ""),
        message: String(rows[i][3] || "")
      });
    }
    return jsonResponse({ ok: true, wishes: wishes.reverse() });
  }

  return jsonResponse({ ok: false, error: "Unsupported action" });
}

function upsertSingleInvitation(invSheet, item) {
  if (!item || !item.id) return;
  if (invSheet.getLastRow() === 0) {
    invSheet.appendRow(INVITATION_HEADERS);
  } else {
    invSheet.getRange(1, 1, 1, INVITATION_HEADERS.length).setValues([INVITATION_HEADERS]);
  }
  var rowValues = invitationObjToRow(item);
  var data = invSheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || "").trim() === String(item.id).trim()) {
      if (!rowValues[20] && data[i][20]) {
        rowValues[20] = String(data[i][20]).trim();
      }
      invSheet.getRange(i + 1, 1, 1, INVITATION_HEADERS.length).setValues([rowValues]);
      return "updated";
    }
  }
  invSheet.appendRow(rowValues);
  return "inserted";
}

function handleWriteAction(ss, body) {
  // 1. Lưu 1 thiệp mới hoặc cập nhật thiệp có sẵn (18 cột) lên Google Sheets
  if (body.action === "saveInvitation") {
    var invSheet = getOrCreateInvitationsSheet(ss);
    var status = upsertSingleInvitation(invSheet, body.invitation || body);
    return jsonResponse({ ok: true, status: status });
  }

  // 2. Đồng bộ danh sách nhiều thiệp (18 cột) lên Google Sheets
  if (body.action === "syncInvitations") {
    var syncSheet = getOrCreateInvitationsSheet(ss);
    var items = Array.isArray(body.invitations) ? body.invitations : [];
    var count = 0;
    for (var k = 0; k < items.length; k++) {
      if (items[k] && items[k].id) {
        upsertSingleInvitation(syncSheet, items[k]);
        count++;
      }
    }
    return jsonResponse({ ok: true, count: count });
  }

  // 3. Xóa 1 thiệp khỏi Google Sheets theo id
  if (body.action === "deleteInvitation") {
    var delSheet = getOrCreateInvitationsSheet(ss);
    var targetId = String(body.id || "").trim();
    var allRows = delSheet.getDataRange().getValues();
    for (var d = allRows.length - 1; d >= 1; d--) {
      if (String(allRows[d][0] || "").trim() === targetId) {
        delSheet.deleteRow(d + 1);
        return jsonResponse({ ok: true, deleted: true });
      }
    }
    return jsonResponse({ ok: true, deleted: false });
  }

  if (body.action === "addWish") {
    var sheet = ss.getSheetByName("Wishes") || ss.insertSheet("Wishes");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "name", "relationship", "message"]);
    }
    var name = sanitizeText(body.name, 80);
    var rel = sanitizeText(body.relationship, 60);
    var msg = sanitizeText(body.message, 500);
    if (!name || !msg) return jsonResponse({ ok: false, error: "Missing fields" });
    sheet.appendRow([new Date(), name, rel, msg]);
    return jsonResponse({ ok: true });
  }

  if (body.action === "rsvp") {
    var rsvpSheet = ss.getSheetByName("RSVP") || ss.insertSheet("RSVP");
    if (rsvpSheet.getLastRow() === 0) {
      rsvpSheet.appendRow(["timestamp", "id", "recipient_label", "rsvp_status", "note"]);
    }
    rsvpSheet.appendRow([
      new Date(),
      sanitizeText(body.id, 64),
      sanitizeText(body.recipientLabel, 100),
      sanitizeText(body.rsvpStatus, 100),
      sanitizeText(body.note, 300)
    ]);
    return jsonResponse({ ok: true });
  }

  if (body.action === "setTheme") {
    var preset = String(body.themePreset || "").trim() === "pastel" ? "pastel" : "classic";
    setThemePresetSetting(ss, preset);
    return jsonResponse({ ok: true, themePreset: preset });
  }

  if (body.action === "verifyAccess") {
    var privSheet = ss.getSheetByName("Invitations_Private");
    if (!privSheet) return jsonResponse({ ok: false, error: "Private sheet missing" });
    var rows = privSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === String(body.id || "").trim()) {
        if (String(rows[i][1]).trim() === String(body.clientProof || "").trim()) {
          return jsonResponse({ ok: true, privatePepper: String(rows[i][2] || "") });
        }
        return jsonResponse({ ok: false, error: "Mật khẩu chưa chính xác." });
      }
    }
    return jsonResponse({ ok: false, error: "Không tìm thấy mã thư mời." });
  }

  return jsonResponse({ ok: false, error: "Unknown action" });
}

function getThemePresetSetting(ss) {
  var settingsSheet = ss.getSheetByName("Settings");
  if (!settingsSheet) return "classic";
  var rows = settingsSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === "theme_preset") {
      return String(rows[i][1] || "").trim() === "pastel" ? "pastel" : "classic";
    }
  }
  return "classic";
}

function setThemePresetSetting(ss, preset) {
  var settingsSheet = ss.getSheetByName("Settings") || ss.insertSheet("Settings");
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.appendRow(["key", "value"]);
  }
  var rows = settingsSheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim() === "theme_preset") {
      settingsSheet.getRange(i + 1, 2).setValue(preset);
      return;
    }
  }
  settingsSheet.appendRow(["theme_preset", preset]);
}

function doPost(e) {
  var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  var ss = getSpreadsheet();
  return handleWriteAction(ss, body);
}
