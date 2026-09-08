import SwiftUI

struct HomeFace: View {
  @EnvironmentObject private var runtime: WatchRuntime

  var body: some View {
    NavigationStack {
      List {
        Text(runtime.homeSummaryLine())
          .font(.headline)
          .listRowBackground(Color.clear)

        if !runtime.lights().isEmpty {
          NavigationLink {
            LightsCategoryView(areaId: nil)
              .navigationTitle("Lights")
          } label: {
            CategoryChip(
              title: "Lights",
              detail: runtime.summary.lightsOn == 0
                ? "All off"
                : runtime.summary.lightsOn == 1 ? "1 on" : "\(runtime.summary.lightsOn) on",
              symbol: "lightbulb.fill",
              attention: runtime.summary.lightsOn > 0
            )
          }
        }

        if !runtime.locks().isEmpty {
          NavigationLink {
            LocksCategoryView()
              .navigationTitle("Locks")
          } label: {
            CategoryChip(
              title: "Locks",
              detail: runtime.summary.unlocked == 0
                ? "All locked"
                : runtime.summary.unlocked == 1 ? "1 unlocked" : "\(runtime.summary.unlocked) unlocked",
              symbol: "lock.fill",
              attention: runtime.summary.unlocked > 0
            )
          }
        }

        if !runtime.scenes().isEmpty {
          Section("Scenes") {
            ForEach(runtime.scenes()) { entity in
              AccessoryRow(entity: entity)
            }
          }
        }

        if !runtime.favorites().isEmpty {
          Section("Favorites") {
            ForEach(runtime.favorites()) { entity in
              AccessoryRow(entity: entity)
            }
          }
        }

        if runtime.entities.isEmpty {
          Text("Open Ethio Home on iPhone to send devices.")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Home")
    }
  }
}

struct CategoryChip: View {
  let title: String
  let detail: String
  let symbol: String
  let attention: Bool

  var body: some View {
    HStack {
      Image(systemName: symbol)
        .foregroundStyle(attention ? .orange : .yellow)
      VStack(alignment: .leading) {
        Text(title)
        Text(detail)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
  }
}

struct LightsCategoryView: View {
  @EnvironmentObject private var runtime: WatchRuntime
  let areaId: String?

  var body: some View {
    List {
      LightsBulkButton(areaId: areaId)
      ForEach(groupedLights, id: \.area.id) { group in
        Section(group.area.name) {
          ForEach(group.lights) { entity in
            AccessoryRow(entity: entity)
          }
        }
      }
    }
  }

  private var groupedLights: [(area: WatchCatalogArea, lights: [WatchCatalogEntity])] {
    let lights = runtime.lights().filter { entity in
      guard let areaId, !areaId.isEmpty else { return true }
      return entity.areaId == areaId
    }
    return runtime.areas.compactMap { area in
      let members = lights.filter { $0.areaId == area.id }
      guard !members.isEmpty else { return nil }
      return (area, members)
    }
  }
}

struct LocksCategoryView: View {
  @EnvironmentObject private var runtime: WatchRuntime

  var body: some View {
    List {
      ForEach(runtime.locks()) { entity in
        AccessoryRow(entity: entity)
      }
    }
  }
}