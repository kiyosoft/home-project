/** Escape a URL so it is safe inside a double-quoted HTML attribute. */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Origin for WebView `baseUrl`, so the MJPEG `<img>` can load from the hub. */
export function hubOrigin(url: string): string | undefined {
  try {
    return `${new URL(url).origin}/`;
  } catch {
    return undefined;
  }
}

/**
 * Tiny page that plays HA's MJPEG the same way a browser `<img>` does.
 * Native `Image` cannot decode multipart streams; WKWebView / Android WebView can.
 */
export function mjpegPlayerHtml(src: string): string {
  const escaped = escapeHtmlAttr(src);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}
  img{width:100%;height:100%;object-fit:cover;display:block}
</style>
</head>
<body>
<img src="${escaped}" alt="" onload="window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('ready')" onerror="window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('failed')"/>
</body>
</html>`;
}
