const DATA_ENTRY_SHEET_NAME = "Sheet1";
const TIME_STAMP_COLUMN_NAME = "التاريخ والوقت";
const FOLDER_ID = ""; // ينشئ المجلد تلقائياً في Google Drive باسم "مرفوعات الاستمارة"

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      DATA_ENTRY_SHEET_NAME
    );
    if (!sheet) {
      throw new Error(`Sheet '${DATA_ENTRY_SHEET_NAME}' not found`);
    }

    const formData = e.postData.contents ? JSON.parse(e.postData.contents) : {};

    // معالجة ملف المستند العام
    let docFileInfo = null;
    if (formData.fileData) {
      docFileInfo = saveFile(formData.fileData);
      delete formData.fileData;
    }

    // معالجة ملف الصور العامة
    let photoFileInfo = null;
    if (formData.photoFileData) {
      photoFileInfo = saveFile(formData.photoFileData);
      delete formData.photoFileData;
    }

    // معالجة صورة تصميم التيشرت / الكوب
    let tshirtFileInfo = null;
    if (formData.tshirtFileData) {
      tshirtFileInfo = saveFile(formData.tshirtFileData);
      delete formData.tshirtFileData;
    }

    // تجهيز الصف المرفوع
    const rowData = {
      ...formData,
      [TIME_STAMP_COLUMN_NAME]: new Date().toLocaleString("ar-EG"),
    };

    if (docFileInfo) {
      rowData["رابط المستند"] = docFileInfo.url;
    }

    if (photoFileInfo) {
      rowData["رابط الصورة المرفوعة"] = photoFileInfo.url;
    }

    if (tshirtFileInfo) {
      rowData["رابط تصميم التيشرت/الكوب"] = tshirtFileInfo.url;
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
    if (FOLDER_ID && FOLDER_ID.trim() !== "") {
      try {
        folder = DriveApp.getFolderById(FOLDER_ID.trim());
      } catch (e) {}
    }
    
    if (!folder) {
      const folderName = "مرفوعات الاستمارة";
      const existingFolders = DriveApp.getFoldersByName(folderName);
      if (existingFolders.hasNext()) {
        folder = existingFolders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
      }
    }
    
    const file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingError) {}
    
    return {
      url: `https://drive.google.com/uc?export=view&id=${file.getId()}`,
      name: fileData.fileName,
    };
  } catch (error) {
    throw new Error("Failed to upload file: " + error.toString());
  }
}

function appendToGoogleSheet(data, sheet) {
  const lastCol = sheet.getLastColumn();
  let headers = [];
  
  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  headers = headers.map(h => h.toString().trim());

  if (headers.length === 0 || headers.every(h => h === "")) {
    const newHeaders = Object.keys(data);
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    headers = newHeaders;
  } else {
    const newKeys = Object.keys(data).filter(key => !headers.includes(key));
    if (newKeys.length > 0) {
      const nextCol = headers.length + 1;
      sheet.getRange(1, nextCol, 1, newKeys.length).setValues([newKeys]);
      headers = headers.concat(newKeys);
    }
  }

  const rowData = headers.map((header) => data[header] !== undefined ? data[header] : "");
  sheet.appendRow(rowData);
}
