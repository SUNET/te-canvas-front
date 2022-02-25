# te-canvas-front

## Quick start

Export the following env vars:

```
TE_CANVAS_URL
BACKEND_URL

MONGO_USERNAME
MONGO_PASSWORD
MONGO_PORT

CANVAS_URL
CANVAS_AUTH_ENDPOINT
CANVAS_JWK_ENDPOINT
PLATFORM_NAME
CLIENT_ID

EXPRESS_PORT
PARCEL_PORT
```

Create (and trust) the following self-signed cert:

```
localhost.crt
localhost.key
```

Start nginx:

```
nginx -p . -c nginx.conf
```

Start MongoDB:

```
docker-compose up -d
```

Get dependencies:

```
npm install
```

Compile React app:

```
npm run build
```

Start Express server:

```
npm run start
```

## How does this thing work?

```
┌─────────┐                                  ┌────────┐
│ Browser ├─────────────────────────────────►│ Canvas │
│         │                                  └───┬────┘
│         │                                      │
│         │                                      │
│         │                                      │ LTI handshake
│         │                                      │
│         │                                      │
│         │                                      ▼
│         │                            ┌───────────────────────┐             ┌───────────────────────┐
│         │                            │ Express server        │             │ Python backend        │
│         │                            │                       │             │                       │
│         │                            │ With nginx in front   │             │ No own auth, trust    │
│         │                            │ for TLS termination   │             │ all requests          │
│         │                            │                       │             │ implicitly            │
│         │                            │                       │             │                       │
│         │                            │                       │             │ So, only reachable    │
│         │      React app + JWT       │                       │             │ from Express server   │
│         │◄───────────────────────────┤                       │             │                       │
│         │                            │                       │             │                       │
│         │                            │                       │             │                       │
│         │                            │                       │             │                       │
│         │                            │                       │             │                       │
│         │   Fetch request with JWT   │                       │             │                       │
│         │   as auth header           │                       │             │                       │
│         ├───────────────────────────►│ As reverse proxy with ├────────────►│ Response prepared     │
│         │                            │ "LTI termination"     │             │ using info from JWT   │
│         │                            │ (JWT verification     │             │           │           │
│         │                            │ etc)                  │             │           │           │
│         │                            │                       │             │           │           │
│         │                            │                       │             │           │           │
│         │◄───────────────────────────┤◄──────────────────────│◄────────────┤◄──────────┘           │
│         │                            │                       │             │                       │
│         │                            │                       │             │                       │
└─────────┘                            └───────────────────────┘             └───────────────────────┘
```
