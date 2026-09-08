import CoreLocation
import Foundation
import WatchConnectivity
import WatchKit

struct WatchCatalog {
  var areas: [WatchCatalogArea]
  var entities: [WatchCatalogEntity]
}

@MainActor
final class WatchRuntime: NSObject, ObservableObject, WCSessionDelegate {
  @Published var areas: [WatchCatalogArea] = []
  @Published var entities: [WatchCatalogEntity] = []
  @Published var devices: [WatchDeviceModel] = []
  @Published var currentAreaId = ""
  @Published var atHome = true
  @Published var hasCompass = false
  @Published var phoneReachable = false
  @Published var aimed: WatchInferResult?
  @Published var paintingEntityId = ""
  @Published var paintProgress = 0.0
  @Published var lastMessage = ""

  private let heading = HeadingService()
  private let snap = SnapDetector()
  private let store = ModelStore()
  private var paintSamples: [WatchSample] = []
  private var paintTimer: Timer?
  private var inferClock: TimeInterval = 0

  override init() {
    super.init()
    devices = store.load()
    hasCompass = CLLocationManager.headingAvailable()
    heading.onChange = { [weak self] in
      Task { @MainActor in self?.headingMoved() }
    }
    snap.onSnap = { [weak self] in
      Task { @MainActor in self?.handleSnap() }
    }
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
    heading.start()
    snap.start()
    hasCompass = heading.hasCompass
  }

  func entity(id: String) -> WatchCatalogEntity? {
    entities.first { $0.id == id }
  }

  func aimedName() -> String {
    guard let id = aimed?.entityId else { return lastMessage.isEmpty ? "Point…" : lastMessage }
    return entity(id: id)?.name ?? id
  }

  func runnerUpName() -> String? {
    guard let id = aimed?.runnerUpId else { return nil }
    return entity(id: id)?.name ?? id
  }

  func selectArea(_ areaId: String) {
    currentAreaId = areaId
    inferNow()
    send(["type": "status", "hasCompass": hasCompass, "currentAreaId": currentAreaId, "paintingEntityId": paintingEntityId, "atHome": atHome])
  }

