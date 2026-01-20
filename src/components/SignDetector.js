"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown } from "lucide-react";

export default function SignDetector({ onPrediction }) {
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [error, setError] = useState(null);

    // Refs
    const modelRef = useRef(null);
    const webcamRef = useRef(null);
    const requestRef = useRef(null);
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const streamRef = useRef(null);

    // Temporal smoothing refs
    const lastPredictionRef = useRef(null);  // Track last prediction label
    const consecutiveCountRef = useRef(0);   // Count of consecutive same predictions
    const confirmedClassRef = useRef(null);  // Currently confirmed class

    // State
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [availableCameras, setAvailableCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [showCameraMenu, setShowCameraMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(false);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile(); // Check on mount
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Detect if selected camera is front-facing
    useEffect(() => {
        if (selectedCameraId && availableCameras.length > 0) {
            const selectedCamera = availableCameras.find(c => c.deviceId === selectedCameraId);
            if (selectedCamera) {
                const label = selectedCamera.label.toLowerCase();
                // Front camera typically has 'front', 'user', 'facetime', or 'selfie' in the label
                // Back camera has 'back', 'rear', or 'environment'
                const isBack = label.includes('back') || label.includes('rear') || label.includes('environment');
                const isFront = label.includes('front') || label.includes('user') || label.includes('facetime') || label.includes('selfie');

                // If explicitly front, or not explicitly back (default to front for user-facing)
                setIsFrontCamera(isFront || (!isBack && availableCameras.length > 1));
            }
        }
    }, [selectedCameraId, availableCameras]);

    // Constants
    const URL_PREFIX = "/model/";
    const PREDICTION_THRESHOLD = 0.60;      // Per-frame confidence threshold
    const CONSECUTIVE_FRAMES_REQUIRED = 5;  // Frames needed to confirm a class
    const SIZE = 400;

    // Load Model
    useEffect(() => {
        const loadModel = async () => {
            try {
                if (!window.tmPose) {
                    throw new Error("Teachable Machine libraries not loaded.");
                }
                const modelURL = URL_PREFIX + "model.json";
                const metadataURL = URL_PREFIX + "metadata.json";

                console.log("Loading model...");
                modelRef.current = await window.tmPose.load(modelURL, metadataURL);
                setIsModelLoaded(true);
                console.log("Model loaded!");
            } catch (err) {
                console.error("Model load error:", err);
                setError(err.message);
            }
        };

        const interval = setInterval(() => {
            if (window.tmPose && !modelRef.current) {
                clearInterval(interval);
                loadModel();
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Enumerate available cameras
    useEffect(() => {
        const enumerateCameras = async () => {
            try {
                // Request camera permission first (needed to get device labels)
                await navigator.mediaDevices.getUserMedia({ video: true });

                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');

                setAvailableCameras(videoDevices);

                // Set default camera if not already set
                // Prefer back-facing camera (environment) as default
                if (!selectedCameraId && videoDevices.length > 0) {
                    // Try to find back camera first
                    const backCamera = videoDevices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.toLowerCase().includes('environment')
                    );
                    setSelectedCameraId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
                }

                console.log("Available cameras:", videoDevices.map(d => d.label || d.deviceId));
            } catch (err) {
                console.error("Failed to enumerate cameras:", err);
            }
        };

        enumerateCameras();
    }, []);

    // Setup Webcam with selected camera
    useEffect(() => {
        if (!isModelLoaded || !isCameraOn) {
            // Stop webcam if camera is off
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (webcamRef.current) {
                webcamRef.current.stop();
                webcamRef.current = null;
            }
            if (requestRef.current) {
                window.cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
            return;
        }

        let isCancelled = false;

        const setupWebcam = async () => {
            try {
                // Stop existing streams first
                if (requestRef.current) {
                    window.cancelAnimationFrame(requestRef.current);
                    requestRef.current = null;
                }
                if (webcamRef.current && webcamRef.current.webcam) {
                    webcamRef.current.webcam.pause();
                    webcamRef.current.webcam.srcObject = null;
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                if (isCancelled) return;

                const flip = true; // Flip the webcam

                // Create webcam with specific device if selected
                const constraints = {
                    video: selectedCameraId
                        ? { deviceId: { exact: selectedCameraId }, width: SIZE, height: SIZE }
                        : { width: SIZE, height: SIZE, facingMode: 'user' }
                };

                // Get stream with selected camera
                streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);

                if (isCancelled) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    return;
                }

                // Create tmPose webcam and inject our stream
                webcamRef.current = new window.tmPose.Webcam(SIZE, SIZE, flip);

                // Override the setup to use our stream
                const video = document.createElement('video');
                video.srcObject = streamRef.current;
                video.width = SIZE;
                video.height = SIZE;
                video.muted = true;
                video.playsInline = true;

                webcamRef.current.webcam = video;

                // Create internal canvas for tmPose
                webcamRef.current.canvas = document.createElement('canvas');
                webcamRef.current.canvas.width = SIZE;
                webcamRef.current.canvas.height = SIZE;

                // Wait for video to be ready before playing
                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = () => resolve();
                    video.onerror = (e) => reject(e);
                });

                if (isCancelled) return;

                await video.play();

                if (isCancelled) return;

                // Setup display canvas
                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.width = SIZE;
                    canvas.height = SIZE;
                    ctxRef.current = canvas.getContext("2d");
                }

                // Start the loop
                requestRef.current = window.requestAnimationFrame(loop);
            } catch (err) {
                if (isCancelled) return;
                console.error("Webcam setup error:", err);
                setError("Camera access failed: " + err.message);
            }
        };

        setupWebcam();

        return () => {
            isCancelled = true;
            if (requestRef.current) {
                window.cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
            if (webcamRef.current && webcamRef.current.webcam) {
                webcamRef.current.webcam.pause();
                webcamRef.current.webcam.srcObject = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            webcamRef.current = null;
        };
    }, [isModelLoaded, isCameraOn, selectedCameraId]);

    // Loop
    const loop = async () => {
        if (webcamRef.current && webcamRef.current.webcam && webcamRef.current.canvas) {
            // Draw video to internal canvas for pose estimation
            const internalCtx = webcamRef.current.canvas.getContext('2d');
            if (webcamRef.current.webcam.readyState >= 2) {
                internalCtx.drawImage(webcamRef.current.webcam, 0, 0, SIZE, SIZE);
            }
            await predict();
        }
        requestRef.current = window.requestAnimationFrame(loop);
    };

    const predict = async () => {
        if (!modelRef.current || !webcamRef.current || !ctxRef.current) return;

        const ctx = ctxRef.current;

        // Run pose estimation on the webcam canvas
        const { pose, posenetOutput } = await modelRef.current.estimatePose(webcamRef.current.canvas);

        // Get predictions
        const prediction = await modelRef.current.predict(posenetOutput);

        let highestProb = 0;
        let className = "";
        for (let i = 0; i < prediction.length; i++) {
            if (prediction[i].probability > highestProb) {
                highestProb = prediction[i].probability;
                className = prediction[i].className;
            }
        }

        // Temporal smoothing: Apply per-frame confidence threshold
        if (highestProb > PREDICTION_THRESHOLD) {
            // Check if this is the same class as previous frame
            if (className === lastPredictionRef.current) {
                consecutiveCountRef.current += 1;
            } else {
                // Different class detected, reset the counter
                lastPredictionRef.current = className;
                consecutiveCountRef.current = 1;
            }

            // Confirm class only after CONSECUTIVE_FRAMES_REQUIRED consecutive frames
            if (consecutiveCountRef.current >= CONSECUTIVE_FRAMES_REQUIRED) {
                // Only emit if this is a new confirmed class (avoid repeated emissions)
                if (className !== confirmedClassRef.current) {
                    confirmedClassRef.current = className;
                    onPrediction({ className, probability: highestProb });
                }
            }
        } else {
            // Below threshold: reset tracking
            lastPredictionRef.current = null;
            consecutiveCountRef.current = 0;
            // Don't reset confirmedClassRef - we want to remember the last confirmed class
        }

        // Draw the webcam frame to our visible canvas
        drawPose(pose, ctx);
    };

    const drawPose = (pose, ctx) => {
        if (webcamRef.current && webcamRef.current.canvas) {
            // Apply horizontal flip to remove mirror effect
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-SIZE, 0);

            // Draw the webcam canvas to our display canvas (flipped)
            ctx.drawImage(webcamRef.current.canvas, 0, 0);

            ctx.restore();

            // Draw the keypoints and skeleton (exactly like legacy code)
            // Note: keypoints need to be flipped too
            if (pose) {
                const minPartConfidence = 0.5;
                // Flip keypoint x positions
                const flippedKeypoints = pose.keypoints.map(kp => ({
                    ...kp,
                    position: {
                        x: SIZE - kp.position.x,
                        y: kp.position.y
                    }
                }));
                window.tmPose.drawKeypoints(flippedKeypoints, minPartConfidence, ctx);
                window.tmPose.drawSkeleton(flippedKeypoints, minPartConfidence, ctx);
            }
        }
    };

    return (
        <div className="relative rounded-lg overflow-hidden bg-black shadow-lg group w-full h-full">
            {!isModelLoaded && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-white p-4 z-10">
                    Loading AI Model...
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600 p-4 z-10">
                    Error: {error}
                </div>
            )}

            <canvas
                ref={canvasRef}
                className={`block w-full h-full ${!isCameraOn ? 'opacity-0' : 'opacity-100'}`}
                style={(isMobile && !isFrontCamera) ? { transform: 'scaleX(-1)' } : {}}
            />

            {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium bg-slate-800">
                    Camera Off
                </div>
            )}

            {/* Controls Overlay - Right Side */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity items-end z-20">
                <button
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    className={`px-3 py-1 rounded-full text-white transition-all font-bold text-xs shadow-md ${isCameraOn ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'}`}
                >
                    {isCameraOn ? "Stop Camera" : "Start Camera"}
                </button>
            </div>

            {/* Camera Selection - Left Side */}
            {availableCameras.length > 1 && (
                <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <div className="relative">
                        <button
                            onClick={() => setShowCameraMenu(!showCameraMenu)}
                            className="px-3 py-1 rounded-full text-white transition-all font-bold text-xs shadow-md bg-slate-700 hover:bg-slate-600 flex items-center gap-1"
                        >
                            <Camera size={12} />
                            Switch Camera
                            <ChevronDown size={12} className={`transition-transform ${showCameraMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Camera Dropdown Menu */}
                        {showCameraMenu && (
                            <div className="absolute top-full left-0 mt-1 bg-slate-800 rounded-lg shadow-xl border border-slate-600 overflow-hidden min-w-[180px]">
                                {availableCameras.map((camera, index) => (
                                    <button
                                        key={camera.deviceId}
                                        onClick={() => {
                                            setSelectedCameraId(camera.deviceId);
                                            setShowCameraMenu(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2 ${selectedCameraId === camera.deviceId
                                            ? 'bg-teal-600 text-white'
                                            : 'text-slate-300 hover:bg-slate-700'
                                            }`}
                                    >
                                        <Camera size={12} />
                                        <span className="truncate">
                                            {camera.label || `Camera ${index + 1}`}
                                        </span>
                                        {selectedCameraId === camera.deviceId && (
                                            <span className="ml-auto text-teal-300">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
