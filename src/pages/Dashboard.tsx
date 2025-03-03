import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { app } from '../utils/firebaseConfig'; // Adjust path as needed
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AggregatedData {
  id: string;
  timestamp: any; // Firestore Timestamp
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
}

const Dashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<AggregatedData[]>([]);
  const db = getFirestore(app);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const collectionName = 'aggregatedAnalytics'; // Ensure this matches your Firestore collection name.
        // Get the latest 10 documents ordered by timestamp descending
        const q = query(collection(db, collectionName), orderBy('timestamp', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        const data: AggregatedData[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<AggregatedData, 'id'>)
        }));
        // Reverse the array so the oldest is first (for a natural time series)
        setAnalyticsData(data.reverse());
      } catch (error) {
        console.error('Error fetching aggregated analytics data:', error);
      }
    };

    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [db]);

  // Prepare data for the Line chart using the last 10 data points
  const chartData = {
    labels: analyticsData.map(item =>
      item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString() : 'N/A'
    ),
    datasets: [
      {
        label: 'Total Messages',
        data: analyticsData.map(item => item.totalMessages),
        fill: false,
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
      },
      {
        label: 'User Messages',
        data: analyticsData.map(item => item.userMessages),
        fill: false,
        backgroundColor: 'rgba(153,102,255,0.4)',
        borderColor: 'rgba(153,102,255,1)',
      },
      {
        label: 'AI Messages',
        data: analyticsData.map(item => item.aiMessages),
        fill: false,
        backgroundColor: 'rgba(255,159,64,0.4)',
        borderColor: 'rgba(255,159,64,1)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Messages Over Time (Last 10 Data Points)',
      },
    },
  };

  // For detailed copy, show only the last 2 data points (if available)
  const detailedData = analyticsData.slice(-2);

  // Calculate differences if there are two data points
  const diff = detailedData.length === 2 ? {
    totalDiff: detailedData[1].totalMessages - detailedData[0].totalMessages,
    userDiff: detailedData[1].userMessages - detailedData[0].userMessages,
    aiDiff: detailedData[1].aiMessages - detailedData[0].aiMessages,
  } : null;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Aggregated Analytics Dashboard</h2>
      {analyticsData.length === 0 ? (
        <p>No analytics data available yet. Please wait for the Cloud Function to run.</p>
      ) : (
        <>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Line data={chartData} options={options} />
          </div>
          <div style={{ marginTop: '20px' }}>
            <h3>Detailed Analytics (Last 2 Data Points)</h3>
            {detailedData.map((item, index) => (
              <div key={item.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
                <p>
                  <strong>Time:</strong> {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleString() : 'N/A'}
                </p>
                <p>
                  <strong>Total Messages:</strong> {item.totalMessages}{' '}
                  {index === 1 && diff && (
                    <span style={{ color: diff.totalDiff >= 0 ? 'green' : 'red' }}>
                      ({diff.totalDiff >= 0 ? `+${diff.totalDiff}` : diff.totalDiff})
                    </span>
                  )}
                </p>
                <p>
                  <strong>User Messages:</strong> {item.userMessages}{' '}
                  {index === 1 && diff && (
                    <span style={{ color: diff.userDiff >= 0 ? 'green' : 'red' }}>
                      ({diff.userDiff >= 0 ? `+${diff.userDiff}` : diff.userDiff})
                    </span>
                  )}
                </p>
                <p>
                  <strong>AI Messages:</strong> {item.aiMessages}{' '}
                  {index === 1 && diff && (
                    <span style={{ color: diff.aiDiff >= 0 ? 'green' : 'red' }}>
                      ({diff.aiDiff >= 0 ? `+${diff.aiDiff}` : diff.aiDiff})
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;