  func startPaint(entityId: String) {
    guard let entity = entity(id: entityId) else { return }
    if currentAreaId.isEmpty { currentAreaId = entity.areaId }
    paintingEntityId = entityId
    paintProgress = 0
    paintSamples = []
    heading.resetOrigin()
    heading.startWalking()
    lastMessage = "Point at \(entity.name)"
    WKInterfaceDevice.current().play(.start)
    paintTimer?.invalidate()
    let started = Date()
    paintTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] timer in
      Task { @MainActor in
        guard let self else { return }
        let elapsed = Date().timeIntervalSince(started)
        self.paintProgress = min(1, elapsed / PointingModel.paintSeconds)
        let pose = self.heading.pose
        self.paintSamples.append(
          WatchSample(headingDeg: pose.headingDeg, pitchDeg: pose.pitchDeg, x: pose.x, y: pose.y)
        )
        if elapsed >= PointingModel.paintSeconds {
          timer.invalidate()
          self.finishPaint()
        }
      }
    }
    sendStatus()
  }

  func clearPaint(entityId: String) {
    devices.removeAll { $0.entityId == entityId }
    store.save(devices)
    inferNow()
    emitModel()
  }

  func toggleAimed() {
    guard let entityId = aimed?.entityId else {
      refuse("Nothing aimed")
      return
    }
    requestToggle(entityId)
  }

  func chooseRunnerUp() {
    guard let chosen = aimed?.runnerUpId, let rejected = aimed?.entityId else { return }
    devices = PointingModel.applyCorrection(devices: devices, chosenId: chosen, rejectedId: rejected)
    store.save(devices)
    emitModel()
    requestToggle(chosen)
  }

  private func finishPaint() {
    heading.stopWalking()
    let entityId = paintingEntityId
    paintingEntityId = ""
    paintProgress = 0
    paintTimer = nil
    guard let entity = entity(id: entityId), !paintSamples.isEmpty else {
      sendStatus()
      return
    }
    let painted = PointingModel.paintDevice(
      entityId: entity.id,
      areaId: entity.areaId,
      samples: paintSamples
    )
    devices.removeAll { $0.entityId == entityId }
    devices.append(painted)
    devices = PointingModel.markContested(devices)
    store.save(devices)
    lastMessage = entity.name
    WKInterfaceDevice.current().play(.success)
    inferNow()
    emitModel()
    sendStatus()
  }

  private func headingMoved() {
    hasCompass = heading.hasCompass
    let now = ProcessInfo.processInfo.systemUptime
    guard now - inferClock > 0.1 else { return }
    inferClock = now
    inferNow()
  }

  private func inferNow() {
    guard paintingEntityId.isEmpty else { return }
    aimed = PointingModel.inferTarget(
      pose: heading.pose,
      devices: devices,
      areaId: currentAreaId
    )
  }

  private func handleSnap() {
    if !paintingEntityId.isEmpty { return }
    toggleAimed()
  }

  private func requestToggle(_ entityId: String) {
    guard atHome else {
      refuse("Not home")
      return
    }
    lastMessage = entity(id: entityId)?.name ?? entityId
    WKInterfaceDevice.current().play(.click)
    send(["type": "toggle", "entityId": entityId])
  }

  private func refuse(_ reason: String) {
    lastMessage = reason
    WKInterfaceDevice.current().play(.failure)
  }

  private func emitModel() {
    let payload: [[String: Any]] = devices.map {
      [
        "entityId": $0.entityId,
        "areaId": $0.areaId,
        "painted": $0.sampleCount > 0,
        "contested": $0.contested,
      ]
    }
    send(["type": "model", "devices": payload])
  }

  private func sendStatus() {
    send([
      "type": "status",
      "hasCompass": hasCompass,
      "currentAreaId": currentAreaId,
      "paintingEntityId": paintingEntityId,
      "atHome": atHome,
    ])
  }

  private func send(_ message: [String: Any]) {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.isReachable {
      session.sendMessage(message, replyHandler: nil) { _ in
        session.transferUserInfo(message)
      }
    } else if session.activationState == .activated {
      session.transferUserInfo(message)
    }
  }

  private func applyMessage(_ message: [String: Any]) {
    switch message["type"] as? String {
    case "catalog":
      applyCatalog(message)
    case "startPaint":
      if let entityId = message["entityId"] as? String {
        startPaint(entityId: entityId)
      }
    case "setAtHome":
      atHome = message["atHome"] as? Bool ?? atHome
    case "setArea":
      if let areaId = message["areaId"] as? String {
        selectArea(areaId)
      }
    case "clearPaint":
      if let entityId = message["entityId"] as? String {
        clearPaint(entityId: entityId)
      }
    default:
      if message["entities"] != nil {
        applyCatalog(message)
      }
    }
  }

  private func applyCatalog(_ message: [String: Any]) {
    let rawAreas = message["areas"] as? [[String: Any]] ?? []
    areas = rawAreas.compactMap { row in
      guard let id = row["id"] as? String, let name = row["name"] as? String else { return nil }
      return WatchCatalogArea(id: id, name: name)
    }
    let rawEntities = message["entities"] as? [[String: Any]] ?? []
    entities = rawEntities.compactMap { row in
      guard let id = row["id"] as? String, let name = row["name"] as? String else { return nil }
      return WatchCatalogEntity(
        id: id,
        name: name,
        areaId: row["areaId"] as? String ?? "",
        domain: row["domain"] as? String ?? ""
      )
    }
    if let atHome = message["atHome"] as? Bool {
      self.atHome = atHome
    }
    if let areaId = message["currentAreaId"] as? String, !areaId.isEmpty {
      currentAreaId = areaId
    } else if currentAreaId.isEmpty {
      currentAreaId = areas.first?.id ?? entities.first?.areaId ?? ""
    }
    inferNow()
  }

  nonisolated func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    Task { @MainActor in
      self.phoneReachable = session.isReachable
      if !session.receivedApplicationContext.isEmpty {
        self.applyMessage(session.receivedApplicationContext)
      }
      self.sendStatus()
      self.emitModel()
    }
  }

  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    Task { @MainActor in self.applyMessage(message) }
  }

  nonisolated func session(
    _ session: WCSession,
    didReceiveMessage message: [String: Any],
    replyHandler: @escaping ([String: Any]) -> Void
  ) {
    Task { @MainActor in self.applyMessage(message) }
    replyHandler(["ok": true])
  }

  nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    Task { @MainActor in self.applyMessage(userInfo) }
  }

  nonisolated func session(
    _ session: WCSession,
    didReceiveApplicationContext applicationContext: [String: Any]
  ) {
    Task { @MainActor in self.applyMessage(applicationContext) }
  }

  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    Task { @MainActor in self.phoneReachable = session.isReachable }
  }
}

