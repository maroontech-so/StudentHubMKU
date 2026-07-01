import express from "express";
import dotenv from "dotenv";

import sendNewsletter from "./send-newsletter";
import alertVendor from "./alert-vendor";
import sendEventRegistrationEmail from "./send-event-registration-email";
import sendEventReminderEmail from "./send-event-reminder-email";

dotenv.config();

const app = express();

// Request body JSON parsing support
app.use(express.json());

// Map API endpoints directly to serverless controller modules
app.post("/api/send-newsletter", sendNewsletter);
app.post("/api/alert-vendor", alertVendor);
app.post("/api/send-event-registration-email", sendEventRegistrationEmail);
app.post("/api/send-event-reminder-email", sendEventReminderEmail);

export default app;
