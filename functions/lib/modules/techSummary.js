"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTechSummary = void 0;
// File: landing_page/functions/src/modules/techSummary.ts
require("./../init");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const db = admin.firestore();
exports.getTechSummary = (0, https_1.onRequest)(async (req, res) => {
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
        const docs = snapshot.docs.map((doc) => doc.data());
        const data = docs.reverse();
        let summary = "";
        if (data.length >= 2) {
            const older = data[data.length - 2];
            const latest = data[data.length - 1];
            const totalDiff = latest.totalMessages - older.totalMessages;
            const userDiff = latest.userMessages - older.userMessages;
            const aiDiff = latest.aiMessages - older.aiMessages;
            const formatDiff = (num) => num >= 0 ? `**+${num}** 📈` : `**${num}** 📉`;
            summary = `**Technical Analytics Summary**:\n\n`;
            summary += `**Total Messages:** ${latest.totalMessages} (${formatDiff(totalDiff)})\n`;
            summary += `**User Messages:** ${latest.userMessages} (${formatDiff(userDiff)})\n`;
            summary += `**AI Messages:** ${latest.aiMessages} (${formatDiff(aiDiff)})\n`;
        }
        else {
            const latest = data[data.length - 1];
            summary = `**Latest Analytics**:\n\n`;
            summary += `**Total Messages:** ${latest.totalMessages}\n`;
            summary += `**User Messages:** ${latest.userMessages}\n`;
            summary += `**AI Messages:** ${latest.aiMessages}\n`;
        }
        const anomalyThreshold = 100;
        if (data.length >= 1 && data[data.length - 1].totalMessages > anomalyThreshold) {
            summary += `\n\n⚠️ **Anomaly Detected:** Total messages exceed ${anomalyThreshold}.`;
        }
        res.status(200).json({ summary });
        return;
    }
    catch (error) {
        console.error("Error generating technical summary: ", error);
        res.status(500).json({ error: "Internal Server Error" });
        return;
    }
});
//# sourceMappingURL=techSummary.js.map