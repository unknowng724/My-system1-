const DATA_ENTRY_SHEET_NAME = "Sheet1";
const TIME_STAMP_COLUMN_NAME = "التاريخ والوقت";
const FOLDER_ID = ""; // Enter your Google Drive Folder ID here, or leave it empty for auto-creation
const FILE_LINK_COLUMN_NAME = "رابط الملف";
const UPLOADED_FILE_NAME_COLUMN = "اسم الملف المرفوع";

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      DATA_ENTRY_SHEET_NAME
    );
    if (!sheet) {
      throw new Error(`Sheet '${DATA_ENTRY_SHEET_NAME}' not found`);
    }

    const formData = e.postData.contents ? JSON.parse(e.postData.contents) : {};

    let fileInfo = null;
    if (formData.fileData) {
      fileInfo = saveFile(formData.fileData);
      delete formData.fileData;
    }

    const rowData = {
      ...formData,
      [TIME_STAMP_COLUMN_NAME]: new Date().toLocaleString("ar-EG"),
    };

    if (fileInfo) {
      rowData[FILE_LINK_COLUMN_NAME] = fileInfo.url;
      rowData[UPLOADED_FILE_NAME_COLUMN] = fileInfo.name;
    }

    appendToGoogleSheet(rowData, sheet);

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "success",
        message: "شكراً لتعاونكم! تم استلام بياناتكم وحفظها بنجاح.",
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "error",
        message: error.toString(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveFile(fileData) {
  try {
    const blob = Utilities.newBlob(
      Utilities.base64Decode(fileData.data),
      fileData.mimeType,
      fileData.fileName
    );
    
    let folder = null;
    
    if (FOLDER_ID && FOLDER_ID.trim() !== "" && FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE") {
      try {
        folder = DriveApp.getFolderById(FOLDER_ID.trim());
      } catch (folderError) {
        console.warn("Specified FOLDER_ID was not found or has no access. Creating fallback folder.");
      }
    }
    
    if (!folder) {
      const fallbackFolderName = "مرفوعات الاستمارة";
      const existingFolders = DriveApp.getFoldersByName(fallbackFolderName);
      if (existingFolders.hasNext()) {
        folder = existingFolders.next();
      } else {
        folder = DriveApp.createFolder(fallbackFolderName);
      }
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      url: `https://drive.google.com/uc?export=view&id=${file.getId()}`,
      name: fileData.fileName,
    };
  } catch (error) {
    console.error("File upload process failed:", error);
    throw new Error("Failed to upload file: " + error.toString());
  }
}

function appendToGoogleSheet(data, sheet) {
  let headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];

  if (headers.length === 0 || headers[0] === "") {
    const newHeaders = Object.keys(data);
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    headers = newHeaders;
  }

  const rowData = headers.map((header) => data[header] !== undefined ? data[header] : "");
  sheet.appendRow(rowData);
}