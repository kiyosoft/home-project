ARG BUILD_FROM=ghcr.io/home-assistant/base:3.23
FROM ${BUILD_FROM}

ARG BUILD_ARCH
ARG BUILD_VERSION=0.6.1

LABEL \
  org.opencontainers.image.title="Ethio Home" \
  org.opencontainers.image.description="Plugin-driven Home Assistant dashboard" \
  org.opencontainers.image.source="https://github.com/kiyosoft/home-project" \
  io.hass.name="Ethio Home" \
  io.hass.description="Plugin-driven Home Assistant dashboard" \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="addon" \
  io.hass.arch="${BUILD_ARCH}"

RUN apk --no-cache add nginx python3 py3-websocket-client \
  && mkdir -p /run/nginx /www

COPY rootfs/ /
COPY www/ /www/

RUN chmod +x /usr/bin/ethio-home-start /usr/bin/ethio-home-session

CMD ["/usr/bin/ethio-home-start"]
