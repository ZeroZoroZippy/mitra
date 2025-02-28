// File: landing_page/functions/src/init.ts
import * as admin from "firebase-admin";
if (!admin.apps.length) {
  admin.initializeApp();
}