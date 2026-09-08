import ExpoModulesCore

public class EthioWatchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EthioWatch")

    Events("onToggle", "onCommand", "onGesture", "onModel", "onStatus")

    OnCreate {
      WatchBridge.shared.attach { [weak self] name, body in
        self?.sendEvent(name, body)
      }
    }

    Function("getStatus") {
      WatchBridge.shared.status()
    }

    Function("syncCatalog") { (catalog: [String: Any]) in
      WatchBridge.shared.syncCatalog(catalog)
    }

    Function("syncSnapshot") { (snapshot: [String: Any]) in
      WatchBridge.shared.syncSnapshot(snapshot)
    }

    Function("sendResult") { (result: [String: Any]) in
      WatchBridge.shared.sendResult(result)
    }

    Function("startPaint") { (entityId: String) in
      WatchBridge.shared.startPaint(entityId: entityId)
    }

    Function("setAtHome") { (atHome: Bool) in
      WatchBridge.shared.setAtHome(atHome)
    }

    Function("setArea") { (areaId: String) in
      WatchBridge.shared.setArea(areaId)
    }

    Function("clearPaint") { (entityId: String) in
      WatchBridge.shared.clearPaint(entityId: entityId)
    }
  }
}
