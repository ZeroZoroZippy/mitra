import { GoogleSpreadsheet } from 'google-spreadsheet';

// Initialize the Google Sheets API
const doc = new GoogleSpreadsheet('YOUR_SHEET_ID'); // Replace with your Google Sheet ID

// Function to authenticate with Google Sheets API
const authenticate = async () => {
  await doc.useServiceAccountAuth({
    client_email: 'YOUR_SERVICE_ACCOUNT_EMAIL', // Replace with your service account email
    private_key: 'YOUR_PRIVATE_KEY', // Replace with your private key
  });
};

// Function to log user details to Google Sheets
export const logUserDetailsToSheet = async (user) => {
  await authenticate();
  await doc.loadInfo(); // Load the document properties and worksheets

  const sheet = doc.sheetsByIndex[0]; // Get the first sheet
  await sheet.addRow({
    uid: user.uid,
    displayName: user.displayName || "Anonymous",
    email: user.email || "No Email",
    createdAt: new Date().toISOString(),
  });

  console.log("✅ User details logged to Google Sheets:", user);
};
