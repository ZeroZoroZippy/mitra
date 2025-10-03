// src/components/pages/AdminDashboard.tsx

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  where,
  Timestamp
} from 'firebase/firestore';
import { getFirebaseDb } from '../utils/firebaseConfig';
import { getUserActivityProfile } from '../utils/analytics';
import './AdminDashboard.css';

interface UserAnalytics {
  userId: string;
  displayName?: string;
  totalMessages: number;
  firstSeen: Timestamp;
  lastActive: Timestamp;
  roomsVisited: { [roomId: string]: number };
  sessionCount: number;
  averageSessionDuration: number;
  longestSession: number;
  messagesByDate: { [date: string]: number };
  messagesByRoom: { [roomId: string]: number };
}

interface RoomAnalytics {
  roomId: number;
  roomName: string;
  totalMessages: number;
  uniqueUsers: number;
  averageMessagesPerUser: number;
  mostActiveTime: string;
}

const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<UserAnalytics[]>([]);
  const [lastActiveUser, setLastActiveUser] = useState<UserAnalytics | null>(null);
  const [popularRooms, setPopularRooms] = useState<RoomAnalytics[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [guestAnalytics, setGuestAnalytics] = useState<any>(null);
  
  // Load dashboard with real-time listeners
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      console.error("Firebase Firestore not initialized");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Real-time listener for last active user
    const lastActiveQuery = query(
      collection(db, "userAnalytics"),
      orderBy("lastActive", "desc"),
      limit(1)
    );
    
    const lastActiveUnsubscribe = onSnapshot(lastActiveQuery, (snapshot) => {
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as UserAnalytics;
        setLastActiveUser(userData);
        
        // Auto-select the last active user if no user is selected
        if (!selectedUser) {
          setSelectedUser(userData.userId);
        }
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error in last active listener:", error);
      setIsLoading(false);
    });
    
    // Real-time listener for top users
    const topUsersQuery = query(
      collection(db, "userAnalytics"), 
      orderBy("totalMessages", "desc"), 
      limit(10)
    );
    
    const topUsersUnsubscribe = onSnapshot(topUsersQuery, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserAnalytics);
      setTopUsers(users);
    });
    
    // Real-time listener for popular rooms
    const popularRoomsQuery = query(
      collection(db, "roomAnalytics"), 
      orderBy("totalMessages", "desc"), 
      limit(7)
    );
    
    const popularRoomsUnsubscribe = onSnapshot(popularRoomsQuery, (snapshot) => {
      const rooms = snapshot.docs.map(doc => doc.data() as RoomAnalytics);
      setPopularRooms(rooms);
    });
    
    // Real-time listener for guest analytics
    const guestAnalyticsRef = doc(db, "statistics", "guestUsage");
    const guestAnalyticsUnsubscribe = onSnapshot(guestAnalyticsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGuestAnalytics({
          ...data,
          conversionRate: data.totalGuestAccounts > 0 
            ? (data.conversions / data.totalGuestAccounts * 100).toFixed(2) + '%' 
            : '0%',
          messagesPerGuest: data.totalGuestAccounts > 0
            ? (data.totalGuestMessages / data.totalGuestAccounts).toFixed(1)
            : '0'
        });
      } else {
        setGuestAnalytics(null);
      }
    }, (error) => {
      console.error("Error in guest analytics listener:", error);
    });
    
    // Platform stats listener (active users counts)
    const updatePlatformStats = async () => {
      try {
        // Get total users count
        const usersSnapshot = await getDocs(collection(db, "userAnalytics"));
        const totalUsers = usersSnapshot.size;
        
        // Get active users in last 24 hours
        const date24hAgo = new Date();
        date24hAgo.setHours(date24hAgo.getHours() - 24);
        
        const active24hQuery = query(
          collection(db, "userAnalytics"),
          where("lastActive", ">=", date24hAgo)
        );
        const active24hSnapshot = await getDocs(active24hQuery);
        const activeUsers24h = active24hSnapshot.size;
        
        // Get active users in last 7 days
        const date7dAgo = new Date();
        date7dAgo.setDate(date7dAgo.getDate() - 7);
        
        const active7dQuery = query(
          collection(db, "userAnalytics"),
          where("lastActive", ">=", date7dAgo)
        );
        const active7dSnapshot = await getDocs(active7dQuery);
        const activeUsers7d = active7dSnapshot.size;
        
        // Get total messages
        let totalMessages = 0;
        usersSnapshot.forEach(doc => {
          const userData = doc.data() as UserAnalytics;
          totalMessages += userData.totalMessages || 0;
        });
        
        // Get room count
        const roomsSnapshot = await getDocs(collection(db, "roomAnalytics"));
        const roomCount = roomsSnapshot.size;
        
        setPlatformStats({
          totalUsers,
          activeUsers24h,
          activeUsers7d,
          totalMessages,
          roomCount,
          averageMessagesPerUser: totalUsers > 0 ? totalMessages / totalUsers : 0
        });
      } catch (error) {
        console.error("Error updating platform stats:", error);
      }
    };
    
    // Initial platform stats load
    updatePlatformStats();
    
    // Set up interval for platform stats (these queries are heavier)
    const platformStatsInterval = setInterval(updatePlatformStats, 60000);
    
    // Cleanup all listeners on unmount
    return () => {
      lastActiveUnsubscribe();
      topUsersUnsubscribe();
      popularRoomsUnsubscribe();
      guestAnalyticsUnsubscribe();
      clearInterval(platformStatsInterval);
    };
  }, []);
  
  // Load user profile when selected user changes
  useEffect(() => {
    if (selectedUser) {
      loadUserProfile(selectedUser);
    }
  }, [selectedUser]);
  
  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await getUserActivityProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };
  
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };
  
  const formatTimeAgo = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (minutes < 24 * 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(minutes / (24 * 60));
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };
  
  return (
    <div className="admin-dashboard">
      <h1>Saarth Admin Dashboard</h1>
      
      {isLoading && <div className="loading">Loading dashboard data...</div>}
      
      {!isLoading && (
        <>
          <div className="dashboard-grid">
            {/* Platform Statistics Section */}
            <div className="stats-card">
              <h2>Platform Overview</h2>
              {platformStats && (
                <div className="stats-grid">
                  <div className="stat-item">
                    <h3>Total Users</h3>
                    <p>{platformStats.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className="stat-item">
                    <h3>Total Messages</h3>
                    <p>{platformStats.totalMessages.toLocaleString()}</p>
                  </div>
                  <div className="stat-item">
                    <h3>Active (24h)</h3>
                    <p>{platformStats.activeUsers24h.toLocaleString()}</p>
                  </div>
                  <div className="stat-item">
                    <h3>Active (7d)</h3>
                    <p>{platformStats.activeUsers7d.toLocaleString()}</p>
                  </div>
                  <div className="stat-item">
                    <h3>Rooms</h3>
                    <p>{platformStats.roomCount}</p>
                  </div>
                  <div className="stat-item">
                    <h3>Avg. Messages/User</h3>
                    <p>{platformStats.averageMessagesPerUser.toFixed(1)}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Last Active User Card */}
            <div className="user-card">
              <h2>Last Active User</h2>
              {lastActiveUser ? (
                <div className="last-active-user">
                  <h3>{lastActiveUser.displayName || 'Anonymous'}</h3>
                  <p><strong>ID:</strong> {lastActiveUser.userId}</p>
                  <p><strong>Last active:</strong> {formatDate(lastActiveUser.lastActive)}</p>
                  <p><strong>Total messages:</strong> {lastActiveUser.totalMessages || 0}</p>
                  <p><strong>Sessions:</strong> {lastActiveUser.sessionCount || 0}</p>
                  <button 
                    onClick={() => setSelectedUser(lastActiveUser.userId)}
                    className="view-profile-btn"
                  >
                    View Full Profile
                  </button>
                </div>
              ) : (
                <p>No active users found</p>
              )}
            </div>
          </div>

          {/* Guest Analytics Card */}
          <div className="stats-card">
            <h2>Guest User Analytics</h2>
            {guestAnalytics ? (
              <div className="stats-grid">
                <div className="stat-item">
                  <h3>Guest Accounts</h3>
                  <p>{guestAnalytics.totalGuestAccounts?.toLocaleString() || 0}</p>
                </div>
                <div className="stat-item">
                  <h3>Messages Sent</h3>
                  <p>{guestAnalytics.totalGuestMessages?.toLocaleString() || 0}</p>
                </div>
                <div className="stat-item">
                  <h3>Conversions</h3>
                  <p>{guestAnalytics.conversions?.toLocaleString() || 0}</p>
                </div>
                <div className="stat-item">
                  <h3>Conversion Rate</h3>
                  <p>{guestAnalytics.conversionRate || '0%'}</p>
                </div>
                <div className="stat-item">
                  <h3>Msgs/Guest</h3>
                  <p>{guestAnalytics.messagesPerGuest || '0'}</p>
                </div>
                <div className="stat-item">
                  <h3>Last Updated</h3>
                  <p>{formatDate(guestAnalytics.lastUpdated)}</p>
                </div>
              </div>
            ) : (
              <p>Loading guest analytics...</p>
            )}
          </div>
          
          <div className="dashboard-grid">
            {/* Top Users Section */}
            <div className="top-users-card">
              <h2>Top Users</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>ID</th>
                    <th>Messages</th>
                    <th>Sessions</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map(user => (
                    <tr key={user.userId}>
                      <td>{user.displayName || 'Anonymous'}</td>
                      <td>{user.userId.slice(0, 8)}...</td>
                      <td>{user.totalMessages || 0}</td>
                      <td>{user.sessionCount || 0}</td>
                      <td>{formatDate(user.lastActive)}</td>
                      <td>
                        <button 
                          onClick={() => setSelectedUser(user.userId)}
                          className="view-btn"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Popular Rooms Section */}
            <div className="popular-rooms-card">
              <h2>Popular Rooms</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Messages</th>
                    <th>Users</th>
                    <th>Avg Messages/User</th>
                    <th>Most Active Time</th>
                  </tr>
                </thead>
                <tbody>
                  {popularRooms.map(room => (
                    <tr key={room.roomId}>
                      <td>{room.roomName}</td>
                      <td>{room.totalMessages}</td>
                      <td>{room.uniqueUsers}</td>
                      <td>{room.averageMessagesPerUser.toFixed(1)}</td>
                      <td>{room.mostActiveTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* User Profile Section */}
          {selectedUser && userProfile && (
            <div className="user-profile-card">
              <h2>User Profile: {userProfile.displayName || 'Anonymous'}</h2>
              
              <div className="profile-grid">
                <div className="profile-metrics">
                  <h3>User Metrics</h3>
                  <table className="metrics-table">
                    <tbody>
                      <tr>
                        <td>User ID:</td>
                        <td>{userProfile.userId}</td>
                      </tr>
                      <tr>
                        <td>First Seen:</td>
                        <td>{formatDate(userProfile.firstSeen)}</td>
                      </tr>
                      <tr>
                        <td>Last Active:</td>
                        <td>{formatDate(userProfile.lastActive)} ({formatTimeAgo(userProfile.minutesSinceActive)})</td>
                      </tr>
                      <tr>
                        <td>Total Messages:</td>
                        <td>{userProfile.totalMessages}</td>
                      </tr>
                      <tr>
                        <td>Total Sessions:</td>
                        <td>{userProfile.sessionCount}</td>
                      </tr>
                      <tr>
                        <td>Avg. Session Duration:</td>
                        <td>{userProfile.averageSessionDuration?.toFixed(1)} minutes</td>
                      </tr>
                      <tr>
                        <td>Longest Session:</td>
                        <td>{userProfile.longestSession?.toFixed(1)} minutes</td>
                      </tr>
                      <tr>
                        <td>Days on Platform:</td>
                        <td>{userProfile.daysSinceFirstSeen}</td>
                      </tr>
                      <tr>
                        <td>Preferred Room:</td>
                        <td>
                          {userProfile.preferredRoom ? (
                            <>
                              Room {userProfile.preferredRoom.roomId} 
                              ({userProfile.preferredRoom.visits} visits)
                            </>
                          ) : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td>Avg. Messages/Day:</td>
                        <td>{userProfile.messageRate?.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="room-usage">
                  <h3>Room Usage</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Room ID</th>
                        <th>Visits</th>
                        <th>Messages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(userProfile.roomsVisited || {}).map(([roomId, visits]: [string, any]) => (
                        <tr key={roomId}>
                          <td>Room {roomId}</td>
                          <td>{visits}</td>
                          <td>{userProfile.messagesByRoom?.[roomId] || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="activity-over-time">
                <h3>Activity Timeline</h3>
                <div className="activity-chart">
                  <p>Last active: {formatTimeAgo(userProfile.minutesSinceActive)}</p>
                  <p>First seen: {userProfile.daysSinceFirstSeen} days ago</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;