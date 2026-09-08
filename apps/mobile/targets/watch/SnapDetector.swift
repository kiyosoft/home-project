import CoreMotion
import Foundation

/// High-pass jerk on the accelerometer. A finger snap is a short spike; a
/// walk is not. False positives still happen — tap remains the reliable path.
final class SnapDetector {
  private let motion = CMMotionManager()
  private var lastFire: TimeInterval = 0
  private var filtered = 0.0

  var onSnap: (() -> Void)?

  func start() {
    guard motion.isAccelerometerAvailable else { return }
    motion.accelerometerUpdateInterval = 1.0 / 50.0
    motion.startAccelerometerUpdates(to: .main) { [weak self] data, _ in
      guard let self, let data else { return }
      let magnitude = sqrt(
        data.acceleration.x * data.acceleration.x
          + data.acceleration.y * data.acceleration.y
          + data.acceleration.z * data.acceleration.z
      )
      // Gravity is ~1g. Keep the high-frequency leftover.
      self.filtered = 0.8 * self.filtered + 0.2 * magnitude
      let jerk = abs(magnitude - self.filtered)
      let now = ProcessInfo.processInfo.systemUptime
      guard jerk > 0.55, now - self.lastFire > 0.8 else { return }
      self.lastFire = now
      self.onSnap?()
    }
  }

  func stop() {
    motion.stopAccelerometerUpdates()
  }
}
