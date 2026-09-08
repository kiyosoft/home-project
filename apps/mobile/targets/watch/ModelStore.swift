import Foundation

struct WatchEntityCapabilities: Codable, Equatable {
  var brightness: Bool
  var color: Bool
  var lockCode: Bool

  init(brightness: Bool = false, color: Bool = false, lockCode: Bool = false) {
    self.brightness = brightness
    self.color = color
    self.lockCode = lockCode
  }

  init(from dict: [String: Any]) {
    brightness = dict["brightness"] as? Bool ?? false
    color = dict["color"] as? Bool ?? false
    lockCode = dict["lockCode"] as? Bool ?? false
  }
}

struct WatchCatalogEntity: Codable, Equatable, Identifiable {
  var id: String
  var name: String
  var areaId: String
  var domain: String
  var favorite: Bool
  var capabilities: WatchEntityCapabilities
}

struct WatchCatalogArea: Codable, Equatable, Identifiable {
  var id: String
  var name: String
}

struct WatchEntityState: Codable, Equatable {
  var state: String
  var brightness: Int?
}

struct WatchAreaRollup: Codable, Equatable {
  var lightsOn: Int
  var unlocked: Int
}

struct WatchHomeSummary: Codable, Equatable {
  var lightsOn: Int
  var lockCount: Int
  var unlocked: Int
}

struct WatchSnapshotFile: Codable {
  var areas: [WatchCatalogArea]
  var entities: [WatchCatalogEntity]
  var atHome: Bool
  var connected: Bool
  var summary: WatchHomeSummary
  var areaRollups: [String: WatchAreaRollup]
  var states: [String: WatchEntityState]
}

struct WatchModelFile: Codable {
  var devices: [WatchDeviceModel]
  var poseX: Double
  var poseY: Double
}

final class ModelStore {
  private let url: URL

  init() {
    let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    url = folder.appendingPathComponent("ethio-watch-model.json")
  }

  func load() -> WatchModelFile {
    guard let data = try? Data(contentsOf: url) else {
      return WatchModelFile(devices: [], poseX: 0, poseY: 0)
    }
    if let file = try? JSONDecoder().decode(WatchModelFile.self, from: data) {
      return file
    }
    let devices = (try? JSONDecoder().decode([WatchDeviceModel].self, from: data)) ?? []
    return WatchModelFile(devices: devices, poseX: 0, poseY: 0)
  }

  func save(_ file: WatchModelFile) {
    guard let data = try? JSONEncoder().encode(file) else { return }
    try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
}

final class SnapshotStore {
  private let url: URL

  init() {
    let group = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: "group.app.ethiohome.companion"
    )
    let folder = group ?? FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    url = folder.appendingPathComponent("ethio-watch-snapshot.json")
  }

  func load() -> WatchSnapshotFile? {
    guard let data = try? Data(contentsOf: url) else { return nil }
    return try? JSONDecoder().decode(WatchSnapshotFile.self, from: data)
  }

  func save(_ file: WatchSnapshotFile) {
    guard let data = try? JSONEncoder().encode(file) else { return }
    try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
}
