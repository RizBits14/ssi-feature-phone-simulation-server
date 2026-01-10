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

app.post("/api/issuer/create-invitation", async (req, res) => {
    try {
        const label = (req.body?.label || "holder").toString();
        const alias = (req.body?.alias || "holder").toString();

        const invitationId = randId();
        const invitationUrl = `sim://oob/${invitationId}?label=${encodeURIComponent(label)}&alias=${encodeURIComponent(alias)}`;

        const doc = {
            invitationId,
            invitationUrl,
            label,
            alias,
            status: "invitation-created",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await connectionsCol.insertOne(doc);
        res.json({ invitationId, invitationUrl });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/holder/receive-invitation", async (req, res) => {
    try {
        const invitationUrl = (req.body?.invitationUrl || "").toString().trim();
        if (!invitationUrl) return res.status(400).json({ error: "invitationUrl is required" });

        const match = invitationUrl.match(/^sim:\/\/oob\/([^?]+)/);
        if (!match) return res.status(400).json({ error: "Invalid invitationUrl (expected sim://oob/<id>)" });

        const invitationId = match[1];

        const existing = await connectionsCol.findOne({ invitationId });
        if (!existing) return res.status(404).json({ error: "Invitation not found" });

        const connectionId = existing.connectionId || randId();

        await connectionsCol.updateOne(
            { invitationId },
            {
                $set: {
                    connectionId,
                    status: "connected",
                    updatedAt: new Date(),
                },
            }
        );

        res.json({ ok: true, connectionId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/issuer/issue-credential", async (req, res) => {
    try {
        const connectionId = (req.body?.connectionId || "").toString().trim();
        const claims = req.body?.claims || {};
        if (!connectionId) return res.status(400).json({ error: "connectionId is required" });

        const cred = {
            connectionId,
            type: "StudentID",
            status: "offered",
            claims,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const r = await credentialsCol.insertOne(cred);
        res.json({ ok: true, credentialId: r.insertedId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/holder/accept-credential", async (req, res) => {
    try {
        const credentialId = (req.body?.credentialId || "").toString().trim();
        if (!credentialId) return res.status(400).json({ error: "credentialId is required" });

        await credentialsCol.updateOne(
            { _id: new ObjectId(credentialId) },
            { $set: { status: "accepted", updatedAt: new Date() } }
        );

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
