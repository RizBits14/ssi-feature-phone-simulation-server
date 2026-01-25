const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

app.use(
    cors({
        origin: "*",
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

function generateInviteCode(length = 5) {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
}


async function initDb() {
    // await client.connect();
    db = client.db(process.env.DB_NAME || "ssi_feature_phone_sim");

    connectionsCol = db.collection("connections");
    credentialsCol = db.collection("credentials");
    proofReqCol = db.collection("proof_requests");
    presentationsCol = db.collection("proof_presentations");

    // await db.command({ ping: 1 });
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
        const inviteCode = generateInviteCode(5);

        const doc = {
            invitationId,
            inviteCode,
            label,
            alias,
            status: "invitation-created",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await connectionsCol.insertOne(doc);

        res.json({ inviteCode });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.post("/api/holder/receive-invitation", async (req, res) => {
    try {
        const inviteCode = (req.body?.inviteCode || "").toString().trim();
        if (!inviteCode) {
            return res.status(400).json({ error: "inviteCode is required" });
        }

        const existing = await connectionsCol.findOne({ inviteCode });
        if (!existing) {
            return res.status(404).json({ error: "Invalid invite code" });
        }

        const connectionId = existing.connectionId || randId();

        await connectionsCol.updateOne(
            { inviteCode },
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

        if (!connectionId) {
            return res.status(400).json({ error: "connectionId is required" });
        }

        const credentialType =
            (claims.department || "").toString().trim() || "UnknownCredential";

        const cred = {
            connectionId,
            type: credentialType,
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

app.post("/api/verifier/send-proof-request", async (req, res) => {
    try {
        const connectionId = (req.body?.connectionId || "").toString().trim();
        const request = req.body?.request || { ask: ["name", "department"], predicates: [{ field: "age", op: ">=", value: 20 }] };

        if (!connectionId) return res.status(400).json({ error: "connectionId is required" });

        const doc = {
            connectionId,
            request,
            status: "requested",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const r = await proofReqCol.insertOne(doc);
        res.json({ ok: true, proofRequestId: r.insertedId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/holder/present-proof", async (req, res) => {
    try {
        const proofRequestId = (req.body?.proofRequestId || "").toString().trim();
        const credentialId = (req.body?.credentialId || "").toString().trim();

        if (!proofRequestId) return res.status(400).json({ error: "proofRequestId is required" });
        if (!credentialId) return res.status(400).json({ error: "credentialId is required" });

        const cred = await credentialsCol.findOne({ _id: new ObjectId(credentialId) });
        if (!cred) return res.status(404).json({ error: "Credential not found" });

        const pres = {
            proofRequestId,
            credentialId,
            revealed: cred.claims || {},
            status: "presented",
            createdAt: new Date(),
        };

        await presentationsCol.insertOne(pres);
        await proofReqCol.updateOne(
            { _id: new ObjectId(proofRequestId) },
            { $set: { status: "presented", updatedAt: new Date() } }
        );

        res.json({ ok: true, verified: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/connections", async (req, res) => {
    const items = await connectionsCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();
    res.json({ items });
});

app.get("/api/credentials", async (req, res) => {
    const items = await credentialsCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();
    res.json({ items });
});

app.get("/api/proof-requests", async (req, res) => {
    try {
        const items = await proofReqCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();
        res.json({ items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/presentations", async (req, res) => {
    try {
        const items = await presentationsCol.find({}).sort({ createdAt: -1 }).limit(50).toArray();
        res.json({ items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

initDb()
    .then(() => {
        app.listen(port, () => console.log(`API listening on port ${port}`));
    })
    .catch((e) => {
        console.error("DB init failed:", e);
        process.exit(1);
    });
