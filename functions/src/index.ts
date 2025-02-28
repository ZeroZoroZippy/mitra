import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

// Constants
const ANOMALY_THRESHOLD = 100;

// Type definitions
interface MessageData {
  sender: string;
  content: string;
  timestamp: admin.firestore.Timestamp;
  sentimentScore?: number;
}

interface AggregatedData {
  timestamp: admin.firestore.FieldValue;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  averageSentiment: number;
  messagesWithSentiment: number;
  averageInterval: number;
  peakHour: number;
  peakCount: number;
  hourCounts: number[];
  totalSentiment: number;
}

interface LastAggregationData {
  timestamp: admin.firestore.Timestamp;
  lastAggregationId?: string;
}

// Simple sentiment analysis function using word lists
function simpleSentimentAnalysis(text: string): number {
  const positiveWords = [
    "good", "great", "excellent", "wonderful", "amazing", "love", "happy", 
    "helpful", "beautiful", "best", "fantastic", "perfect", "thank", "thanks",
    "appreciate", "nice", "awesome", "enjoy", "pleased", "satisfied"
  ];
  
  const negativeWords = [
    "bad", "terrible", "awful", "horrible", "hate", "dislike", "poor", 
    "disappointing", "worst", "annoying", "useless", "problem", "difficult", 
    "frustrating", "angry", "sad", "unfortunately", "error", "issue", "broken"
  ];

  // Normalize text
  const normalizedText = text.toLowerCase();
  const words = normalizedText.match(/\b\w+\b/g) || [];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Count positive and negative words
  for (const word of words) {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  }
  
  // Calculate sentiment score between -1 and 1
  const totalWords = words.length;
  if (totalWords === 0) return 0;
  
  const positiveScore = positiveCount / totalWords;
  const negativeScore = negativeCount / totalWords;
  
  return positiveScore - negativeScore;
}

/**
 * Aggregate data from all "messages" subcollections.
 * Uses incremental aggregation to improve performance.
 */
async function aggregateData(): Promise<AggregatedData> {
  try {
    // Get timestamp of last aggregation
    const lastAggregationRef = db.collection("system").doc("lastAggregation");
    const lastAggregationDoc = await lastAggregationRef.get();
    
    let lastTimestamp: admin.firestore.Timestamp | null = null;
    
    if (lastAggregationDoc.exists) {
      const data = lastAggregationDoc.data() as LastAggregationData | undefined;
      lastTimestamp = data?.timestamp || null;
    }

    // Create a query based on the last timestamp
    let messagesQuery: admin.firestore.Query = db.collectionGroup("messages");
    
    if (lastTimestamp) {
      messagesQuery = messagesQuery.where("timestamp", ">", lastTimestamp);
    }
    
    const messagesSnapshot = await messagesQuery.get();
    
    // Get the latest aggregated data
    const latestAggregationSnapshot = await db
      .collection("aggregatedAnalytics")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();
    
    // Initialize counters
    let totalMessages = 0;
    let userMessages = 0;
    let aiMessages = 0;
    let totalSentiment = 0;
    let messagesWithSentiment = 0;
    let messageIntervals: number[] = [];
    let lastMessageTime: Date | null = null;
    const hourCounts: number[] = new Array(24).fill(0);
    
    // Use last aggregation as starting point if available
    if (!lastTimestamp && !latestAggregationSnapshot.empty) {
      const latestData = latestAggregationSnapshot.docs[0].data() as Partial<AggregatedData>;
      totalMessages = latestData.totalMessages || 0;
      userMessages = latestData.userMessages || 0;
      aiMessages = latestData.aiMessages || 0;
      totalSentiment = latestData.totalSentiment as number || 0;
      messagesWithSentiment = latestData.messagesWithSentiment || 0;
      
      if (latestData.hourCounts) {
        for (let i = 0; i < 24; i++) {
          hourCounts[i] = latestData.hourCounts[i] || 0;
        }
      }
    }

    // Process new messages
    messagesSnapshot.forEach((doc) => {
      const data = doc.data() as MessageData;
      totalMessages++;
      
      // Count by sender
      if (data.sender === "user") {
        userMessages++;
        
        // Calculate sentiment for user messages with content
        if (data.content && data.content.length >= 10) {
          const score = simpleSentimentAnalysis(data.content);
          totalSentiment += score;
          messagesWithSentiment++;
          
          // Update the message with sentiment if not already set
          if (data.sentimentScore === undefined) {
            doc.ref.update({ sentimentScore: score }).catch(err => 
              console.error(`Error updating sentiment for message ${doc.id}: ${err}`)
            );
          }
        }
      } else if (data.sender === "assistant") {
        aiMessages++;
      }
      
      // Track message timing
      if (data.timestamp) {
        // Count by hour
        const messageDate = data.timestamp.toDate();
        const hour = messageDate.getHours();
        hourCounts[hour]++;
        
        // Calculate intervals between messages
        if (lastMessageTime) {
          const interval = messageDate.getTime() - lastMessageTime.getTime();
          messageIntervals.push(interval);
        }
        lastMessageTime = messageDate;
      }
    });

    // Calculate average sentiment
    const averageSentiment = messagesWithSentiment > 0 
      ? totalSentiment / messagesWithSentiment 
      : 0;
    
    // Calculate average interval
    const averageInterval = messageIntervals.length > 0 
      ? messageIntervals.reduce((sum, interval) => sum + interval, 0) / messageIntervals.length 
      : 0;
    
    // Find peak hour
    let peakHour = 0;
    let peakCount = 0;
    for (let i = 0; i < 24; i++) {
      if (hourCounts[i] > peakCount) {
        peakCount = hourCounts[i];
        peakHour = i;
      }
    }

    // Create an aggregated analytics object
    const aggregatedData: AggregatedData = {
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      totalMessages,
      userMessages,
      aiMessages,
      averageSentiment,
      messagesWithSentiment,
      averageInterval,
      peakHour,
      peakCount,
      hourCounts,
      totalSentiment
    };

    // Store the aggregated data
    const docRef = await db.collection("aggregatedAnalytics").add(aggregatedData);
    
    // Update the last aggregation timestamp
    await lastAggregationRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      lastAggregationId: docRef.id
    });

    console.log("Aggregation completed successfully.", aggregatedData);
    return aggregatedData;
  } catch (err) {
    console.error("Error in aggregateData:", err);
    const error = err as Error;
    throw new Error(`Aggregation failed: ${error.message}`);
  }
}

