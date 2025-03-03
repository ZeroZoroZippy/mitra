import express from "express";
import * as admin from "firebase-admin";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { LanguageServiceClient } from "@google-cloud/language";

// -----------------------------------------------------------------------------
// 1. Initialize Firebase Admin (Only once)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// -----------------------------------------------------------------------------
// 2. Type Definitions and Constants

// Data structure for each user message
interface MessageData {
  sender: string;
  content: string;
  timestamp: admin.firestore.Timestamp;
  sentimentScore?: number;
}

// Data structure for aggregated analytics
interface AggregatedData {
  timestamp: admin.firestore.FieldValue;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  averageSentiment: number;
  messagesWithSentiment: number;
  averageInterval: number; // in milliseconds
  peakHour: number;        // 0-23
  peakCount: number;       // number of messages in peak hour
  hourCounts: number[];    // array of length 24
  totalSentiment: number;
}

// Threshold for anomaly detection
const ANOMALY_THRESHOLD = 100;

// -----------------------------------------------------------------------------
// 3. Optional Express Server for Local Testing (Emulator Only)
const app = express();
const PORT = process.env.PORT || 8080;
app.get("/", (req, res) => {
  res.status(200).send("Firebase Functions are active.");
});
if (process.env.FUNCTIONS_EMULATOR) {
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}

// -----------------------------------------------------------------------------
// 4. Aggregation Functions

/**
 * Aggregates data from all "messages" subcollections, computing:
 * - total/user/AI message counts
 * - average sentiment
 * - average message interval
 * - peak activity hour
 * and stores the result in "aggregatedAnalytics".
 */
async function aggregateData(): Promise<AggregatedData> {
  try {
    // Retrieve last aggregation timestamp (if any) from "system/lastAggregation"
    const lastAggregationRef = db.collection("system").doc("lastAggregation");
    const lastAggregationDoc = await lastAggregationRef.get();

    let lastTimestamp: admin.firestore.Timestamp | null = null;
    if (lastAggregationDoc.exists) {
      const data = lastAggregationDoc.data() as { timestamp?: admin.firestore.Timestamp };
      lastTimestamp = data?.timestamp || null;
    }

    // Build a query for new messages since the last aggregation
    let messagesQuery: admin.firestore.Query = db.collectionGroup("messages");
    if (lastTimestamp) {
      messagesQuery = messagesQuery.where("timestamp", ">", lastTimestamp);
    }

    // Fetch new messages
    const newMessagesSnapshot = await messagesQuery.get();

    // Initialize counters
    let totalMessages = 0;
    let userMessages = 0;
    let aiMessages = 0;
    let totalSentiment = 0;
    let messagesWithSentiment = 0;
    let messageIntervals: number[] = [];
    let lastMessageTime: Date | null = null;
    const hourCounts: number[] = new Array(24).fill(0);

    // (Optional) If you want to carry over prior totals, you can parse the latest doc here
    // For simplicity, we're just starting fresh each time for new messages

    // Process new messages
    newMessagesSnapshot.forEach((doc) => {
      const data = doc.data() as MessageData;
      totalMessages++;

      // Count user vs. AI messages
      if (data.sender === "user") {
        userMessages++;
        // If a sentimentScore is present, incorporate it
        if (typeof data.sentimentScore === "number") {
          totalSentiment += data.sentimentScore;
          messagesWithSentiment++;
        }
      } else if (data.sender === "assistant") {
        aiMessages++;
      }

      // Track timing data
      if (data.timestamp) {
        const msgDate = data.timestamp.toDate();
        const hour = msgDate.getHours();
        hourCounts[hour]++;
        if (lastMessageTime) {
          const interval = msgDate.getTime() - lastMessageTime.getTime();
          messageIntervals.push(interval);
        }
        lastMessageTime = msgDate;
      }
    });

    // Calculate advanced metrics
    const averageSentiment = messagesWithSentiment > 0
      ? totalSentiment / messagesWithSentiment
      : 0;
    const averageInterval = messageIntervals.length > 0
      ? messageIntervals.reduce((sum, val) => sum + val, 0) / messageIntervals.length
      : 0;

    // Determine peak hour
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
      totalSentiment,
    };

    // Store aggregated data in "aggregatedAnalytics"
    const docRef = await db.collection("aggregatedAnalytics").add(aggregatedData);

    // Update "system/lastAggregation" with the current timestamp
    await lastAggregationRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      lastAggregationId: docRef.id
    });

    console.log("Aggregation completed successfully.", aggregatedData);
    return aggregatedData;
  } catch (err) {
    console.error("Error in aggregateData:", err);
    throw new Error(`Aggregation failed: ${(err as Error).message}`);
  }
}

