import SwiftUI

struct AccessoryRow: View {
  @EnvironmentObject private var runtime: WatchRuntime
  let entity: WatchCatalogEntity

  var body: some View {
    Button {
      runtime.actOnEntity(entity.id)
    } label: {
      HStack(spacing: 8) {
        Image(systemName: runtime.symbol(for: entity))
          .foregroundStyle(accent)
          .frame(width: 22)
        VStack(alignment: .leading, spacing: 1) {
          Text(entity.name)
            .font(.body)
            .foregroundStyle(runtime.isUnavailable(entity.id) ? .secondary : .primary)
          Text(runtime.caption(for: entity))
            .font(.caption2)
            .foregroundStyle(captionColor)
        }
        Spacer(minLength: 0)
      }
    }
    .disabled(runtime.isUnavailable(entity.id) || runtime.pendingIds.contains(entity.id))
    .contextMenu {
      Button("Point at it") {
        runtime.startPaint(entityId: entity.id)
      }
      if runtime.devices.contains(where: { $0.entityId == entity.id && $0.sampleCount > 0 }) {
        Button("Clear paint", role: .destructive) {
          runtime.clearPaint(entityId: entity.id)
        }
      }
    }
  }

  private var accent: Color {
    if entity.domain == "lock" {
      return runtime.isUnlocked(entity.id) ? .orange : .green
    }
    if entity.domain == "scene" || entity.domain == "script" {
      return runtime.flashedSceneId == entity.id ? .green : .yellow
    }
    return runtime.isOn(entity.id) ? .yellow : .secondary
  }

  private var captionColor: Color {
    if entity.domain == "lock", runtime.isUnlocked(entity.id) { return .orange }
    return .secondary
  }
}

struct LightsBulkButton: View {
  @EnvironmentObject private var runtime: WatchRuntime
  let areaId: String?

  var body: some View {
    let lights = scopedLights
    if !lights.isEmpty {
      let anyOn = lights.contains { runtime.isOn($0.id) }
      Button(anyOn ? "All Lights Off" : "All Lights On") {
        runtime.requestLights(on: !anyOn, areaId: areaId)
      }
      .buttonStyle(.borderedProminent)
    }
  }

  private var scopedLights: [WatchCatalogEntity] {
    let lights = runtime.lights()
    guard let areaId, !areaId.isEmpty else { return lights }
    return lights.filter { $0.areaId == areaId }
  }
}

struct UnlockConfirm: ViewModifier {
  @EnvironmentObject private var runtime: WatchRuntime

  func body(content: Content) -> some View {
    content.confirmationDialog(
      "Unlock \(runtime.pendingUnlockName())?",
      isPresented: Binding(
        get: { !runtime.pendingUnlockId.isEmpty },
        set: { if !$0 { runtime.cancelUnlock() } }
      ),
      titleVisibility: .visible
    ) {
      Button("Unlock", role: .destructive) {
        runtime.confirmUnlock()
      }
      Button("Cancel", role: .cancel) {
        runtime.cancelUnlock()
      }
    }
  }
}