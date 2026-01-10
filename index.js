const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

app.use(
    cors({
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
        credentials: false,
    })
);

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@riz14.17psksb.mongodb.net/?appName=Riz14`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

let db, connectionsCol, credentialsCol, proofReqCol, presentationsCol;

function randId() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

async function initDb() {
    await client.connect();
    db = client.db(process.env.DB_NAME || "ssi_feature_phone_sim");

    connectionsCol = db.collection("connections");
    credentialsCol = db.collection("credentials");
    proofReqCol = db.collection("proof_requests");
    presentationsCol = db.collection("proof_presentations");

    await db.command({ ping: 1 });
    console.log("MongoDB connected");
}

app.get("/", (req, res) => {
    res.send("SSI Feature Phone Simulation API running");
});

app.get("/api/health", (req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
});