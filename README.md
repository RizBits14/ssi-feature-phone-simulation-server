This server implements the backend API for the SSI Feature Phone Trust Triangle Simulation.
It manages connections, credential issuance, proof requests, and proof presentations using Node.js, Express, and MongoDB.

## Server:
- Create and manage Issuer–Holder connections
- Store and update Verifiable Credentials
- Handle Proof Requests from Verifiers
- Process Proof Presentations from Holders
- Persist all state in MongoDB

## Environment Configuration:
**Required Variables: **

- PORT
- DB_USERNAME
- DB_PASSWORD
- DB_NAME
- CORS_ORIGIN
