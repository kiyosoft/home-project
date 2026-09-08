import Foundation

struct WatchSample {
  var headingDeg: Double
  var pitchDeg: Double
  var x: Double
  var y: Double
}

struct WatchPose {
  var headingDeg: Double
  var pitchDeg: Double
  var x: Double
  var y: Double
}

struct WatchDeviceModel: Codable, Equatable {
  var entityId: String
  var areaId: String
  var headingMean: Double
  var headingKappa: Double
  var pitchMean: Double
  var x: Double?
  var y: Double?
  var sampleCount: Int
  var contested: Bool
}

struct WatchInferResult {
  var entityId: String?
  var runnerUpId: String?
  var contested: Bool
  var score: Double
}

enum PointingModel {
  static let stepMeters = 0.7
  static let minSpanM = 0.4
  static let headingOkDeg = 28.0
  static let headingGapDeg = 8.0
  static let pitchWeight = 0.25
  static let paintSeconds = 5.0

  static func wrapDeg(_ deg: Double) -> Double {
    (deg.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
  }

  static func circularDistanceDeg(_ a: Double, _ b: Double) -> Double {
    let delta = abs(wrapDeg(a) - wrapDeg(b))
    return delta > 180 ? 360 - delta : delta
  }

  static func shortestSignedDeg(from: Double, to: Double) -> Double {
    var raw = wrapDeg(to) - wrapDeg(from)
    if raw > 180 { raw -= 360 }
    if raw < -180 { raw += 360 }
    return raw
  }

  static func circularMeanDeg(_ headings: [Double]) -> Double {
    guard !headings.isEmpty else { return 0 }
    var x = 0.0
    var y = 0.0
    for heading in headings {
      let radians = heading * .pi / 180
      x += cos(radians)
      y += sin(radians)
    }
    return wrapDeg(atan2(y, x) * 180 / .pi)
  }

  static func circularKappa(_ headings: [Double]) -> Double {
    guard headings.count >= 2 else { return 0 }
    var x = 0.0
    var y = 0.0
    for heading in headings {
      let radians = heading * .pi / 180
      x += cos(radians)
      y += sin(radians)
    }
    let result = hypot(x, y) / Double(headings.count)
    if result < 1e-6 { return 0 }
    if result > 0.999 { return 50 }
    return (result * (2 - result * result)) / (1 - result * result)
  }

  static func mean(_ values: [Double]) -> Double {
    guard !values.isEmpty else { return 0 }
    return values.reduce(0, +) / Double(values.count)
  }

  static func pdrStep(_ pose: WatchPose, walkHeadingDeg: Double, stepMeters: Double = stepMeters) -> WatchPose {
    let radians = walkHeadingDeg * .pi / 180
    var next = pose
    next.x += stepMeters * sin(radians)
    next.y += stepMeters * cos(radians)
    return next
  }

  static func boundingSpan(_ samples: [WatchSample]) -> Double {
    guard let first = samples.first else { return 0 }
    var minX = first.x
    var maxX = first.x
    var minY = first.y
    var maxY = first.y
    for sample in samples {
      minX = min(minX, sample.x)
      maxX = max(maxX, sample.x)
      minY = min(minY, sample.y)
      maxY = max(maxY, sample.y)
    }
    return hypot(maxX - minX, maxY - minY)
  }

  static func fitPoint(_ samples: [WatchSample]) -> (x: Double, y: Double)? {
    guard samples.count >= 3, boundingSpan(samples) >= minSpanM else { return nil }
    var a11 = 0.0
    var a12 = 0.0
    var a22 = 0.0
    var b1 = 0.0
    var b2 = 0.0
    for sample in samples {
      let theta = sample.headingDeg * .pi / 180
      let nx = cos(theta)
      let ny = -sin(theta)
      a11 += nx * nx
      a12 += nx * ny
      a22 += ny * ny
      let rhs = sample.x * nx + sample.y * ny
      b1 += nx * rhs
      b2 += ny * rhs
    }
    let det = a11 * a22 - a12 * a12
    guard abs(det) >= 1e-6 else { return nil }
    return ((a22 * b1 - a12 * b2) / det, (a11 * b2 - a12 * b1) / det)
  }

  static func paintDevice(entityId: String, areaId: String, samples: [WatchSample]) -> WatchDeviceModel {
    let headings = samples.map(\.headingDeg)
    let pitches = samples.map(\.pitchDeg)
    let point = fitPoint(samples)
    return WatchDeviceModel(
      entityId: entityId,
      areaId: areaId,
      headingMean: circularMeanDeg(headings),
      headingKappa: circularKappa(headings),
      pitchMean: mean(pitches),
      x: point?.x,
      y: point?.y,
      sampleCount: samples.count,
      contested: false
    )
  }

  static func scoreDevice(pose: WatchPose, device: WatchDeviceModel) -> Double {
    if let x = device.x, let y = device.y {
      let dx = x - pose.x
      let dy = y - pose.y
      let toHeading = wrapDeg(atan2(dx, dy) * 180 / .pi)
      let headingErr = circularDistanceDeg(pose.headingDeg, toHeading)
      return headingErr + abs(pose.pitchDeg - device.pitchMean) * pitchWeight
    }
    let headingErr = circularDistanceDeg(pose.headingDeg, device.headingMean)
    return headingErr + abs(pose.pitchDeg - device.pitchMean) * pitchWeight
  }

  static func inferTarget(pose: WatchPose, devices: [WatchDeviceModel], areaId: String) -> WatchInferResult {
    let pool = devices.filter { $0.areaId == areaId && $0.sampleCount > 0 }
    guard !pool.isEmpty else {
      return WatchInferResult(entityId: nil, runnerUpId: nil, contested: false, score: .infinity)
    }
    let ranked = pool
      .map { (device: $0, score: scoreDevice(pose: pose, device: $0)) }
      .sorted { $0.score < $1.score }
    let best = ranked[0]
    let second = ranked.count > 1 ? ranked[1] : nil
    let closeSecond = second.map { $0.score - best.score < headingGapDeg } ?? false
    let contested = best.score > headingOkDeg || closeSecond
    if best.score > headingOkDeg * 1.5 {
      return WatchInferResult(
        entityId: nil,
        runnerUpId: second?.device.entityId,
        contested: true,
        score: best.score
      )
    }
    return WatchInferResult(
      entityId: best.device.entityId,
      runnerUpId: (second != nil && (contested || second!.score < headingOkDeg))
        ? second?.device.entityId
        : nil,
      contested: contested,
      score: best.score
    )
  }

  static func applyCorrection(
    devices: [WatchDeviceModel],
    chosenId: String,
    rejectedId: String
  ) -> [WatchDeviceModel] {
    let chosen = devices.first { $0.entityId == chosenId }
    return devices.map { device in
      if device.entityId == chosenId {
        var next = device
        next.contested = false
        return next
      }
      guard device.entityId == rejectedId else { return device }
      var next = device
      next.contested = true
      if let chosen {
        let signed = shortestSignedDeg(from: chosen.headingMean, to: device.headingMean)
        next.headingMean = wrapDeg(device.headingMean + (signed >= 0 ? 18 : -18))
      }
      return next
    }
  }

  static func markContested(_ devices: [WatchDeviceModel]) -> [WatchDeviceModel] {
    devices.map { device in
      let rival = devices.contains {
        $0.entityId != device.entityId
          && $0.areaId == device.areaId
          && $0.sampleCount > 0
          && circularDistanceDeg(device.headingMean, $0.headingMean) < headingGapDeg
      }
      var next = device
      if rival { next.contested = true }
      return next
    }
  }
}
