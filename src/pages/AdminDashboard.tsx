import React, { useState, useEffect } from 'react';
import { 
  getTopUsers, 
  getLastActiveUser, 
  getUserActivityProfile,
  getPopularRooms,
  getPlatformAnalytics
} from '../utils/analytics';
import './AdminDashboard.css';

// You'll need to create this CSS file with your styling

const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [lastActiveUser, setLastActiveUser] = useState<any>(null);
  const [popularRooms, setPopularRooms] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    loadDashboardData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (selectedUser) {
      loadUserProfile(selectedUser);
    }
  }, [selectedUser]);
  
  const loadDashboardData = async () => {
    setIsLoading(true);
    
    try {
      const [stats, users, active, rooms] = await Promise.all([
        getPlatformAnalytics(),
        getTopUsers(10),
        getLastActiveUser(),
        getPopularRooms()
      ]);
      
      setPlatformStats(stats);
      setTopUsers(users);
      setLastActiveUser(active);
      setPopularRooms(rooms);
      
      // Auto-select the last active user if no user is selected
      if (!selectedUser && active) {
        setSelectedUser(active.userId);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    
    setIsLoading(false);
  };
  
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
                  <p>Last active: {formatDate(lastActiveUser.lastActive)}</p>
                  <p>Total messages: {lastActiveUser.totalMessages}</p>
                  <p>Sessions: {lastActiveUser.sessionCount}</p>
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
          
          <div className="dashboard-grid">
            {/* Top Users Section */}
            <div className="top-users-card">
              <h2>Top Users</h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
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
                      <td>{user.totalMessages}</td>
                      <td>{user.sessionCount}</td>
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
                <h3>Activity Over Time</h3>
                <div className="activity-chart">
                  {/* This would be a good place to add a chart component */}
                  {/* You could use recharts or another charting library */}
                  <p>Message activity chart would go here</p>
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