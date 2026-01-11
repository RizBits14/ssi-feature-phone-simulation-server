This server implements the backend API for the SSI Feature Phone Trust Triangle Simulation.
It manages connections, credential issuance, proof requests, and proof presentations using Node.js, Express, and MongoDB.

## Server:
- Create and manage Issuer–Holder connections
- Store and update Verifiable Credentials
- Handle Proof Requests from Verifiers
- Process Proof Presentations from Holders
- Persist all state in MongoDB

## Environment Configuration:
**Required Variables:**

- PORT
- DB_USERNAME
- DB_PASSWORD
- DB_NAME
- CORS_ORIGIN

```bash
Security Notes

- This is a simulation backend
- Cryptographic operations are abstracted
- Designed for learning, demonstration and usability study purposes only

```

## API Endpoints (Step by Step Flow)

# 1) Health Check

- GET /
- GET /api/health

Verify server and database connectivity

# 2) Issuer → Create Invitation

- POST /api/issuer/create-invitation

Generates an invitation URL for Holder connection

Stores invitation in the database

**Returns:**
- invitationId  
- invitationUrl

# 3) Holder → Receive Invitation

- POST /api/holder/receive-invitation

Accepts invitation URL

Creates a secure connection between Issuer and Holder

**Returns:**
- connectionId

# 4) Issuer → Issue Credential

- POST /api/issuer/issue-credential

Issues a verifiable credential to a connected Holder

**Stored Data:**
- connectionId
- credential claims
- credential status

**Returns**
- credentialId

# 5) Holder → Accept Credential

- POST /api/holder/accept-credential

Updates credential status from offered to accepted

# 6) Verifier → Send Proof Request

- POST /api/verifier/send-proof-request

Requests proof of specific credential attributes from Holder

**Returns:**
- proofRequestId

# 7) Holder → Present Proof

- POST /api/holder/present-proof

Presents proof derived from an accepted credential

Updates proof and request status

**Returns**
- verified: true

# Read APIs

- GET /api/connections
- GET /api/credentials
- GET /api/proof-requests
- GET /api/presentations

Fetch stored simulation data for UI display

## Database Collections

- connections
- credentials
- proof_requests
- proof_presentations

This server completes the backend logic for the SSI Trust Triangle, enabling Issuer, Holder, and Verifier interactions through a REST-based API.