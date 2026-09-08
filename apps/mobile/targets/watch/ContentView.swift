import SwiftUI

struct ContentView: View {
  @EnvironmentObject private var runtime: WatchRuntime

  var body: some View {
    TabView {
      HomeFace()
        .tag("home")
      RoomsFace()
        .tag("rooms")
      SnapFace()
        .tag("snap")
    }
    .tabViewStyle(.verticalPage)
    .modifier(UnlockConfirm())
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
        if !runtime.currentAreaName().isEmpty {
          Text(runtime.currentAreaName())
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        Text(runtime.aimedName())
          .font(.title3.weight(.semibold))
          .multilineTextAlignment(.center)
          .minimumScaleFactor(0.7)
        if let aimed = runtime.aimed?.entityId, let entity = runtime.entity(id: aimed) {
          Text(runtime.caption(for: entity))
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        if runtime.aimed?.contested == true, let other = runtime.runnerUpName() {
          Text("or \(other)?")
            .font(.caption)
            .foregroundStyle(.orange)
            .onTapGesture {
              runtime.chooseRunnerUp()
            }
        }
        Button(snapActionLabel) {
          runtime.toggleAimed()
        }
        .buttonStyle(.borderedProminent)
        .modifier(PrimaryHandGesture())
      }
    }
    .padding(.horizontal, 6)
  }

  private var snapActionLabel: String {
    guard let id = runtime.aimed?.entityId, let entity = runtime.entity(id: id) else {
      return "Tap to toggle"
    }
    return runtime.actionLabel(for: entity)
  }
}

private struct PrimaryHandGesture: ViewModifier {
  @ViewBuilder
  func body(content: Content) -> some View {
    if #available(watchOS 11.0, *) {
      content.handGestureShortcut(.primaryAction)
    } else {
      content
    }
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
