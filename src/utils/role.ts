// src/utils/roleUtils.ts

import { auth } from "./firebaseAuth"; // Adjust the import based on your firebase setup

export const isCreator = (): boolean => {
  const user = auth.currentUser;
  // Replace with your actual creator email.
  return user ? user.email === "yuvaanvithlani@gmail.com" : false;
};