# te-canvas-front

## Quick start (standalone)

Export the following env vars:

```
FLASK_URL
```

Get dependencies:

```
npm install
```

Start Parcel dev server:

```
npm run start-parcel
```

## Quick start (LTI)

Export the following env vars:

```
EXPRESS_URL
FLASK_URL

MONGO_URL
MONGO_USERNAME
MONGO_PASSWORD

CANVAS_URL
CANVAS_AUTH_ENDPOINT
CANVAS_JWK_ENDPOINT

PLATFORM_NAME
CLIENT_ID
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

## LTI architecture

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
│         │                            │ Express server        │             │ Flask server          │
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
