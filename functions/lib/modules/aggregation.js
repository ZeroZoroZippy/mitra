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
exports.testAggregation = exports.hourlyDataIngestion = exports.aggregateData = void 0;
// File: landing_page/functions/src/modules/aggregation.ts
require("./../init"); // Import centralized initialization
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const db = admin.firestore();
async function aggregateData() {
    const messagesSnapshot = await db.collectionGroup("messages").get();
    let totalMessages = 0;
    let userMessages = 0;
    let aiMessages = 0;
    messagesSnapshot.forEach((doc) => {
        totalMessages++;
        const data = doc.data();
        if (data.sender === "user") {
            userMessages++;
        }
        else if (data.sender === "assistant") {
            aiMessages++;
        }
    });
    const aggregatedData = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        totalMessages,
        userMessages,
        aiMessages,
    };
    await db.collection("aggregatedAnalytics").add(aggregatedData);
    console.log("Aggregation completed successfully.", aggregatedData);
    return aggregatedData;
}
exports.aggregateData = aggregateData;
exports.hourlyDataIngestion = (0, scheduler_1.onSchedule)("every 60 minutes", async (event) => {
    try {
        await aggregateData();
        console.log("Hourly data ingestion completed successfully.");
    }
    catch (error) {
        console.error("Error in hourly data ingestion:", error);
        throw new Error("Data ingestion failed");
    }
});
exports.testAggregation = (0, https_1.onRequest)(async (req, res) => {
    try {
        const aggregatedData = await aggregateData();
        res.status(200).send("Aggregation completed successfully: " + JSON.stringify(aggregatedData));
        return;
    }
    catch (error) {
        console.error("Error in test aggregation:", error);
        res.status(500).send("Aggregation test failed.");
        return;
    }
});
//# sourceMappingURL=aggregation.js.map