ARG BUILD_FROM=ghcr.io/home-assistant/base:latest
FROM ${BUILD_FROM}

ARG BUILD_ARCH
ARG BUILD_VERSION=0.2.0
ARG CLOUDFLARED_VERSION=2025.2.1

LABEL \
  io.hass.name="Ethio Home" \
  io.hass.description="Plugin-driven Home Assistant dashboard" \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="addon" \
  io.hass.arch="${BUILD_ARCH}"

RUN apk --no-cache add nginx nodejs curl \
  && mkdir -p /run/nginx /www /opt/tunnel-agent

# Arch mapping: HA amd64/aarch64 → cloudflared linux-amd64/arm64
RUN case "${BUILD_ARCH}" in \
      amd64) CF_ARCH=amd64 ;; \
      aarch64) CF_ARCH=arm64 ;; \
      *) echo "Unsupported BUILD_ARCH=${BUILD_ARCH}" >&2; exit 1 ;; \
    esac \
  && curl -fsSL \
      "https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-linux-${CF_ARCH}" \
      -o /usr/local/bin/cloudflared \
  && chmod +x /usr/local/bin/cloudflared \
  && cloudflared --version

COPY rootfs/ /
COPY www/ /www/
COPY tunnel-agent/ /opt/tunnel-agent/

RUN chmod +x /usr/bin/ethio-home-start

CMD ["/usr/bin/ethio-home-start"]
