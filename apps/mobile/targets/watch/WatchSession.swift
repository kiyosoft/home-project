import CoreLocation
import Foundation
import WatchConnectivity
import WatchKit

@MainActor
final class WatchRuntime: NSObject, ObservableObject, WCSessionDelegate {
  @Published var areas: [WatchCatalogArea] = []
  @Published var entities: [WatchCatalogEntity] = []
  @Published var devices: [WatchDeviceModel] = []
  @Published var states: [String: WatchEntityState] = [:]
  @Published var areaRollups: [String: WatchAreaRollup] = [:]
  @Published var summary = WatchHomeSummary(lightsOn: 0, lockCount: 0, unlocked: 0)
  @Published var connected = false
  @Published var currentAreaId = ""
  @Published var atHome = true
  @Published var hasCompass = false
  @Published var phoneReachable = false
  @Published var aimed: WatchInferResult?
  @Published var paintingEntityId = ""
  @Published var paintProgress = 0.0
  @Published var lastMessage = ""
  @Published var pendingUnlockId = ""
  @Published var pendingIds: Set<String> = []
  @Published var flashedSceneId = ""

  private var pendingUnlockRequiresHome = false

  private let heading = HeadingService()
  private let snap = SnapDetector()
  private let store = ModelStore()
  private let snapshotStore = SnapshotStore()
  private var paintSamples: [WatchSample] = []
  private var paintTimer: Timer?
  private var flashTimer: Timer?
  private var inferClock: TimeInterval = 0
  private var persistClock: TimeInterval = 0

