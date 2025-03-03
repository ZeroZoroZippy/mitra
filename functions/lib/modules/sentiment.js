"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeMessageSentiment = void 0;
// File: landing_page/functions/src/modules/sentiment.ts
require("./../init");
const firestore_1 = require("firebase-functions/v2/firestore");
const language_1 = require("@google-cloud/language");
const languageClient = new language_1.LanguageServiceClient();
exports.analyzeMessageSentiment = (0, firestore_1.onDocumentCreated)("users/{userId}/messages/{messageId}", async (event) => {
    const snap = event.data;
    if (!snap) {
        console.log("No snapshot found.");
        return;
    }
    if (!snap.exists) {
        console.log("Message document does not exist.");
        return;
    }
    const messageData = snap.data();
    if (!messageData || !messageData.text) {
        console.log("Message text is missing.");
        return;
    }
    const document = {
        content: messageData.text,
        type: "PLAIN_TEXT",
    };
    try {
        const [result] = (await languageClient.analyzeSentiment({ document }));
        const sentiment = result.documentSentiment;
        if (!sentiment) {
            console.error("No sentiment found.");
            return;
        }
        console.log(`Sentiment for message ${event.params.messageId}: score=${sentiment.score}, magnitude=${sentiment.magnitude}`);
        await snap.ref.update({
            sentimentScore: sentiment.score,
            sentimentMagnitude: sentiment.magnitude,
        });
    }
    catch (error) {
        console.error("Error analyzing sentiment:", error);
        return;
    }
});
//# sourceMappingURL=sentiment.js.map