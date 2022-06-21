# te-canvas-front

This README contains information on working with the front end code. For higher level project documentation, see [te-canvas/doc.md](https://github.com/SUNET/te-canvas/blob/main/doc.md).

The front end can run either as a standalone website, or as an LTI 1.3 application embedded in Canvas. It is configured using the environment variables listed under [Configuration](#configuration).

## Run as standalone website (not for production)

This method will use the Parcel dev server to run our React app. This supports hot reloading and is very convenient for development. The only [configuration](#configuration) needed in this case is `API_URL`, which is the location of a te-canvas back end.

Get dependencies:

```
npm install
```

Start Parcel dev server:

```
npm run start-parcel
```

## Run as an LTI 1.3 server

In this scheme, the front end will consist of two parts. One is the client-side React app, and the other is a server which handles authentication and forwards API requests to a set of back ends. This is different from the standalone mode, where API requests are made to a single back end server directly. For more detail on this setup, see [te-canvas/doc.md](https://github.com/SUNET/te-canvas/blob/main/doc.md).

Besides the environment variabled listed under [Configuration](#configuration), you also need the following files at repo root:

- [platforms.json](#platforms.json)
- ssl.crt
- ssl.key

### Without Docker

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

Start LTI server:

```
npm run start
```

### With Docker

Start LTI server, MongoDB, and Nginx:

```
docker-compose up
```

Start in dev mode, with exposed ports (**not safe in production**) and using locally built images:

```
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Configuration

| Environment variable | Description                                                | Predefined in docker-compose file? |
| -                    | -                                                          | -                                  |
| `API_URL`            | Location of back end server. Only used for standalone mode, LTI mode uses several back ends configured via [platforms.json](#platforms.json) | |
| `LTI_URL`            | Location of LTI server. Used in compose file for LTI server and correspondingly for requests from React app. | |
| `LTI_PORT`           | Port of LTI server. Used same as `LTI_URL`.                |                                    |
|                      |                                                            |                                    |
| `MONGO_URL`          | Location of MongoDB, used by ltijs library.                | ✅                                 |
| `MONGO_USERNAME`     | MongoDB username.                                          |                                    |
| `MONGO_PASSWORD`     | MongoDB password.                                          |                                    |
|                      |                                                            |                                    |
| `ENCRYPTION_KEY`     | An random string used by ltijs to sign cookies and tokens. |                                    |
|                      |                                                            |                                    |
| `TAG_NODE`           | Tag to use for `docker.sunet.se/te-canvas-front`.          | ✅                                 |

## `platforms.json`

This file contains information about each Canvas instance (platform). This is not a file format specified by the ltijs library, though many of the keys are passed directly to [Provider.registerPlatform](https://cvmcosta.me/ltijs/#/provider?id=async-providerregisterplatformplatform).

```
[
   {
      "api_url" : "http://127.0.0.1:6000",
      "authorized_roles" : [
         "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
         "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor"
      ],
      "canvas_auth" : "https://canvas.instructure.com/api/lti/authorize_redirect",
      "canvas_jwk" : "https://canvas.instructure.com/api/lti/security/jwks",
      "canvas_token" : "https://canvas.instructure.com/login/oauth2/token",
      "canvas_url" : "https://canvas.instructure.com",
      "client_id" : "1000001",
      "name" : "My Canvas Instance"
   }
]
```

- `api_url`: URL to back end server, where the front end server will forward API requests for this particular platform.
- `authorized_roles`: Any user which has one of these roles (defined in LTI standars) is allowed access to the back end. If the user does not have an authorized role, the server will reply with an error message including the current user's actual roles (also printed in the server logs). This can be used to find out which roles a given user has, i.e. set `authorized_roles` to `[]`.

Rest of the keys are passed to ltijs as mentioned above. The Canvas URLs will be the same for every instance in Canvas's production environment (also exists: beta and test).

## `lti.json`

This file is used by Canvas to configure te-canvas as an LTI tool. Documentation [here](https://canvas.instructure.com/doc/api/file.lti_dev_key_config.html).

We serve this at `te-canvas.sunet.se/lti.json` so we only need to paste this URL in Canvas.

The key `extensions.settings.placements.visibility` decides which type of Canvas users get a te-canvas button in the course navigation sidebar. Note that `admins` is not the same as "admins" on Canvas, but rather seems to include anyone who has edit rights on the course. I.e. Canvas admins, but also teachers and TAs.

The key `custom_fields` specifies a set of Canvas variables to add to the JWT passed with each request. In our case we want to get the course ID.

The way we use this to pass data to the back end is implemented in a general way in `src/lti.js` (the LTI server's start point). If the front end receives a request with query parameter `x=LTI_CUSTOM_PROPETY`, we look up key `x` in the JWT Canvas gave us and replace `LTI_CUSTOM_PROPERTY` with the real value, before forwarding the request to the back end.
