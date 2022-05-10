# te-canvas-front

## Quick start (standalone, dev mode)

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

## Quick start (LTI, dev mode)

Export the following env vars:

```
LTI_URL
API_URL

MONGO_URL
MONGO_USERNAME
MONGO_PASSWORD

ENCRYPTION_KEY
```

Create a file `platforms.json` at repo root containing information about each platform (Canvas instance) in the following format:

```
[
   {
      "api_url" : "http://127.0.0.1:6000",
      "authorized_roles" : [
         "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
         "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor"
      ],
      "client_id" : "1000001",
      "name" : "My Canvas Instance"
   }
]
```

Create (and trust) the following self-signed cert:

```
ssl.crt
ssl.key
```

Start Nginx:

```
nginx -p . -c nginx.conf
```

Start MongoDB:

```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongo
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

## Docker (LTI)

Export the following env vars:

```
LTI_URL
LTI_PORT

MONGO_URL*
MONGO_USERNAME
MONGO_PASSWORD

ENCRYPTION_KEY

* Predefined in docker-compose file
```

Create a file `platforms.json` at repo root containing information about each platform (Canvas instance) in the following format:

```
[
   {
      "api_url" : "http://127.0.0.1:6000",
      "authorized_roles" : [
         "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
         "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor"
      ],
      "client_id" : "1000001",
      "name" : "My Canvas Instance"
   }
]
```

Create (and trust) the following self-signed cert:

```
ssl.crt
ssl.key
```

Start Express server, MongoDB, and Nginx:

```
docker-compose up
```

To start in "dev mode", with locally built Docker images and exposed ports (*not safe in production*):

```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
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
│         │                            │ (Express, Nginx)      │             │                       │
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

## Multiple platform setup

Each platform has its own API server. In front of this they all share one single LTI server. The JWTs which accompany browser requests contain information about their source platform. The LTI server uses this information to determine which API server to forward each incoming request to.
