import AVFoundation
import AppKit
let url=URL(fileURLWithPath:CommandLine.arguments[1])
let asset=AVURLAsset(url:url)
let sem=DispatchSemaphore(value:0)
Task{
  let dur=(try? await asset.load(.duration)).map{CMTimeGetSeconds($0)} ?? 0
  let gen=AVAssetImageGenerator(asset:asset)
  gen.appliesPreferredTrackTransform=true
  gen.requestedTimeToleranceBefore = .zero
  gen.requestedTimeToleranceAfter = .zero
  let n=28
  for i in 0..<n {
    let t=dur*Double(i)/Double(n-1)
    if let cg=try? await gen.image(at:CMTime(seconds:t,preferredTimescale:600)).image {
      let rep=NSBitmapImageRep(cgImage:cg)
      try? rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:String(format:"e%02d.png",i)))
    }
  }
  print("done dur=\(String(format:"%.2f",dur))s")
  sem.signal()
}
sem.wait()