/**
 * Scheduled Cloud Function to run aggregation every 60 minutes.
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
      throw new Error(`Data ingestion failed: ${(err as Error).message}`);
    }
  }
);

/**
 * HTTP-triggered function for testing aggregation manually.
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
        .send("Aggregation completed successfully: " + JSON.stringify(aggregatedData));
    } catch (err) {
      console.error("Error in test aggregation:", err);
      res.status(500).send(`Aggregation test failed: ${(err as Error).message}`);
    }
  }
);

/**
 * HTTP API endpoint to generate a technical analytics summary.
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

      const docs = snapshot.docs.map((doc) => doc.data() as AggregatedData);
      const data = docs.reverse();

      let summary = "";
      if (data.length >= 2) {
        const older = data[data.length - 2];
        const latest = data[data.length - 1];

        const totalDiff = latest.totalMessages - older.totalMessages;
        const userDiff = latest.userMessages - older.userMessages;
        const aiDiff = latest.aiMessages - older.aiMessages;
        const sentimentDiff = (latest.averageSentiment ?? 0) - (older.averageSentiment ?? 0);

        const formatDiff = (num: number) =>
          num >= 0 ? `**+${num}** 📈` : `**${num}** 📉`;

        // Convert average interval from ms to minutes
        const avgIntervalMinutes = latest.averageInterval
          ? (latest.averageInterval / 60000).toFixed(1)
          : "No data";

        // Format peak hour
        const peakHourFormatted =
          latest.peakHour !== undefined
            ? `${latest.peakHour % 12 || 12}${latest.peakHour < 12 ? "AM" : "PM"}`
            : "No data";

        summary = `**Technical Analytics Summary**:\n\n`;
        summary += `**Total Messages:** ${latest.totalMessages} (${formatDiff(totalDiff)})\n`;
        summary += `**User Messages:** ${latest.userMessages} (${formatDiff(userDiff)})\n`;
        summary += `**AI Messages:** ${latest.aiMessages} (${formatDiff(aiDiff)})\n`;
        summary += `**Average Sentiment:** ${latest.averageSentiment.toFixed(2)} (${formatDiff(sentimentDiff)})\n`;
        summary += `**Avg. Message Interval:** ${avgIntervalMinutes} minutes\n`;
        summary += `**Peak Activity:** ${peakHourFormatted} with ${latest.peakCount} messages\n`;
      } else {
        const latest = data[data.length - 1];
        const avgIntervalMinutes = latest.averageInterval
          ? (latest.averageInterval / 60000).toFixed(1)
          : "No data";

        const peakHourFormatted =
          latest.peakHour !== undefined
            ? `${latest.peakHour % 12 || 12}${latest.peakHour < 12 ? "AM" : "PM"}`
            : "No data";

        summary = `**Latest Analytics**:\n\n`;
        summary += `**Total Messages:** ${latest.totalMessages}\n`;
        summary += `**User Messages:** ${latest.userMessages}\n`;
        summary += `**AI Messages:** ${latest.aiMessages}\n`;
        summary += `**Average Sentiment:** ${latest.averageSentiment.toFixed(2)}\n`;
        summary += `**Avg. Message Interval:** ${avgIntervalMinutes} minutes\n`;
        summary += `**Peak Activity:** ${peakHourFormatted} with ${latest.peakCount} messages\n`;
      }

      // Check for anomalies
      if (data.length >= 1) {
        const latest = data[data.length - 1];
        // Check message volume
        if (latest.totalMessages > ANOMALY_THRESHOLD) {
          summary += `\n\n⚠️ **Anomaly Detected:** Total messages exceed ${ANOMALY_THRESHOLD}.\n`;
        }
        // Check sentiment anomaly
        if (latest.averageSentiment < -0.5 && latest.messagesWithSentiment > 5) {
          summary += `⚠️ **Anomaly Detected:** Unusually negative sentiment detected.\n`;
        }
        // Check average interval
        if (latest.averageInterval > 300000) { // 5 minutes in ms
          summary += `⚠️ **Anomaly Detected:** Average response time exceeds 5 minutes.\n`;
        }
      }

      res.status(200).json({ summary });
      return;
    } catch (err) {
      console.error("Error generating technical summary: ", err);
      const error = err as Error;
      res.status(500).json({ error: "Internal Server Error", details: error.message });
      return;
    }
  }
);

// -----------------------------------------------------------------------------
// Firestore-triggered Sentiment Analysis Function
// -----------------------------------------------------------------------------
const languageClient = new LanguageServiceClient();

export const analyzeMessageSentiment = onDocumentCreated(
  {
    document: "chats/{chatId}/messages/{messageId}",
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
      // Only analyze user messages of sufficient length if not already analyzed
      if (
        messageData.sender !== "user" ||
        !messageData.content ||
        messageData.content.length < 10 ||
        messageData.sentimentScore !== undefined
      ) {
        console.log("Skipping sentiment analysis for message", snapshot.id);
        return;
      }

      // Use the Google Cloud Natural Language API
      const document = {
        content: messageData.content,
        type: "PLAIN_TEXT" as "PLAIN_TEXT",
      };
      const [result] = (await languageClient.analyzeSentiment({ document })) as any;
      const sentiment = result.documentSentiment;
      if (!sentiment) {
        console.error("No sentiment found.");
        return;
      }
      console.log(`Sentiment for message ${snapshot.id}: score=${sentiment.score}, magnitude=${sentiment.magnitude}`);

      // Update Firestore with the sentiment score
      await snapshot.ref.update({
        sentimentScore: sentiment.score
      });
    } catch (err) {
      console.error("Error analyzing sentiment:", err);
      // Not rethrowing to avoid infinite retries
    }
  }
);