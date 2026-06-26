const SPREADSHEET_ID = "";

const ACTIONS = {
  events: {
    sheetName: "Events",
    fields: ["title", "date", "time", "address", "description", "link", "image", "imagealt"]
  },
  blog: {
    sheetName: "Blog",
    fields: ["title", "date", "summary", "link", "image", "imagealt"]
  },
  announcements: {
    sheetName: "Announcements",
    fields: ["title", "date", "summary", "link", "image", "imagealt"]
  }
};

function doGet(event) {
  const action = String(event?.parameter?.action || "").toLowerCase();

  try {
    if (!ACTIONS[action]) {
      return jsonResponse({
        error: "Unknown action.",
        allowedActions: Object.keys(ACTIONS)
      });
    }

    return jsonResponse(readSheet(ACTIONS[action]));
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error ? error.message : "Unknown content API error."
    });
  }
}

function readSheet(config) {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    return [];
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(normalizeHeader);

  return values
    .slice(1)
    .map((row) => rowToObject(headers, row, config.fields))
    .filter((item) => item.active)
    .map(({ active, ...item }) => item);
}

function rowToObject(headers, row, fields) {
  const item = {
    active: isActive(row[headers.indexOf("active")])
  };

  fields.forEach((field) => {
    const columnIndex = headers.indexOf(field);
    const value = columnIndex >= 0 ? row[columnIndex] : "";
    item[field] = formatField(field, value);
  });

  return item;
}

function formatField(field, value) {
  if (field === "date") {
    return formatDate(value);
  }

  if (field === "time") {
    return formatTime(value);
  }

  return String(value || "").trim();
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function isActive(value) {
  if (value === true) {
    return true;
  }

  return String(value || "").trim().toLowerCase() === "true";
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const timezone = Session.getScriptTimeZone();
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).trim();
  }

  return Utilities.formatDate(date, timezone, "MMMM d, yyyy");
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  if (!(value instanceof Date)) {
    return String(value).trim();
  }

  return Utilities.formatDate(value, Session.getScriptTimeZone(), "h:mm a");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
