import SwiftUI

@main
struct EthioWatchApp: App {
  @StateObject private var runtime = WatchRuntime()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(runtime)
    }
  }
}
