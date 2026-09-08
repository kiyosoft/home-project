import ExpoModulesCore
import WatchConnectivity

typealias WatchEventSink = (String, [String: Any]) -> Void

final class WatchBridge: NSObject, WCSessionDelegate {
  static let shared = WatchBridge()

  private var sink: WatchEventSink?
  private var lastCatalog: [String: Any] = [:]
  private var lastWatchStatus: [String: Any] = [:]

  func attach(sink: @escaping WatchEventSink) {
    self.sink = sink
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    if session.activationState == .notActivated {
      session.activate()
    }
  }

  func status() -> [String: Any] {
    guard WCSession.isSupported() else {
      return [
        "available": false,
        "paired": false,
        "appInstalled": false,
        "reachable": false,
        "activated": false,
        "hasCompass": false,
        "currentAreaId": "",
        "paintingEntityId": "",
      ]
    }
    let session = WCSession.default
    var payload: [String: Any] = [
      "available": true,
      "paired": session.isPaired,
      "appInstalled": session.isWatchAppInstalled,
      "reachable": session.isReachable,
      "activated": session.activationState == .activated,
      "hasCompass": lastWatchStatus["hasCompass"] as? Bool ?? false,
      "currentAreaId": lastWatchStatus["currentAreaId"] as? String ?? "",
      "paintingEntityId": lastWatchStatus["paintingEntityId"] as? String ?? "",
    ]
    if let atHome = lastWatchStatus["atHome"] as? Bool {
      payload["atHome"] = atHome
    }
    return payload
  }

  func syncCatalog(_ catalog: [String: Any]) {
    lastCatalog = catalog
    send(catalog.merging(["type": "catalog"]) { _, incoming in incoming })
  }

  func startPaint(entityId: String) {
    send(["type": "startPaint", "entityId": entityId])
  }

  func setAtHome(_ atHome: Bool) {
    send(["type": "setAtHome", "atHome": atHome])
  }

  func setArea(_ areaId: String) {
    send(["type": "setArea", "areaId": areaId])
  }

  func clearPaint(entityId: String) {
    send(["type": "clearPaint", "entityId": entityId])
  }

  private func send(_ message: [String: Any]) {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.activationState == .activated {
      try? session.updateApplicationContext(message)
    }
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil, errorHandler: { error in
        session.transferUserInfo(message)
        NSLog("EthioWatch sendMessage failed: \(error.localizedDescription)")
      })
    } else if session.activationState == .activated {
      session.transferUserInfo(message)
    }
  }

  private func emit(_ name: String, _ body: [String: Any]) {
    DispatchQueue.main.async { [weak self] in
      self?.sink?(name, body)
    }
  }

  private func handleIncoming(_ message: [String: Any]) {
    let type = message["type"] as? String ?? ""
    switch type {
    case "toggle":
      if let entityId = message["entityId"] as? String {
        emit("onToggle", ["entityId": entityId])
      }
    case "model":
      emit("onModel", message)
    case "status":
      lastWatchStatus = message
      emit("onStatus", status())
    default:
      break
    }
  }

  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    if !lastCatalog.isEmpty {
      syncCatalog(lastCatalog)
    }
    emit("onStatus", status())
  }

  func sessionDidBecomeInactive(_ session: WCSession) {
    emit("onStatus", status())
  }

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    emit("onStatus", status())
  }

  func sessionWatchStateDidChange(_ session: WCSession) {
    emit("onStatus", status())
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handleIncoming(message)
  }

  func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    handleIncoming(message)
    replyHandler(["ok": true])
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    handleIncoming(userInfo)
  }

  func session(
    _ session: WCSession,
    didReceiveApplicationContext applicationContext: [String: Any]
  ) {
    handleIncoming(applicationContext)
  }
}
