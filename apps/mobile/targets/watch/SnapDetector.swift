import CoreMotion
import Foundation

/// Sample at 100 Hz or a 10–20 ms snap never shows up.
final class SnapDetector {
  var onSnap: (() -> Void)?
  var onGesture: ((String) -> Void)?

  private let motion = CMMotionManager()
  private var lastFire: TimeInterval = 0
  private var lastSingleSnap: TimeInterval = 0
  private var lastGesture: TimeInterval = 0
  private var lastMag = 0.0
  private var recent: [Double] = []
  private var window: [(t: TimeInterval, mag: Double)] = []

  func start() {
    let interval = 1.0 / 100.0
    if motion.isDeviceMotionAvailable {
      motion.deviceMotionUpdateInterval = interval
      motion.startDeviceMotionUpdates(using: .xArbitraryZVertical, to: .main) { [weak self] data, _ in
        guard let self, let data else { return }
        let a = data.userAcceleration
        let mag = sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
        let rate = max(abs(data.rotationRate.y), abs(data.rotationRate.z))
        self.consider(mag: mag, rotationRate: rate)
      }
      return
    }
    guard motion.isAccelerometerAvailable else { return }
    motion.accelerometerUpdateInterval = interval
    motion.startAccelerometerUpdates(to: .main) { [weak self] data, _ in
      guard let self, let data else { return }
      let a = data.acceleration
      let magnitude = sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
      self.consider(mag: abs(magnitude - 1), rotationRate: 0)
    }
  }

  func stop() {
    motion.stopDeviceMotionUpdates()
    motion.stopAccelerometerUpdates()
  }

  private func consider(mag: Double, rotationRate: Double) {
    let now = ProcessInfo.processInfo.systemUptime
    recent.append(mag)
    if recent.count > 30 { recent.removeFirst() }
    window.append((now, mag))
    window.removeAll { now - $0.t > 0.5 }

    let rise = mag - lastMag
    lastMag = mag
    let walking = recent.filter { $0 > 0.22 }.count >= 8

    if lastSingleSnap > 0, mag > 0.28, rise > 0.16, !walking {
      let dt = now - lastSingleSnap
      if dt >= 0.45, dt <= 0.9 {
        lastSingleSnap = 0
        lastFire = now
        lastGesture = now
        onGesture?("double_snap")
        return
      }
    }

    if !walking, mag > 0.28, rise > 0.16, now - lastFire > 0.55 {
      lastFire = now
      lastSingleSnap = now
      lastGesture = now
      onSnap?()
      return
    }

    if now - lastGesture < 1 { return }
    if walking { return }

    if rotationRate > 4, mag < 1.2 {
      lastGesture = now
      lastSingleSnap = 0
      onGesture?("flick")
      return
    }

    if shakePeaks() >= 3 {
      lastGesture = now
      lastSingleSnap = 0
      onGesture?("shake")
    }
  }

  private func shakePeaks() -> Int {
    let mags = window.map(\.mag)
    guard mags.count >= 3 else { return 0 }
    var peaks = 0
    for index in 1..<(mags.count - 1) {
      let mag = mags[index]
      if mag < 0.35 { continue }
      if mag >= mags[index - 1], mag >= mags[index + 1] {
        peaks += 1
      }
    }
    return peaks
  }
}