/**
 * Scheduled Cloud Function to run aggregation every 60 minutes.
 */
export const hourlyDataIngestion = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "America/New_York",
    memory: "256MiB"  // Explicitly set memory 
  },
  async (event: ScheduledEvent) => {
    try {
      await aggregateData();
      console.log("Hourly data ingestion completed successfully.");
    } catch (err) {
      console.error("Error in hourly data ingestion:", err);
      const error = err as Error;
      throw new Error(`Data ingestion failed: ${error.message}`);
    }
  }
);

/**
 * HTTP-triggered function for testing the aggregation manually.
 */
export const testAggregation = onRequest(
  {
    cors: true,
    memory: "256MiB"  // Explicitly set memory 
  },
  async (req, res) => {
    try {
      const aggregatedData = await aggregateData();
      res
        .status(200)
        .send(
          "Aggregation completed successfully: " +
            JSON.stringify(aggregatedData)
        );
    } catch (err) {
      console.error("Error in test aggregation:", err);
      const error = err as Error;
      res.status(500).send(`Aggregation test failed: ${error.message}`);
    }
  }
);

/**
 * HTTP API endpoint to generate a technical analytics summary.
 */
export const getTechSummary = onRequest(
  {
    cors: true,
    memory: "256MiB"  // Explicitly set memory 
  },
  async (req, res) => {
    // Set CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      // Query the last 10 documents from "aggregatedAnalytics", ordered by timestamp descending
      const snapshot = await db
        .collection("aggregatedAnalytics")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      if (snapshot.empty) {
        res.status(200).json({ summary: "No analytics data available." });
        return;
      }

      // Map documents and reverse the array to have the oldest first
      const docs = snapshot.docs.map((doc) => doc.data() as AggregatedData);
      const data = docs.reverse();

      let summary = "";
      if (data.length >= 2) {
        const older = data[data.length - 2];
        const latest = data[data.length - 1];

        // Calculate differences between the latest two data points
        const totalDiff = latest.totalMessages - older.totalMessages;
        const userDiff = latest.userMessages - older.userMessages;
        const aiDiff = latest.aiMessages - older.aiMessages;

        // Format sentiment and time data
        const sentimentText = latest.messagesWithSentiment > 0 
          ? `${latest.averageSentiment.toFixed(2)} (${latest.averageSentiment > 0 ? 'Positive' : 'Negative'})` 
          : 'No data';
        
        const avgIntervalMinutes = latest.averageInterval ? (latest.averageInterval / 60000).toFixed(1) : 'No data';
        
        // Format peak hour in 12-hour format
        const peakHourFormatted = latest.peakHour !== undefined ? 
          `${latest.peakHour % 12 || 12}${latest.peakHour < 12 ? 'AM' : 'PM'}` : 
          'No data';

        // Helper function to format differences with bold text and emojis
        const formatDiff = (num: number) =>
          num >= 0 ? `**+${num}** 📈` : `**${num}** 📉`;

        summary = `**Technical Analytics Summary**:\n\n`;
        summary += `**Total Messages:** ${latest.totalMessages} (${formatDiff(totalDiff)})\n`;
        summary += `**User Messages:** ${latest.userMessages} (${formatDiff(userDiff)})\n`;
        summary += `**AI Messages:** ${latest.aiMessages} (${formatDiff(aiDiff)})\n`;
        summary += `**Average Sentiment:** ${sentimentText}\n`;
        summary += `**Average Response Time:** ${avgIntervalMinutes} minutes\n`;
        summary += `**Peak Activity Hour:** ${peakHourFormatted}\n`;
      } else {
        // If there's only one data point, simply display its values
        const latest = data[data.length - 1];
        
        // Format sentiment and time data
        const sentimentText = latest.messagesWithSentiment > 0 
          ? `${latest.averageSentiment.toFixed(2)} (${latest.averageSentiment > 0 ? 'Positive' : 'Negative'})` 
          : 'No data';
        
        const avgIntervalMinutes = latest.averageInterval ? (latest.averageInterval / 60000).toFixed(1) : 'No data';
        
        // Format peak hour in 12-hour format
        const peakHourFormatted = latest.peakHour !== undefined ? 
          `${latest.peakHour % 12 || 12}${latest.peakHour < 12 ? 'AM' : 'PM'}` : 
          'No data';
        
        summary = `**Latest Analytics**:\n\n`;
        summary += `**Total Messages:** ${latest.totalMessages}\n`;
        summary += `**User Messages:** ${latest.userMessages}\n`;
        summary += `**AI Messages:** ${latest.aiMessages}\n`;
        summary += `**Average Sentiment:** ${sentimentText}\n`;
        summary += `**Average Response Time:** ${avgIntervalMinutes} minutes\n`;
        summary += `**Peak Activity Hour:** ${peakHourFormatted}\n`;
      }

      // Anomaly detection
      if (data.length >= 1) {
        // Message volume anomaly
        if (data[data.length - 1].totalMessages > ANOMALY_THRESHOLD) {
          summary += `\n⚠️ **Anomaly Detected:** Total messages exceed ${ANOMALY_THRESHOLD}.\n`;
        }
        
        // Sentiment anomaly (extremely negative sentiment)
        if (data[data.length - 1].averageSentiment < -0.5 && data[data.length - 1].messagesWithSentiment > 5) {
          summary += `⚠️ **Anomaly Detected:** Unusually negative sentiment detected.\n`;
        }
        
        // Response time anomaly
        if (data[data.length - 1].averageInterval > 300000) { // 5 minutes in milliseconds
          summary += `⚠️ **Anomaly Detected:** Average response time exceeds 5 minutes.\n`;
        }
      }

      res.status(200).json({ summary });
    } catch (err) {
      console.error("Error generating technical summary: ", err);
      const error = err as Error;
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  }
);

/**
 * Firestore-triggered function to analyze sentiment of new messages.
 */
export const analyzeMessageSentiment = onDocumentCreated(
  {
    document: "chats/{chatId}/messages/{messageId}",
    memory: "256MiB"  // Explicitly set memory
  },
  async (event) => {
    try {
      // Get the newly created document
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No data associated with the event");
        return;
      }

      const messageData = snapshot.data() as MessageData;
      
      // Only analyze user messages with minimum length
      if (
        messageData.sender !== "user" || 
        !messageData.content || 
        messageData.content.length < 10 ||
        messageData.sentimentScore !== undefined  // Skip if already analyzed
      ) {
        console.log("Skipping sentiment analysis for message", snapshot.id);
        return;
      }

      // Use the simple sentiment analysis instead of API
      const sentimentScore = simpleSentimentAnalysis(messageData.content);

      // Update the message with sentiment data
      await snapshot.ref.update({
        sentimentScore: sentimentScore
      });

      console.log(`Sentiment analysis completed for message ${snapshot.id}: score=${sentimentScore}`);

    } catch (err) {
      console.error("Error analyzing sentiment:", err);
      // We don't rethrow the error to prevent the function from retrying
    }
  }
);