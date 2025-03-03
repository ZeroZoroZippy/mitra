import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

// Constants
const ANOMALY_THRESHOLD = 100000;

// Type definitions
interface MessageData {
  sender: string;
  text: string;
  timestamp: admin.firestore.Timestamp | any;  // Allows for different timestamp types
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
    "appreciate", "nice", "awesome", "enjoy", "pleased", "satisfied",
    "incredible", "delightful", "joyful", "positive", "better", "superb"
  ];
  
  const negativeWords = [
    "bad", "terrible", "awful", "horrible", "hate", "dislike", "poor",
    "disappointing", "worst", "annoying", "useless", "problem", "difficult",
    "frustrating", "angry", "sad", "unfortunately", "error", "issue", "broken"
  ];

  const normalizedText = text.toLowerCase();
  const words = normalizedText.match(/\b\w+\b/g) || [];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const word of words) {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  }
  
  const totalWords = words.length;
  if (totalWords === 0) return 0;
  
  const positiveScore = positiveCount / totalWords;
  const negativeScore = negativeCount / totalWords;
  
  return Math.round((positiveScore - negativeScore) * 100) / 100;
}

/**
 * Aggregate data from all "messages" subcollections.
 */
async function aggregateData(): Promise<AggregatedData> {
  try {
    const lastAggregationRef = db.collection("system").doc("lastAggregation");
    const lastAggregationDoc = await lastAggregationRef.get();
    
    let lastTimestamp: admin.firestore.Timestamp | null = null;
    let prevTotalMessages = 0;
    let prevUserMessages = 0;
    let prevAiMessages = 0;
    let prevTotalSentiment = 0;
    let prevMessagesWithSentiment = 0;
    let prevHourCounts: number[] = new Array(24).fill(0);

    if (lastAggregationDoc.exists) {
      const data = lastAggregationDoc.data() as LastAggregationData | undefined;
      lastTimestamp = data?.timestamp || null;
    }

    const latestAggregationSnapshot = await db
      .collection("aggregatedAnalytics")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    if (!latestAggregationSnapshot.empty) {
      const latestData = latestAggregationSnapshot.docs[0].data() as Partial<AggregatedData>;
      prevTotalMessages = latestData.totalMessages || 0;
      prevUserMessages = latestData.userMessages || 0;
      prevAiMessages = latestData.aiMessages || 0;
      prevTotalSentiment = latestData.totalSentiment as number || 0;
      prevMessagesWithSentiment = latestData.messagesWithSentiment || 0;
      if (latestData.hourCounts) {
        for (let i = 0; i < 24; i++) {
          prevHourCounts[i] = latestData.hourCounts[i] || 0;
        }
      }
    }

    let messagesQuery: admin.firestore.Query = db.collectionGroup("messages");
    if (lastTimestamp) {
      messagesQuery = messagesQuery.where("timestamp", ">", lastTimestamp);
    }

    const messagesSnapshot = await messagesQuery.get();

    let newTotalMessages = 0;
    let newUserMessages = 0;
    let newAiMessages = 0;
    let newTotalSentiment = 0;
    let newMessagesWithSentiment = 0;
    let newMessageIntervals: number[] = [];
    let lastMessageTime: Date | null = null;
    let newHourCounts: number[] = new Array(24).fill(0);

    messagesSnapshot.forEach((doc) => {
      const data = doc.data() as MessageData;
      if (data.timestamp && data.timestamp instanceof admin.firestore.Timestamp) {
        newTotalMessages++;
        
        if (data.sender === "user") {
          newUserMessages++;
          if (data.text && data.text.length >= 5) {
            const score = data.sentimentScore !== undefined
              ? data.sentimentScore
              : simpleSentimentAnalysis(data.text);
            newTotalSentiment += score;
            newMessagesWithSentiment++;
            if (data.sentimentScore === undefined) {
              doc.ref.update({ sentimentScore: score }).catch(err =>
                console.error(`Error updating sentiment for message ${doc.id}: ${err}`)
              );
            }
          }
        } else if (data.sender === "assistant") {
          newAiMessages++;
        }
        
        const messageDate = data.timestamp.toDate();
        const hour = messageDate.getHours();
        newHourCounts[hour]++;
        if (lastMessageTime) {
          const interval = messageDate.getTime() - lastMessageTime.getTime();
          newMessageIntervals.push(interval);
        }
        lastMessageTime = messageDate;
      } else {
        console.error(`Skipping message ${doc.id}: invalid or missing timestamp (type: ${typeof data.timestamp})`);
      }
    });

    const totalMessages = prevTotalMessages + newTotalMessages;
    const userMessages = prevUserMessages + newUserMessages;
    const aiMessages = prevAiMessages + newAiMessages;
    const totalSentiment = prevTotalSentiment + newTotalSentiment;
    const messagesWithSentiment = prevMessagesWithSentiment + newMessagesWithSentiment;
    const hourCounts = prevHourCounts.map((count, i) => count + newHourCounts[i]);

    const averageSentiment = messagesWithSentiment > 0 
      ? Math.round((totalSentiment / messagesWithSentiment) * 100) / 100
      : 0;
    const averageInterval = newMessageIntervals.length > 0 
      ? newMessageIntervals.reduce((sum, interval) => sum + interval, 0) / newMessageIntervals.length
      : 0;

    let peakHour = 0;
    let peakCount = 0;
    for (let i = 0; i < 24; i++) {
      if (hourCounts[i] > peakCount) {
        peakCount = hourCounts[i];
        peakHour = i;
      }
    }

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

    const docRef = await db.collection("aggregatedAnalytics").add(aggregatedData);
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
 * Scheduled function to run aggregation every 60 minutes.
 */
export const hourlyDataIngestion = onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "America/New_York",
    memory: "256MiB"
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
 * HTTP function to test aggregation manually.
 */
export const testAggregation = onRequest(
  {
    cors: true,
    memory: "256MiB"
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
 * HTTP API endpoint for analytics summary.
 */
export const getTechSummary = onRequest(
  {
    cors: true,
    memory: "256MiB"
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const snapshot = await db
        .collection("aggregatedAnalytics")
        .orderBy("timestamp", "desc")
        .limit(10)
        .get();

      if (snapshot.empty) {
        res.status(200).json({ summary: "No analytics data available." });
        return;
      }

      const docs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          timestamp: data.timestamp || admin.firestore.Timestamp.now(),
          totalMessages: data.totalMessages || 0,
          userMessages: data.userMessages || 0,
          aiMessages: data.aiMessages || 0,
          averageSentiment: data.averageSentiment || 0,
          messagesWithSentiment: data.messagesWithSentiment || 0,
          averageInterval: data.averageInterval || 0,
          peakHour: data.peakHour !== undefined ? data.peakHour : 0,
          peakCount: data.peakCount || 0,
          hourCounts: data.hourCounts || new Array(24).fill(0),
          totalSentiment: data.totalSentiment || 0
        } as AggregatedData;
      });
      
      const data = docs.reverse();
      let summary = "";
      let sentimentDelta = 0;
      let sentimentTrend = "Stable";

      if (data.length >= 2) {
        const older = data[data.length - 2];
        const latest = data[data.length - 1];

        const totalDiff = latest.totalMessages - older.totalMessages;
        const userDiff = latest.userMessages - older.userMessages;
        const aiDiff = latest.aiMessages - older.aiMessages;

        sentimentDelta = Math.round((latest.averageSentiment - older.averageSentiment) * 100) / 100;
        if (sentimentDelta > 0.05) sentimentTrend = "Up";
        else if (sentimentDelta < -0.05) sentimentTrend = "Down";
        else sentimentTrend = "Stable";

        if (isNaN(sentimentDelta)) sentimentDelta = 0;

        const sentimentText = latest.messagesWithSentiment > 0 
          ? `${latest.averageSentiment.toFixed(2)} (${latest.averageSentiment > 0 ? 'Positive' : 'Negative'})` 
          : '0.00 (Neutral)';
        
        const avgIntervalMinutes = latest.averageInterval > 0 
          ? (latest.averageInterval / 60000).toFixed(1)
          : '0.0';
        
        const peakHourFormatted = latest.peakHour !== undefined 
          ? `${latest.peakHour % 12 || 12}${latest.peakHour < 12 ? 'AM' : 'PM'}` 
          : '12AM';

        const formatDiff = (num: number) =>
          num >= 0 ? `**+${num}** 📈` : `**${num}** 📉`;

        summary = `**Technical Analytics Summary**:\n\n`;
        summary += `**Total Messages:** ${latest.totalMessages} (${formatDiff(totalDiff)})\n`;
        summary += `**User Messages:** ${latest.userMessages} (${formatDiff(userDiff)})\n`;
        summary += `**AI Messages:** ${latest.aiMessages} (${formatDiff(aiDiff)})\n`;
        summary += `**Average Sentiment:** ${sentimentText}\n`;
        summary += `**Sentiment Delta:** ${sentimentDelta} (${sentimentTrend})\n`;
        summary += `**Messages with Sentiment:** ${latest.messagesWithSentiment}\n`;
        summary += `**Average Response Time:** ${avgIntervalMinutes} minutes\n`;
        summary += `**Peak Activity Hour:** ${peakHourFormatted}\n`;
      } else {
        const latest = data[data.length - 1];
        
        const sentimentText = latest.messagesWithSentiment > 0 
          ? `${latest.averageSentiment.toFixed(2)} (${latest.averageSentiment > 0 ? 'Positive' : 'Negative'})` 
          : '0.00 (Neutral)';
        
        const avgIntervalMinutes = latest.averageInterval > 0 
          ? (latest.averageInterval / 60000).toFixed(1)
          : '0.0';
        
        const peakHourFormatted = latest.peakHour !== undefined 
          ? `${latest.peakHour % 12 || 12}${latest.peakHour < 12 ? 'AM' : 'PM'}` 
          : '12AM';
        
        summary = `**Latest Analytics**:\n\n`;
        summary += `**Total Messages:** ${latest.totalMessages}\n`;
        summary += `**User Messages:** ${latest.userMessages}\n`;
        summary += `**AI Messages:** ${latest.aiMessages}\n`;
        summary += `**Average Sentiment:** ${sentimentText}\n`;
        summary += `**Messages with Sentiment:** ${latest.messagesWithSentiment || 0}\n`;
        summary += `**Average Response Time:** ${avgIntervalMinutes} minutes\n`;
        summary += `**Peak Activity Hour:** ${peakHourFormatted}\n`;
      }

      if (data.length >= 1) {
        const latest = data[data.length - 1];
        
        if (latest.totalMessages > ANOMALY_THRESHOLD) {
          summary += `\n⚠️ **Anomaly Detected:** Total messages exceed ${ANOMALY_THRESHOLD}.\n`;
        }
        
        if (latest.averageSentiment < -0.5 && latest.messagesWithSentiment > 5) {
          summary += `⚠️ **Anomaly Detected:** Unusually negative sentiment detected.\n`;
        }
        
        if (latest.averageInterval > 300000) {
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
    document: "users/{userId}/messages/{messageId}",
    memory: "256MiB"
  },
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No data associated with the event");
        return;
      }

      const messageData = snapshot.data() as MessageData;
      
      console.log(`Evaluating message ${snapshot.id}`);

      if (messageData.sender !== "user") {
        console.log(`Skipping message ${snapshot.id}: Sender is not 'user' (found: ${messageData.sender})`);
        return;
      }
      
      if (!messageData.text || messageData.text.length < 5) {
        console.log(`Skipping message ${snapshot.id}: text too short or missing`);
        return;
      }
      
      if (messageData.sentimentScore !== undefined) {
        console.log(`Skipping message ${snapshot.id}: Sentiment score already exists`);
        return;
      }

      const sentimentScore = simpleSentimentAnalysis(messageData.text);

      await snapshot.ref.update({
      sentimentScore: sentimentScore,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Sentiment analysis completed for message ${snapshot.id}: score = ${sentimentScore}`);
    } catch (err) {
      console.error("Error analyzing sentiment for a message:", err);
    }
  }
);