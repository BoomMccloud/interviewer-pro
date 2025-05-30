"use client"

import { useState, useEffect, useRef } from "react"

export function VideoFeed() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isVideoActive, setIsVideoActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsVideoActive(true)
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
        setError("Could not access camera. Please check permissions.")
      }
    }

    void setupCamera()

    return () => {
      // Clean up video stream when component unmounts
      const currentVideo = videoRef.current
      if (currentVideo?.srcObject) {
        const stream = currentVideo.srcObject as MediaStream
        const tracks = stream.getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [])

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      {error ? (
        <div className="text-white p-4 text-center">
          <p>{error}</p>
          <p className="text-sm mt-2">Please enable camera access to continue</p>
        </div>
      ) : !isVideoActive ? (
        <div className="text-white">Loading camera...</div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      )}
    </div>
  )
}