  override init() {
    super.init()
    let stored = store.load()
    devices = stored.devices
    heading.restorePose(x: stored.poseX, y: stored.poseY)
    if let live = snapshotStore.load() {
      areas = live.areas
      entities = live.entities
      atHome = live.atHome
      connected = live.connected
      summary = live.summary
      areaRollups = live.areaRollups
      states = live.states
    }
    hasCompass = CLLocationManager.headingAvailable()
    heading.onChange = { [weak self] in
      Task { @MainActor in self?.headingMoved() }
    }
    snap.onSnap = { [weak self] in
      Task { @MainActor in self?.handleSnap() }
    }
    snap.onGesture = { [weak self] gesture in
      Task { @MainActor in self?.requestGesture(gesture) }
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

  func area(id: String) -> WatchCatalogArea? {
    areas.first { $0.id == id }
  }

  func currentAreaName() -> String {
    area(id: currentAreaId)?.name ?? ""
  }

  func state(of entityId: String) -> String {
    states[entityId]?.state ?? ""
  }

  func isOn(_ entityId: String) -> Bool {
    state(of: entityId) == "on"
  }

  func isLocked(_ entityId: String) -> Bool {
    let value = state(of: entityId)
    return value == "locked" || value == "locking"
  }

  func isUnlocked(_ entityId: String) -> Bool {
    let value = state(of: entityId)
    return value == "unlocked" || value == "unlocking"
  }

  func isUnavailable(_ entityId: String) -> Bool {
    let value = state(of: entityId)
    return value == "unavailable" || value == "unknown" || value.isEmpty
  }

  func aimedName() -> String {
    guard let id = aimed?.entityId else { return lastMessage.isEmpty ? "Point…" : lastMessage }
    return entity(id: id)?.name ?? id
  }

  func runnerUpName() -> String? {
    guard let id = aimed?.runnerUpId else { return nil }
    return entity(id: id)?.name ?? id
  }

  func pendingUnlockName() -> String {
    entity(id: pendingUnlockId)?.name ?? pendingUnlockId
  }

  func scenes() -> [WatchCatalogEntity] {
    entities.filter { $0.domain == "scene" || $0.domain == "script" }
  }

  func favorites() -> [WatchCatalogEntity] {
    entities.filter { $0.favorite && $0.domain != "scene" && $0.domain != "script" }
  }

  func lights() -> [WatchCatalogEntity] {
    entities.filter { $0.domain == "light" }
  }

  func locks() -> [WatchCatalogEntity] {
    entities.filter { $0.domain == "lock" }
  }

  func entities(in areaId: String) -> [WatchCatalogEntity] {
    entities.filter { $0.areaId == areaId }
  }

  func roomCaption(_ areaId: String) -> String {
    if let rollup = areaRollups[areaId] {
      var parts: [String] = []
      if rollup.unlocked > 0 {
        parts.append(rollup.unlocked == 1 ? "Unlocked" : "\(rollup.unlocked) unlocked")
      }
      if rollup.lightsOn > 0 {
        parts.append(rollup.lightsOn == 1 ? "1 light on" : "\(rollup.lightsOn) lights on")
      } else if entities(in: areaId).contains(where: { $0.domain == "light" }) {
        parts.append("All off")
      }
      if !parts.isEmpty { return parts.joined(separator: " · ") }
    }
    return entities(in: areaId).isEmpty ? "No devices on wrist" : "All quiet"
  }

  func homeSummaryLine() -> String {
    var parts: [String] = []
    if summary.lightsOn == 1 { parts.append("1 light on") }
    else if summary.lightsOn > 1 { parts.append("\(summary.lightsOn) lights on") }
    else if !lights().isEmpty { parts.append("Lights off") }
    if summary.unlocked == 1 { parts.append("1 unlocked") }
    else if summary.unlocked > 1 { parts.append("\(summary.unlocked) unlocked") }
    else if summary.lockCount > 0 { parts.append("All locked") }
    if parts.isEmpty {
      return phoneReachable ? "Home" : "Phone unreachable"
    }
    return parts.joined(separator: " · ")
  }

  func caption(for entity: WatchCatalogEntity) -> String {
    let value = state(of: entity.id)
    if isUnavailable(entity.id) { return "Unavailable" }
    switch entity.domain {
    case "lock":
      switch value {
      case "locked": return "Locked"
      case "unlocked": return "Unlocked"
      case "locking": return "Locking"
      case "unlocking": return "Unlocking"
      case "jammed": return "Jammed"
      default: return value.capitalized
      }
    case "scene", "script":
      return flashedSceneId == entity.id ? "Activated" : "Tap to run"
    default:
      return isOn(entity.id) ? "On" : "Off"
    }
  }

  func symbol(for entity: WatchCatalogEntity) -> String {
    switch entity.domain {
    case "light": return isOn(entity.id) ? "lightbulb.fill" : "lightbulb"
    case "lock": return isLocked(entity.id) ? "lock.fill" : "lock.open.fill"
    case "fan": return isOn(entity.id) ? "fan.fill" : "fan"
    case "scene": return "sparkles"
    case "script": return "play.fill"
    default: return isOn(entity.id) ? "switch.2" : "switch.2"
    }
  }

  func actionLabel(for entity: WatchCatalogEntity) -> String {
    switch entity.domain {
    case "scene", "script": return "Tap to activate"
    case "lock": return isLocked(entity.id) ? "Tap to unlock" : "Tap to lock"
    default: return "Tap to toggle"
    }
  }

  func sortedRooms() -> [WatchCatalogArea] {
    areas.sorted { left, right in
      let leftUnlock = areaRollups[left.id]?.unlocked ?? 0
      let rightUnlock = areaRollups[right.id]?.unlocked ?? 0
      if leftUnlock != rightUnlock { return leftUnlock > rightUnlock }
      if left.id == "unassigned" { return false }
      if right.id == "unassigned" { return true }
      return left.name.localizedCaseInsensitiveCompare(right.name) == .orderedAscending
    }
  }

  func selectArea(_ areaId: String) {
    currentAreaId = areaId
    inferNow()
    sendStatus()
  }

  func startPaint(entityId: String) {
    guard let entity = entity(id: entityId) else { return }
    if currentAreaId.isEmpty { currentAreaId = entity.areaId }
    paintingEntityId = entityId
    paintProgress = 0
    paintSamples = []
    let areaHasPaint = devices.contains { $0.areaId == entity.areaId && $0.sampleCount > 0 }
    if !areaHasPaint {
      heading.resetOrigin()
    }
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
    persist()
    inferNow()
    emitModel()
  }

  func toggleAimed() {
    guard let entityId = aimed?.entityId else {
      refuse("Nothing aimed")
      return
    }
    actOnEntity(entityId, requireHome: true)
  }

  func chooseRunnerUp() {
    guard let chosen = aimed?.runnerUpId, let rejected = aimed?.entityId else { return }
    devices = PointingModel.applyCorrection(devices: devices, chosenId: chosen, rejectedId: rejected)
    persist()
    emitModel()
    actOnEntity(chosen, requireHome: true)
  }

  func actOnEntity(_ entityId: String, requireHome: Bool = false) {
    guard let entity = entity(id: entityId) else { return }
    if isUnavailable(entityId) {
      refuse("Unavailable")
      return
    }
    if entity.domain == "lock" {
      if isLocked(entityId) {
        if entity.capabilities.lockCode {
          refuse("Use iPhone")
          return
        }
        pendingUnlockId = entityId
        pendingUnlockRequiresHome = requireHome
        return
      }
      requestCommand(kind: "lock", entityId: entityId, requireHome: requireHome)
      return
    }
    if entity.domain == "scene" || entity.domain == "script" {
      requestCommand(kind: "activate", entityId: entityId, requireHome: requireHome)
      return
    }
    requestCommand(kind: "toggle", entityId: entityId, requireHome: requireHome)
  }

  func confirmUnlock() {
    let entityId = pendingUnlockId
    let requireHome = pendingUnlockRequiresHome
    pendingUnlockId = ""
    pendingUnlockRequiresHome = false
    guard !entityId.isEmpty else { return }
    requestCommand(kind: "unlock", entityId: entityId, requireHome: requireHome)
  }

  func cancelUnlock() {
    pendingUnlockId = ""
    pendingUnlockRequiresHome = false
  }

  func requestLights(on: Bool, areaId: String?) {
    requestCommand(
      kind: "group",
      action: on ? "lights_on" : "lights_off",
      areaId: areaId ?? ""
    )
  }

  private func persist() {
    let pose = heading.pose
    store.save(WatchModelFile(devices: devices, poseX: pose.x, poseY: pose.y))
  }

  private func persistLive() {
    snapshotStore.save(
      WatchSnapshotFile(
        areas: areas,
        entities: entities,
        atHome: atHome,
        connected: connected,
        summary: summary,
        areaRollups: areaRollups,
        states: states
      )
    )
  }

  private func finishPaint() {
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
    let previous = devices.first { $0.entityId == entityId }
    devices.removeAll { $0.entityId == entityId }
    devices.append(PointingModel.mergePaint(existing: previous, next: painted))
    devices = PointingModel.markContested(devices)
    persist()
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
    if !devices.isEmpty, now - persistClock > 4 {
      persistClock = now
      persist()
    }
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

  private func requestGesture(_ gesture: String) {
    lastMessage = gestureLabel(gesture)
    WKInterfaceDevice.current().play(.click)
    send(["type": "gesture", "gesture": gesture])
  }

  private func gestureLabel(_ gesture: String) -> String {
    switch gesture {
    case "double_snap": return "Double snap"
    case "shake": return "Shake"
    case "flick": return "Flick"
    default: return gesture
    }
  }

  private func requestCommand(
    kind: String,
    entityId: String = "",
    action: String = "",
    areaId: String = "",
    data: [String: Any] = [:],
    requireHome: Bool = false
  ) {
    if requireHome, !atHome {
      refuse("Not home")
      return
    }
    if !entityId.isEmpty {
      lastMessage = entity(id: entityId)?.name ?? entityId
      pendingIds.insert(entityId)
      applyOptimistic(kind: kind, entityId: entityId)
    } else if kind == "group" {
      applyGroupOptimistic(on: action == "lights_on", areaId: areaId)
    }
    WKInterfaceDevice.current().play(.click)
    var payload: [String: Any] = ["type": "command", "kind": kind]
    if !entityId.isEmpty { payload["entityId"] = entityId }
    if !action.isEmpty { payload["action"] = action }
    if !areaId.isEmpty { payload["areaId"] = areaId }
    if !data.isEmpty { payload["data"] = data }
    send(payload)
  }

  private func applyOptimistic(kind: String, entityId: String) {
    var current = states[entityId] ?? WatchEntityState(state: "", brightness: nil)
    switch kind {
    case "lock":
      current.state = "locking"
    case "unlock":
      current.state = "unlocking"
    case "activate":
      current.state = "on"
      flashScene(entityId)
    case "toggle":
      current.state = current.state == "on" ? "off" : "on"
    default:
      break
    }
    states[entityId] = current
  }

  private func applyGroupOptimistic(on: Bool, areaId: String) {
    for entity in entities where entity.domain == "light" {
      if !areaId.isEmpty, entity.areaId != areaId { continue }
      var current = states[entity.id] ?? WatchEntityState(state: "", brightness: nil)
      current.state = on ? "on" : "off"
      states[entity.id] = current
      pendingIds.insert(entity.id)
    }
  }

  private func flashScene(_ entityId: String) {
    flashedSceneId = entityId
    flashTimer?.invalidate()
    flashTimer = Timer.scheduledTimer(withTimeInterval: 1.4, repeats: false) { [weak self] _ in
      Task { @MainActor in
        self?.flashedSceneId = ""
      }
    }
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
        "mapped": PointingModel.isRoomMapped($0),
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
    case "snapshot":
      applySnapshot(message)
    case "result":
      applyResult(message)
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
      } else if message["states"] != nil {
        applySnapshot(message)
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
      let caps = row["capabilities"] as? [String: Any] ?? [:]
      return WatchCatalogEntity(
        id: id,
        name: name,
        areaId: row["areaId"] as? String ?? "",
        domain: row["domain"] as? String ?? "",
        favorite: row["favorite"] as? Bool ?? false,
        capabilities: WatchEntityCapabilities(from: caps)
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
    persistLive()
    inferNow()
  }

  private func applySnapshot(_ message: [String: Any]) {
    if let atHome = message["atHome"] as? Bool {
      self.atHome = atHome
    }
    connected = message["connected"] as? Bool ?? connected
    if let raw = message["summary"] as? [String: Any] {
      summary = WatchHomeSummary(
        lightsOn: intValue(raw["lightsOn"]),
        lockCount: intValue(raw["lockCount"]),
        unlocked: intValue(raw["unlocked"])
      )
    }
    if let rawAreas = message["areas"] as? [String: Any] {
      var next: [String: WatchAreaRollup] = [:]
      for (id, value) in rawAreas {
        let row = value as? [String: Any] ?? [:]
        next[id] = WatchAreaRollup(
          lightsOn: intValue(row["lightsOn"]),
          unlocked: intValue(row["unlocked"])
        )
      }
      areaRollups = next
    }
    if let rawStates = message["states"] as? [String: Any] {
      var next: [String: WatchEntityState] = [:]
      for (id, value) in rawStates {
        let row = value as? [String: Any] ?? [:]
        next[id] = WatchEntityState(
          state: row["state"] as? String ?? "",
          brightness: intOptional(row["brightness"])
        )
      }
      states = next
    }
    persistLive()
  }

  private func applyResult(_ message: [String: Any]) {
    let ok = message["ok"] as? Bool ?? false
    WKInterfaceDevice.current().play(ok ? .success : .failure)
    if message["gesture"] != nil {
      if !ok { lastMessage = "Didn't reach the hub" }
      return
    }
    if let entityId = message["entityId"] as? String {
      pendingIds.remove(entityId)
      if let state = message["state"] as? String {
        var current = states[entityId] ?? WatchEntityState(state: state, brightness: nil)
        current.state = state
        states[entityId] = current
      }
      if !ok {
        lastMessage = "Didn't reach the hub"
      }
    }
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

private func intValue(_ value: Any?) -> Int {
  if let number = value as? Int { return number }
  if let number = value as? Double { return Int(number) }
  if let number = value as? NSNumber { return number.intValue }
  return 0
}

private func intOptional(_ value: Any?) -> Int? {
  if value == nil { return nil }
  return intValue(value)
}
