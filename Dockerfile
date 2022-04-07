# Build: React app
# Run: Inject env vars and start Express server

FROM node

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY inject_template.js inject.bash start.bash ./
RUN apt update && apt install -y gettext

COPY src ./src/
COPY .parcelrc ./
RUN npm run build

CMD ./start.bash
