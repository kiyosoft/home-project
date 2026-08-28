ARG BUILD_FROM=ghcr.io/home-assistant/base:latest
FROM ${BUILD_FROM}

ARG BUILD_ARCH
ARG BUILD_VERSION=0.4.0

LABEL \
  io.hass.name="Ethio Home" \
  io.hass.description="Plugin-driven Home Assistant dashboard" \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="addon" \
  io.hass.arch="${BUILD_ARCH}"

RUN apk --no-cache add nginx \
  && mkdir -p /run/nginx /www

COPY rootfs/ /
COPY www/ /www/

RUN chmod +x /usr/bin/ethio-home-start

CMD ["/usr/bin/ethio-home-start"]
