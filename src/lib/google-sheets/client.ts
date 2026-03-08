import { google } from 'googleapis';

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

export function getGoogleSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    return null; // Google Sheets not configured
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export function getSpreadsheetId(): string | null {
  return process.env.GOOGLE_SPREADSHEET_ID || null;
}
