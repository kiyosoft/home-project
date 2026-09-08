import SwiftUI

struct RoomsFace: View {
  @EnvironmentObject private var runtime: WatchRuntime

  var body: some View {
    NavigationStack {
      List {
        if runtime.areas.isEmpty {
          Text("Open Ethio Home on iPhone to send rooms.")
            .foregroundStyle(.secondary)
        }
        ForEach(runtime.sortedRooms()) { area in
          NavigationLink {
            RoomDetailView(area: area)
              .onAppear { runtime.selectArea(area.id) }
          } label: {
            VStack(alignment: .leading, spacing: 2) {
              Text(area.name)
              Text(runtime.roomCaption(area.id))
                .font(.caption2)
                .foregroundStyle(
                  (runtime.areaRollups[area.id]?.unlocked ?? 0) > 0 ? .orange : .secondary
                )
            }
          }
        }
      }
      .navigationTitle("Rooms")
    }
  }
}

struct RoomDetailView: View {
  @EnvironmentObject private var runtime: WatchRuntime
  let area: WatchCatalogArea

  var body: some View {
    List {
      if runtime.currentAreaId == area.id {
        Text("Using for Snap")
          .font(.caption2)
          .foregroundStyle(.secondary)
          .listRowBackground(Color.clear)
      }
      LightsBulkButton(areaId: area.id)
      ForEach(grouped, id: \.title) { group in
        Section(group.title) {
          ForEach(group.entities) { entity in
            AccessoryRow(entity: entity)
          }
        }
      }
    }
    .navigationTitle(area.name)
  }

  private var grouped: [(title: String, entities: [WatchCatalogEntity])] {
    let members = runtime.entities(in: area.id)
    let order = [
      ("Locks", members.filter { $0.domain == "lock" }),
      ("Lights", members.filter { $0.domain == "light" }),
      ("Switches", members.filter { ["switch", "input_boolean", "fan"].contains($0.domain) }),
      ("Scenes", members.filter { $0.domain == "scene" || $0.domain == "script" }),
    ]
    return order.compactMap { title, entities in
      entities.isEmpty ? nil : (title, entities)
    }
  }
}