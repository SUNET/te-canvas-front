# te-canvas-front

## Quick start (standalone)

Export the following env vars:

```
API_URL
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
LTI_URL

MONGO_URL
MONGO_USERNAME
MONGO_PASSWORD

PLATFORM_NAME
CLIENT_ID
LTI_KEY
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
│         │                            │ LTI server            │             │ API server (Flask)    │
│         │                            │ (Express, nginx)      │             │                       │
│         │                            │                       │             │ No own auth, trust    │
│         │                            │                       │             │ all requests          │
│         │                            │                       │             │ implicitly            │
│         │                            │                       │             │                       │
│         │                            │                       │             │ So, only reachable    │
│         │      React app + JWT       │                       │             │ from LTI server       │
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
