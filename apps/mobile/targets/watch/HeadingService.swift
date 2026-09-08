import CoreLocation
import CoreMotion
import Foundation

final class HeadingService: NSObject, CLLocationManagerDelegate {
  private let location = CLLocationManager()
  private let motion = CMMotionManager()
  private let pedometer = CMPedometer()

  private(set) var headingDeg: Double = 0
  private(set) var pitchDeg: Double = 0
  private(set) var walkHeadingDeg: Double = 0
  private(set) var x: Double = 0
  private(set) var y: Double = 0
  private(set) var hasCompass = CLLocationManager.headingAvailable()

  var onChange: (() -> Void)?

  private var lastStepCount: Int = 0
  private var trackingSteps = false

  func start() {
    hasCompass = CLLocationManager.headingAvailable()
    location.delegate = self
    location.headingFilter = 1
    if location.authorizationStatus == .notDetermined {
      location.requestWhenInUseAuthorization()
    }
    if hasCompass {
      location.startUpdatingHeading()
    }
    startWalking()
    if motion.isDeviceMotionAvailable {
      motion.deviceMotionUpdateInterval = 0.1
      motion.startDeviceMotionUpdates(using: .xMagneticNorthZVertical, to: .main) { [weak self] data, _ in
        guard let self, let data else { return }
        self.pitchDeg = data.attitude.pitch * 180 / .pi
        self.onChange?()
      }
    }
  }

  func stop() {
    location.stopUpdatingHeading()
    motion.stopDeviceMotionUpdates()
    stopWalking()
  }

  func resetOrigin() {
    x = 0
    y = 0
  }

  func restorePose(x: Double, y: Double) {
    self.x = x
    self.y = y
  }

  func startWalking() {
    guard CMPedometer.isStepCountingAvailable(), !trackingSteps else { return }
    trackingSteps = true
    lastStepCount = 0
    pedometer.startUpdates(from: Date()) { [weak self] data, _ in
      guard let self, let data else { return }
      let steps = data.numberOfSteps.intValue
      let delta = max(0, steps - self.lastStepCount)
      self.lastStepCount = steps
      if delta > 0 {
        let next = PointingModel.pdrStep(
          WatchPose(headingDeg: self.headingDeg, pitchDeg: self.pitchDeg, x: self.x, y: self.y),
          walkHeadingDeg: self.walkHeadingDeg
        )
        self.x = next.x
        self.y = next.y
      }
    }
  }

  func stopWalking() {
    guard trackingSteps else { return }
    trackingSteps = false
    pedometer.stopUpdates()
  }

  var pose: WatchPose {
    WatchPose(headingDeg: headingDeg, pitchDeg: pitchDeg, x: x, y: y)
  }

  func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
    let value = newHeading.trueHeading >= 0 ? newHeading.trueHeading : newHeading.magneticHeading
    headingDeg = value
    if newHeading.headingAccuracy >= 0 {
      walkHeadingDeg = value
    }
    DispatchQueue.main.async { [weak self] in self?.onChange?() }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if hasCompass, manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
      location.startUpdatingHeading()
    }
  }
}
