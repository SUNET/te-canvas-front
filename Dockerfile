# Build: React app
# Run: Inject env vars and start Express server

FROM node:20.19.6

WORKDIR /usr/src/app

ENV NODE_ENV=production
COPY package*.json ./
RUN npm install

COPY inject_template.js make-inject-env.sh ./
RUN apt update && apt install -y gettext

COPY src ./src/
COPY .parcelrc ./
RUN npm run build

CMD npm run start
