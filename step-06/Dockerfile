FROM 041175032282.dkr.ecr.us-east-1.amazonaws.com/of-centos7-node10:stable-1.1.1 AS base
WORKDIR /app
COPY . ./

FROM base AS builder
RUN npm set progress=false
RUN npm i --loglevel=error

FROM base as runner
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_DEBUG debug
ENV APP_NAME webrtc
ENV AWS_REGION us-east-1
ARG GIT_SHORT_SHA
ENV GIT_SHORT_SHA=$GIT_SHORT_SHA

CMD npm run start