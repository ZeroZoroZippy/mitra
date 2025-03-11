import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    Timestamp
  } from "firebase/firestore";
  import { db, getUserProfile } from "./firebaseDb";
  import { auth } from "./firebaseConfig";
  
  // Data structures
  export interface UserAnalytics {
    userId: string;
    displayName?: string;
    totalMessages: number;
    firstSeen: Timestamp;
    lastActive: Timestamp;
    roomsVisited: { [roomId: string]: number };
    sessionCount: number;
    averageSessionDuration: number; // in minutes
    longestSession: number; // in minutes
    messagesByDate: { [date: string]: number };
    messagesByRoom: { [roomId: string]: number };
    lastRoomId?: number;
    currentSessionStart?: Timestamp;
  }
  
  export interface RoomAnalytics {
    roomId: number;
    roomName: string;
    totalMessages: number;
    uniqueUsers: number;
    averageMessagesPerUser: number;
    mostActiveTime: string; // hour of day in format "HH:00"
    messagesByHour: { [hour: string]: number };
    messagesByDate: { [date: string]: number };
  }
  
  // Session timeout in milliseconds (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  
  // CORE TRACKING FUNCTIONS
  
  /**
   * Tracks user activity when they open the app or change rooms
   */
  export const trackUserActivity = async (userId: string, roomId: number, roomName: string) => {
    if (!userId) return;
    
    const userRef = doc(db, "userAnalytics", userId);
    const roomRef = doc(db, "roomAnalytics", roomId.toString());
    const now = serverTimestamp();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = `${new Date().getHours().toString().padStart(2, '0')}:00`;
    
    try {
      // Get user profile for display name
      const userProfile = await getUserProfile(userId);
      const displayName = userProfile?.displayName || "Anonymous";
      
      // Update user analytics
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data() as UserAnalytics;
        const lastActive = data.lastActive?.toDate() || new Date(0);
        const timeSinceLastActive = Date.now() - lastActive.getTime();
        
        // Check if this is a new session
        const isNewSession = timeSinceLastActive > SESSION_TIMEOUT;
        
        // Calculate session duration if ending a session
        let sessionDuration = 0;
        let totalSessionDuration = data.averageSessionDuration * data.sessionCount || 0;
        
        if (isNewSession && data.currentSessionStart) {
          sessionDuration = (lastActive.getTime() - data.currentSessionStart.toDate().getTime()) / 60000;
          totalSessionDuration += sessionDuration;
        }
        
        // Update room visits
        const roomVisits = data.roomsVisited || {};
        const messagesByRoom = data.messagesByRoom || {};
        
        // Update analytics record
        await updateDoc(userRef, {
          lastActive: now,
          lastRoomId: roomId,
          displayName,
          roomsVisited: { 
            ...roomVisits, 
            [roomId]: (roomVisits[roomId] || 0) + 1 
          },
          sessionCount: isNewSession ? (data.sessionCount || 0) + 1 : (data.sessionCount || 0),
          averageSessionDuration: isNewSession && data.sessionCount ? 
            totalSessionDuration / (data.sessionCount + 1) : 
            data.averageSessionDuration || 0,
          longestSession: Math.max(
            data.longestSession || 0, 
            isNewSession ? sessionDuration : 0
          ),
          currentSessionStart: isNewSession ? now : data.currentSessionStart,
        });
      } else {
        // Create new user analytics record
        await setDoc(userRef, {
          userId,
          displayName,
          totalMessages: 0,
          firstSeen: now,
          lastActive: now,
          roomsVisited: { [roomId]: 1 },
          sessionCount: 1,
          averageSessionDuration: 0,
          longestSession: 0,
          messagesByDate: { [today]: 0 },
          messagesByRoom: { [roomId]: 0 },
          lastRoomId: roomId,
          currentSessionStart: now
        });
      }
  
      // Update room analytics
      const roomSnap = await getDoc(roomRef);
      
      if (roomSnap.exists()) {
        const roomData = roomSnap.data() as RoomAnalytics;
        
        // Update messagesByHour
        const messagesByHour = roomData.messagesByHour || {};
        const messagesByDate = roomData.messagesByDate || {};
        
        await updateDoc(roomRef, {
          messagesByHour: { 
            ...messagesByHour,
            [hour]: (messagesByHour[hour] || 0) 
          },
          messagesByDate: {
            ...messagesByDate,
            [today]: (messagesByDate[today] || 0)
          }
        });
      } else {
        // Create new room analytics record
        await setDoc(roomRef, {
          roomId,
          roomName,
          totalMessages: 0,
          uniqueUsers: 1,
          averageMessagesPerUser: 0,
          mostActiveTime: hour,
          messagesByHour: { [hour]: 0 },
          messagesByDate: { [today]: 0 }
        });
      }
      
      return true;
    } catch (error) {
      console.error("Error tracking user activity:", error);
      return false;
    }
  };
  
  /**
   * Tracks when a message is sent, updating counts for both user and room
   */
  export const trackMessage = async (userId: string, roomId: number, messageText: string) => {
    if (!userId) return;
    
    const userRef = doc(db, "userAnalytics", userId);
    const roomRef = doc(db, "roomAnalytics", roomId.toString());
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = `${new Date().getHours().toString().padStart(2, '0')}:00`;
    
    try {
      // Update user analytics
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data() as UserAnalytics;
        const messagesByDate = data.messagesByDate || {};
        const messagesByRoom = data.messagesByRoom || {};
        
        await updateDoc(userRef, {
          totalMessages: increment(1),
          lastActive: serverTimestamp(),
          messagesByDate: {
            ...messagesByDate,
            [today]: (messagesByDate[today] || 0) + 1
          },
          messagesByRoom: {
            ...messagesByRoom,
            [roomId]: (messagesByRoom[roomId] || 0) + 1
          }
        });
        
        // Update room analytics
        const roomSnap = await getDoc(roomRef);
        
        if (roomSnap.exists()) {
          const roomData = roomSnap.data() as RoomAnalytics;
          const messagesByHour = roomData.messagesByHour || {};
          const messagesByDate = roomData.messagesByDate || {};
          const newTotalMessages = (roomData.totalMessages || 0) + 1;
          
          // Check if this is a new user for this room
          let uniqueUsers = roomData.uniqueUsers || 0;
          if (!data.roomsVisited || !data.roomsVisited[roomId]) {
            uniqueUsers++;
          }
          
          await updateDoc(roomRef, {
            totalMessages: newTotalMessages,
            uniqueUsers,
            averageMessagesPerUser: uniqueUsers > 0 ? newTotalMessages / uniqueUsers : 0,
            messagesByHour: {
              ...messagesByHour,
              [hour]: (messagesByHour[hour] || 0) + 1
            },
            messagesByDate: {
              ...messagesByDate,
              [today]: (messagesByDate[today] || 0) + 1
            }
          });
          
          // Update the most active hour if this hour now has more messages
          if ((messagesByHour[hour] || 0) + 1 > (messagesByHour[roomData.mostActiveTime] || 0)) {
            await updateDoc(roomRef, {
              mostActiveTime: hour
            });
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error tracking message:", error);
      return false;
    }
  };
  
  // ANALYTICS QUERY FUNCTIONS
  
  /**
   * Gets the top users by message count
   */
  export const getTopUsers = async (limitCount = 10) => {
    try {
      const q = query(
        collection(db, "userAnalytics"), 
        orderBy("totalMessages", "desc"), 
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as UserAnalytics);
    } catch (error) {
      console.error("Error getting top users:", error);
      return [];
    }
  };
  
  /**
   * Gets the most recently active user
   */
  export const getLastActiveUser = async () => {
    try {
      const q = query(
        collection(db, "userAnalytics"), 
        orderBy("lastActive", "desc"), 
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.length > 0 ? 
        snapshot.docs[0].data() as UserAnalytics : null;
    } catch (error) {
      console.error("Error getting last active user:", error);
      return null;
    }
  };
  
  /**
   * Gets a user's activity metrics with time gap calculation
   */
  export const getUserActivityProfile = async (userId: string) => {
    try {
      const userRef = doc(db, "userAnalytics", userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return null;
      
      const data = userSnap.data() as UserAnalytics;
      const now = new Date();
      const lastActive = data.lastActive.toDate();
      const firstSeen = data.firstSeen.toDate();
      
      // Calculate time gaps
      const minutesSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / 60000);
      const daysSinceFirstSeen = Math.floor((now.getTime() - firstSeen.getTime()) / (24 * 60 * 60 * 1000));
      
      // Get preferred room (most visited)
      const preferredRoom = Object.entries(data.roomsVisited || {})
        .sort((a, b) => b[1] - a[1])
        .map(([roomId, visits]) => ({ 
          roomId: parseInt(roomId), 
          visits 
        }))[0];
      
      return {
        ...data,
        minutesSinceActive,
        hoursSinceActive: Math.floor(minutesSinceActive / 60),
        daysSinceActive: Math.floor(minutesSinceActive / (60 * 24)),
        daysSinceFirstSeen,
        preferredRoom,
        messageRate: daysSinceFirstSeen > 0 ? 
          data.totalMessages / daysSinceFirstSeen : 
          data.totalMessages
      };
    } catch (error) {
      console.error("Error getting user activity profile:", error);
      return null;
    }
  };
  
  /**
   * Gets most popular rooms
   */
  export const getPopularRooms = async (limitCount = 7) => {
    try {
      const q = query(
        collection(db, "roomAnalytics"), 
        orderBy("totalMessages", "desc"), 
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as RoomAnalytics);
    } catch (error) {
      console.error("Error getting popular rooms:", error);
      return [];
    }
  };
  
  /**
   * Gets overall platform analytics
   */
  export const getPlatformAnalytics = async () => {
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(db, "userAnalytics"));
      const users = usersSnapshot.docs.map(doc => doc.data() as UserAnalytics);
      
      // Get all rooms
      const roomsSnapshot = await getDocs(collection(db, "roomAnalytics"));
      const rooms = roomsSnapshot.docs.map(doc => doc.data() as RoomAnalytics);
      
      // Calculate overall statistics
      const totalUsers = users.length;
      const totalMessages = users.reduce((sum, user) => sum + user.totalMessages, 0);
      const activeUsers24h = users.filter(
        user => (Date.now() - user.lastActive.toDate().getTime()) < 24 * 60 * 60 * 1000
      ).length;
      const activeUsers7d = users.filter(
        user => (Date.now() - user.lastActive.toDate().getTime()) < 7 * 24 * 60 * 60 * 1000
      ).length;
      
      // Get activity by date
      const activityByDate = {};
      users.forEach(user => {
        Object.entries(user.messagesByDate || {}).forEach(([date, count]) => {
          activityByDate[date] = (activityByDate[date] || 0) + count;
        });
      });
      
      // Sort dates and get last 30 days
      const sortedDates = Object.keys(activityByDate).sort();
      const last30Days = sortedDates.slice(-30);
      const last30DaysActivity = last30Days.map(date => ({
        date,
        count: activityByDate[date] || 0
      }));
      
      return {
        totalUsers,
        totalMessages,
        activeUsers24h,
        activeUsers7d,
        averageMessagesPerUser: totalUsers > 0 ? totalMessages / totalUsers : 0,
        roomCount: rooms.length,
        last30DaysActivity,
        mostPopularRoom: rooms.length > 0 ? 
          rooms.sort((a, b) => b.totalMessages - a.totalMessages)[0] : null
      };
    } catch (error) {
      console.error("Error getting platform analytics:", error);
      return null;
    }
  };
  
  // INTEGRATION FUNCTIONS
  
  /**
   * Tracks a user session start
   * Call this when a user logs in or opens the app
   */
  export const trackSessionStart = async () => {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
      // Get last active room or default to room 1
      const userRef = doc(db, "userAnalytics", user.uid);
      const userSnap = await getDoc(userRef);
      const lastRoomId = userSnap.exists() ? 
        (userSnap.data() as UserAnalytics).lastRoomId || 1 : 1;
      
      // Get room name
      const roomNames = {
        1: "Companion",
        2: "Love & Connections",
        3: "Dreams & Manifestations",
        4: "Healing & Emotional Release",
        5: "Purpose & Ambition",
        6: "Mental Well-Being",
        7: "Creativity & Expression"
      };
      
      const roomName = roomNames[lastRoomId] || "Unknown";
      
      return trackUserActivity(user.uid, lastRoomId, roomName);
    } catch (error) {
      console.error("Error tracking session start:", error);
      return false;
    }
  };
  
  /**
   * Tracks a user session end
   * Call this when a user logs out or closes the app
   */
  export const trackSessionEnd = async () => {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
      const userRef = doc(db, "userAnalytics", user.uid);
      
      await updateDoc(userRef, {
        lastActive: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error("Error tracking session end:", error);
      return false;
    }
  };
  
  // Export helper functions for admin dashboard
  export {
    SESSION_TIMEOUT
  };