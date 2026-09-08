import Foundation

struct WatchCatalogEntity: Codable, Equatable, Identifiable {
  var id: String
  var name: String
  var areaId: String
  var domain: String
}

struct WatchCatalogArea: Codable, Equatable, Identifiable {
  var id: String
  var name: String
}

final class ModelStore {
  private let url: URL

  init() {
    let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    url = folder.appendingPathComponent("ethio-watch-model.json")
  }

  func load() -> [WatchDeviceModel] {
    guard let data = try? Data(contentsOf: url) else { return [] }
    return (try? JSONDecoder().decode([WatchDeviceModel].self, from: data)) ?? []
  }

  func save(_ devices: [WatchDeviceModel]) {
    guard let data = try? JSONEncoder().encode(devices) else { return }
    try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }
}
