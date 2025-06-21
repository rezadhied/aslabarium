import React, { useState, useEffect, useRef, useCallback } from 'react';

// Main App component for the aquarium
const App = () => {
    // State to hold all the fish objects in the aquarium
    const [fishes, setFishes] = useState([]);
    // Reference to the aquarium container element to get its dimensions
    const aquariumRef = useRef(null);
    // State to store the dimensions of the aquarium
    const [aquariumDimensions, setAquariumDimensions] = useState({ width: 0, height: 0 });

    // State for the passing shark
    const [shark, setShark] = useState({
        x: -500, // Start off-screen to the left
        y: 0,
        visible: false,
        flipped: false,
        speed: 10, // Shark speed
        size: 1500, // Shark size
    });

    // Constants for fish behavior
    const FISH_BASE_SPEED = 2; // Pixels per frame for normal movement
    const FISH_DEFAULT_SIZE = 200; // Default size for fish image (width and height)

    // Constants for click interactions
    const JUMP_SCARE_DURATION_MS = 2000; // Duration of the jump scare animation (grow and shrink)
    const MAX_SCARE_SIZE_RATIO = 0.9; // Max size relative to aquarium's smaller dimension (width or height) during scare

    // Shark specific constants
    const SHARK_PASS_INTERVAL_MS = 5000; // Shark passes every 10 seconds

    // --- IMPORTANT: Replace these with your actual fish image URLs ---
    // If you're running this locally, place your fish images in the 'public' folder
    // and reference them like '/your-fish-image.png'
    const fishImageSources = [
        '/fish_1.png',
        '/fish_2.png',
        '/fish_3.png',
        '/fish_4.png',
        '/fish_5.png',
        '/fish_6.png',
        '/fish_7.png',
        '/fish_8.png',
    ];
    // --- End of important section ---

    // Effect to get aquarium dimensions on mount and resize
    useEffect(() => {
        const updateDimensions = () => {
            if (aquariumRef.current) {
                setAquariumDimensions({
                    width: aquariumRef.current.clientWidth,
                    height: aquariumRef.current.clientHeight,
                });
            }
        };

        updateDimensions(); // Call once on mount
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions); // Cleanup event listener
    }, []);

    // Function to add a new fish to the aquarium (used for initial loading)
    const addFishInitial = useCallback((src) => {
        const newFishId = Date.now() + Math.random();
        const x = Math.random() * (aquariumDimensions.width - FISH_DEFAULT_SIZE);
        const y = Math.random() * (aquariumDimensions.height - FISH_DEFAULT_SIZE);
        const dx = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
        const dy = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;

        setFishes(prevFishes => [
            ...prevFishes,
            {
                id: newFishId,
                src: src,
                x: Math.max(0, Math.min(x, aquariumDimensions.width - FISH_DEFAULT_SIZE)),
                y: Math.max(0, Math.min(y, aquariumDimensions.height - FISH_DEFAULT_SIZE)),
                dx: dx === 0 ? FISH_BASE_SPEED : dx, // Ensure non-zero horizontal speed
                dy: dy === 0 ? FISH_BASE_SPEED : dy, // Ensure non-zero vertical speed
                flipped: dx < 0,
                isScaring: false,          // Jump scare state
                originalSize: FISH_DEFAULT_SIZE, // Store initial size
                currentSize: FISH_DEFAULT_SIZE,  // Dynamic size (for scaling during scare)
                scareProgress: 0,          // Progress of the jump scare animation (0 to 1)
                originalX: x,              // Store initial position for scare reset
                originalY: y,
            },
        ]);
    }, [aquariumDimensions]);

    // Effect to automatically add fish based on fishImageSources array
    useEffect(() => {
        if (aquariumDimensions.width > 0 && aquariumDimensions.height > 0 && fishes.length === 0) {
            fishImageSources.forEach(src => {
                addFishInitial(src);
            });
        }
    }, [aquariumDimensions, fishes.length, addFishInitial, fishImageSources]);

    // Function to handle fish click event
    const handleFishClick = useCallback((id) => {
        setFishes(prevFishes => prevFishes.map(fish => {
            if (fish.id === id) {
                let newIsScaring = true; // Always trigger scare on click
                let newScareProgress = 0; // Always start animation from beginning
                let newDx = 0; // Stop movement during scare
                let newDy = 0;

                // Capture current position as new original for this scare
                // This ensures the fish returns to where it was *when clicked* after the scare.
                let newOriginalX = fish.x;
                let newOriginalY = fish.y;

                return {
                    ...fish,
                    isScaring: newIsScaring,
                    scareProgress: newScareProgress,
                    originalX: newOriginalX,
                    originalY: newOriginalY,
                    dx: newDx,
                    dy: newDy,
                };
            }
            return fish;
        }));
    }, []);

    // Main animation loop logic, wrapped in useCallback for performance
    const animateFishes = useCallback((currentTime) => {
        setFishes(prevFishes => {
            return prevFishes.map(fish => {
                let newX = fish.x;
                let newY = fish.y;
                let newDx = fish.dx;
                let newDy = fish.dy;
                let newFlipped = fish.flipped;
                let newCurrentSize = fish.currentSize;
                let newIsScaring = fish.isScaring;
                let newScareProgress = fish.scareProgress;

                if (newIsScaring) {
                    newScareProgress = Math.min(1, fish.scareProgress + (1000 / JUMP_SCARE_DURATION_MS) * (1 / 60));

                    const scareSize = Math.min(aquariumDimensions.width, aquariumDimensions.height) * MAX_SCARE_SIZE_RATIO;
                    const normalSize = fish.originalSize;

                    if (newScareProgress < 0.2) {
                        newCurrentSize = normalSize + (scareSize - normalSize) * (newScareProgress / 0.2);
                    } else {
                        newCurrentSize = scareSize - (scareSize - normalSize) * ((newScareProgress - 0.2) / 0.8);
                    }

                    const targetX = (aquariumDimensions.width / 2) - (newCurrentSize / 2);
                    const targetY = (aquariumDimensions.height / 2) - (newCurrentSize / 2);

                    const moveProgressSegment = newScareProgress * 2;
                    let actualMoveProgress;
                    if (moveProgressSegment <= 1) {
                        actualMoveProgress = moveProgressSegment;
                    } else {
                        actualMoveProgress = 1 - (moveProgressSegment - 1);
                    }

                    newX = fish.originalX + (targetX - fish.originalX) * actualMoveProgress;
                    newY = fish.originalY + (targetY - fish.originalY) * actualMoveProgress;


                    if (newScareProgress >= 1) {
                        newIsScaring = false;
                        newCurrentSize = normalSize;
                        newX = fish.originalX;
                        newY = fish.originalY;

                        newDx = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
                        newDy = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
                    }

                } else {
                    newX = fish.x + newDx;
                    newY = fish.y + newDy;

                    if (newX + fish.currentSize > aquariumDimensions.width || newX < 0) {
                        newDx *= -1;
                        newX = fish.x;
                        newFlipped = newDx < 0;
                    }

                    if (newY + fish.currentSize > aquariumDimensions.height || newY < 0) {
                        newDy *= -1;
                        newY = fish.y;
                    }
                }

                return {
                    ...fish,
                    x: newX,
                    y: newY,
                    dx: newDx,
                    dy: newDy,
                    flipped: newFlipped,
                    currentSize: newCurrentSize,
                    isScaring: newIsScaring,
                    scareProgress: newScareProgress,
                };
            });
        });
    }, [aquariumDimensions]);

    // Shark animation loop logic, wrapped in useCallback
    const animateShark = useCallback(() => {
        setShark(prevShark => {
            if (!prevShark.visible) return prevShark; // If not visible, no need to animate

            let newX = prevShark.x + (prevShark.flipped ? -prevShark.speed : prevShark.speed);

            // Check if shark has passed completely off-screen
            if (prevShark.flipped && newX < -prevShark.size) { // Moving left, off left side
                return { ...prevShark, visible: false, x: -prevShark.size };
            }
            if (!prevShark.flipped && newX > aquariumDimensions.width) { // Moving right, off right side
                return { ...prevShark, visible: false, x: aquariumDimensions.width };
            }

            return { ...prevShark, x: newX };
        });
    }, [aquariumDimensions]);


    // Effect for the main animation loop (fish and shark movement)
    useEffect(() => {
        if (aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }

        let animationFrameId;

        const animate = (timestamp) => {
            animateFishes(timestamp);
            animateShark(); // Animate shark on each frame
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [aquariumDimensions, animateFishes, animateShark]); // Depend on both animation functions

    // Effect to trigger shark appearance periodically
    useEffect(() => {
        if (aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }

        const sharkTimer = setInterval(() => {
            setShark(prevShark => {
                if (prevShark.visible) return prevShark; // Don't spawn if already visible

                const startFromRight = Math.random() > 0.5; // Randomly start from left or right
                const startX = startFromRight ? aquariumDimensions.width : -shark.size;
                const startY = Math.random() * (aquariumDimensions.height - shark.size);

                return {
                    ...prevShark,
                    x: startX,
                    y: startY,
                    visible: true,
                    flipped: startFromRight, // Flip if starting from right (moving left)
                };
            });
        }, SHARK_PASS_INTERVAL_MS);

        return () => clearInterval(sharkTimer);
    }, [aquariumDimensions, shark.size]); // Depend on shark.size to reset if its value changes

    return (
        <div className="relative flex flex-col h-screen w-screen font-inter overflow-hidden">
            {/* Title Section */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-900 text-white rounded-b-2xl shadow-lg z-20">
                <h1 className="text-5xl font-bold text-teal-400 drop-shadow-lg">AslabArium</h1>
                <p className="text-xl font-bold text-gray-300 mt-1">25/26</p>
            </div>

            {/* Aquarium Container */}
            <div
                ref={aquariumRef}
                className="relative flex-grow bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700
                           rounded-2xl m-4 shadow-2xl overflow-hidden
                           flex items-center justify-center" // Center content if empty
            >
                {/* Water effects: subtle light rays */}
                <div className="absolute inset-0 z-0 opacity-20"
                     style={{
                         background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
                         backgroundSize: '200% 200%',
                         animation: 'water-flow 20s infinite alternate',
                     }}>
                </div>

                {/* Bubbles Container - Static bubbles, significantly slower and subtle */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                    {Array.from({ length: 20 }).map((_, i) => ( // Create 20 bubbles
                        <div
                            key={i}
                            className="bubble absolute bg-white rounded-full opacity-0"
                            style={{
                                width: `${Math.random() * 8 + 4}px`, // Smaller bubbles: 4px to 12px
                                height: `${Math.random() * 8 + 4}px`,
                                left: `${Math.random() * 100}%`, // Random horizontal position
                                // Significantly increased duration for very slow bubbles, and varied delay
                                animation: `bubble-rise ${Math.random() * 60 + 40}s infinite ease-out ${Math.random() * 30}s`,
                            }}
                        ></div>
                    ))}
                </div>

                {/* Render the passing shark */}
                {shark.visible && (
                    <img
                        src="/sharkto.png"
                        alt="shark"
                        className={`absolute transition-transform duration-100 ease-linear ${shark.flipped ? '-scale-x-100' : ''}`}
                        style={{
                            left: `${shark.x}px`,
                            top: `${shark.y}px`,
                            width: `${shark.size}px`,
                            height: 'auto', // Maintain aspect ratio
                            zIndex: 5, // Changed to 5 to be behind regular fish (zIndex 10)
                            objectFit: 'contain',
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }} // Hide if sharkto.png not found
                    />
                )}

                {/* Render each fish */}
                {fishes.map(fish => (
                    <img
                        key={fish.id}
                        src={fish.src}
                        alt="fish"
                        className={`absolute ${fish.flipped ? '-scale-x-100' : ''}`}
                        style={{
                            left: `${fish.x}px`,
                            top: `${fish.y}px`,
                            width: `${fish.currentSize}px`,
                            height: `${fish.currentSize}px`,
                            zIndex: fish.isScaring ? 20 : 10, // Bring to front during scare
                            objectFit: 'contain', // Ensures the entire image is visible within its bounds
                            cursor: 'pointer', // Indicates it's clickable
                            transition: fish.isScaring ? 'all 0.1s linear' : 'none', // Fast transition during scare, none otherwise
                        }}
                        onClick={() => handleFishClick(fish.id)} // Add click handler
                        // Fallback for broken image links: hide the image
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ))}

                {/* Message if no fish are loaded */}
                {fishes.length === 0 && aquariumDimensions.width > 0 && (
                    <p className="text-white text-3xl font-bold z-20">No fish to display. Add images to `fishImageSources` array.</p>
                )}
            </div>

            {/* Custom CSS for water effects and new bubble animations */}
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');

                body {
                    font-family: 'Inter', sans-serif;
                    user-select: none;
                    -webkit-user-drag: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                }

                @keyframes water-flow {
                    0% {
                        background-position: 0% 50%;
                    }
                    100% {
                        background-position: 100% 50%;
                    }
                }

                @keyframes bubble-rise {
                    0% {
                        transform: translateY(0) scale(0.3);
                        opacity: 0;
                    }
                    10% {
                        opacity: 0.2;
                    }
                    90% {
                        opacity: 0.1;
                    }
                    100% {
                        transform: translateY(-100vh) scale(0.6);
                        opacity: 0;
                    }
                }
            `}</style>
            {/* Tailwind CSS CDN */}
            <script src="https://cdn.tailwindcss.com"></script>
        </div>
    );
};

export default App;
