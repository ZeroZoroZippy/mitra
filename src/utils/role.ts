// src/utils/roleUtils.ts

import { getAuth } from "./firebaseAuth"; // Adjust the import based on your firebase setup

export const isCreator = (): boolean => {
  const auth = getAuth();
  if (!auth) return false;

  const user = auth.currentUser;
  // Replace with your actual creator email.
  return user ? user.email === "yuvaanvithlani@gmail.com" : false;
};