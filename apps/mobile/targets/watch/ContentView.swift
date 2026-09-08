import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var runtime: WatchRuntime

  var body: some View {
    TabView {
      SnapFace()
        .tag("snap")
      RoomsFace()
        .tag("rooms")
    }
    .tabViewStyle(.verticalPage)
  }
}

struct SnapFace: View {
  @EnvironmentObject private var runtime: WatchRuntime

  var body: some View {
    VStack(spacing: 8) {
      if !runtime.hasCompass {
        StatusCopy(
          title: "No compass",
          message: "Point-and-snap needs Series 5 or later, any SE, or Ultra."
        )
      } else if !runtime.atHome {
        StatusCopy(title: "Not home", message: "Snaps stay off until you are home.")
      } else if !runtime.paintingEntityId.isEmpty {
        Text("Point at it")
          .font(.headline)
        ProgressView(value: runtime.paintProgress)
        Text(runtime.entity(id: runtime.paintingEntityId)?.name ?? runtime.paintingEntityId)
          .font(.caption)
          .foregroundStyle(.secondary)
      } else {
        Text(runtime.aimedName())
          .font(.title3.weight(.semibold))
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.7)
        if runtime.aimed?.contested == true, let other = runtime.runnerUpName() {
          Text("or \(other)?")
            .font(.caption)
            .foregroundStyle(.orange)
            .onTapGesture {
              runtime.chooseRunnerUp()
            }
        }
        Button("Tap to toggle") {
          runtime.toggleAimed()
        }
        .buttonStyle(.borderedProminent)
      }
    }
    .padding(.horizontal, 6)
  }
}

struct RoomsFace: View {
  @EnvironmentObject private var runtime: WatchRuntime

  var body: some View {
    List {
      if runtime.areas.isEmpty {
        Text("Open Ethio Home on iPhone to send rooms.")
          .foregroundStyle(.secondary)
      }
      ForEach(runtime.areas) { area in
        Button {
          runtime.selectArea(area.id)
        } label: {
          HStack {
            Text(area.name)
            Spacer()
            if runtime.currentAreaId == area.id {
              Image(systemName: "checkmark")
            }
          }
        }
      }
      ForEach(runtime.entities.filter { $0.areaId == runtime.currentAreaId || runtime.currentAreaId.isEmpty }) { entity in
        let painted = runtime.devices.contains { $0.entityId == entity.id && $0.sampleCount > 0 }
        let contested = runtime.devices.contains { $0.entityId == entity.id && $0.contested }
        Button {
          runtime.startPaint(entityId: entity.id)
        } label: {
          VStack(alignment: .leading) {
            Text(entity.name)
            Text(painted ? (contested ? "Often contested · hold to clear" : "Painted · hold to clear") : "Not painted")
              .font(.caption2)
              .foregroundStyle(contested ? .orange : .secondary)
          }
        }
        .simultaneousGesture(
          LongPressGesture().onEnded { _ in
            runtime.clearPaint(entityId: entity.id)
          }
        )
      }
    }
    .navigationTitle("Rooms")
  }
}

struct StatusCopy: View {
  let title: String
  let message: String

  var body: some View {
    VStack(spacing: 6) {
      Text(title).font(.headline)
      Text(message)
        .font(.caption)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
  }
}
