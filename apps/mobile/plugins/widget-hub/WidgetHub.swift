/**
 * POSTs a widget tap to Home Assistant from the extension process.
 * Keep the target → service mapping in lockstep with `serviceCallForTarget`.
 */
enum WidgetHub {
  static let storageKey = "ethio-home.widget-hub.v1"

  static func deliver(target: String?) async {
    guard let target, let call = serviceCall(for: target) else { return }
    guard let webhookId, let urls, !urls.isEmpty else { return }

    let payload: [String: Any] = [
      "type": "call_service",
      "data": [
        "domain": call.domain,
        "service": call.service,
        "service_data": call.serviceData,
      ],
    ]
    guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }

    for url in urls {
      var base = url
      while base.hasSuffix("/") { base.removeLast() }
      guard let endpoint = URL(string: "\(base)/api/webhook/\(webhookId)") else { continue }

      var request = URLRequest(url: endpoint)
      request.httpMethod = "POST"
      request.timeoutInterval = 8
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.setValue("1", forHTTPHeaderField: "skip_zrok_interstitial")
      request.httpBody = body

      if let (_, response) = try? await URLSession.shared.data(for: request),
         let http = response as? HTTPURLResponse,
         (200 ... 299).contains(http.statusCode) {
        return
      }
    }
  }

  private static var webhookId: String? {
    guard let parsed else { return nil }
    let value = parsed["webhookId"] as? String ?? ""
    return value.isEmpty ? nil : value
  }

  private static var urls: [String]? {
    parsed?["urls"] as? [String]
  }

  private static var parsed: [String: Any]? {
    guard let raw = WidgetsStorage.getString(forKey: storageKey),
          let data = raw.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return nil }
    return json
  }

  private static func serviceCall(for target: String) -> (
    domain: String, service: String, serviceData: [String: Any]
  )? {
    if target.hasPrefix("todo:") {
      let rest = String(target.dropFirst("todo:".count))
      guard let colon = rest.firstIndex(of: ":") else { return nil }
      let entityId = String(rest[..<colon])
      let uid = String(rest[rest.index(after: colon)...])
      guard domainOf(entityId) == "todo", !uid.isEmpty else { return nil }
      return (
        "todo",
        "update_item",
        ["entity_id": entityId, "item": uid, "status": "completed"]
      )
    }
    if target.hasPrefix("scene:") {
      let entityId = String(target.dropFirst("scene:".count))
      let domain = domainOf(entityId)
      guard domain == "scene" || domain == "script" else { return nil }
      return (domain, "turn_on", ["entity_id": entityId])
    }
    if target.hasPrefix("toggle:") {
      let entityId = String(target.dropFirst("toggle:".count))
      let domain = domainOf(entityId)
      switch domain {
      case "light", "switch", "input_boolean", "fan":
        return (domain, "toggle", ["entity_id": entityId])
      default:
        return nil
      }
    }
    return nil
  }

  private static func domainOf(_ entityId: String) -> String {
    guard let index = entityId.firstIndex(of: "."), index > entityId.startIndex else {
      return ""
    }
    return String(entityId[..<index])
  }
}
