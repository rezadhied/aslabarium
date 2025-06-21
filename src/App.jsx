import React, { useState, useEffect, useRef, useCallback } from 'react';

// Main App component for the aquarium
const App = () => {
    // State to hold all the fish objects in the aquarium
    const [fishes, setFishes] = useState([]);
    // Reference to the aquarium container element to get its dimensions
    const aquariumRef = useRef(null);
    // State to store the dimensions of the aquarium
    const [aquariumDimensions, setAquariumDimensions] = useState({ width: 0, height: 0 });

    // Constants for fish behavior
    const FISH_BASE_SPEED = 2; // Pixels per frame for normal movement
    const FISH_DEFAULT_SIZE = 200; // Default size for fish image (width and height)

    // Constants for click interactions
    const JUMP_SCARE_DURATION_MS = 2000; // Duration of the jump scare animation (grow and shrink) - Changed to 2 seconds
    const MAX_SCARE_SIZE_RATIO = 0.9; // Max size relative to aquarium's smaller dimension (width or height) during scare

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
                let newDx = fish.dx; // Use the fish's current dx/dy
                let newDy = fish.dy; // Use the fish's current dx/dy
                let newFlipped = fish.flipped;
                let newCurrentSize = fish.currentSize;
                let newIsScaring = fish.isScaring;
                let newScareProgress = fish.scareProgress;

                if (newIsScaring) {
                    // Update scare progress based on time (assuming ~60fps for calculation, but actual time used)
                    newScareProgress = Math.min(1, fish.scareProgress + (1000 / JUMP_SCARE_DURATION_MS) * (1 / 60));

                    const scareSize = Math.min(aquariumDimensions.width, aquariumDimensions.height) * MAX_SCARE_SIZE_RATIO;
                    const normalSize = fish.originalSize;

                    // Size interpolation: Grow quickly in first 20%, then shrink over remaining 80%
                    if (newScareProgress < 0.2) {
                        newCurrentSize = normalSize + (scareSize - normalSize) * (newScareProgress / 0.2);
                    } else {
                        newCurrentSize = scareSize - (scareSize - normalSize) * ((newScareProgress - 0.2) / 0.8);
                    }

                    // Position interpolation: Move to center quickly, then back to original position
                    const targetX = (aquariumDimensions.width / 2) - (newCurrentSize / 2);
                    const targetY = (aquariumDimensions.height / 2) - (newCurrentSize / 2);

                    // A 'there and back' movement interpolation
                    const moveProgressSegment = newScareProgress * 2; // 0 to 2 over total animation
                    let actualMoveProgress;
                    if (moveProgressSegment <= 1) {
                        actualMoveProgress = moveProgressSegment; // Moves from 0 to 1 (original to target)
                    } else {
                        actualMoveProgress = 1 - (moveProgressSegment - 1); // Moves from 1 to 0 (target back to original)
                    }

                    newX = fish.originalX + (targetX - fish.originalX) * actualMoveProgress;
                    newY = fish.originalY + (targetY - fish.originalY) * actualMoveProgress;


                    if (newScareProgress >= 1) { // Scare animation finished
                        newIsScaring = false;
                        newCurrentSize = normalSize; // Reset size
                        // Reset to the position where it started the scare
                        newX = fish.originalX;
                        newY = fish.originalY;

                        // Restore random movement after scare
                        newDx = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
                        newDy = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
                    }

                } else {
                    // Normal movement
                    newX = fish.x + newDx;
                    newY = fish.y + newDy;

                    // Boundary checks for X-axis
                    if (newX + fish.currentSize > aquariumDimensions.width || newX < 0) {
                        newDx *= -1; // Reverse horizontal direction
                        newX = fish.x; // Revert to previous position if going out of bounds
                        newFlipped = newDx < 0; // Flip image based on new direction
                    }

                    // Boundary checks for Y-axis
                    if (newY + fish.currentSize > aquariumDimensions.height || newY < 0) {
                        newDy *= -1; // Reverse vertical direction
                        newY = fish.y; // Revert to previous position
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
    }, [aquariumDimensions]); // Dependencies for useCallback

    // Effect for the main animation loop (fish movement)
    useEffect(() => {
        // Only start animation if aquarium dimensions are known
        if (aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }

        let animationFrameId;

        const animate = (timestamp) => { // Receive timestamp from requestAnimationFrame
            animateFishes(timestamp); // Pass timestamp to animateFishes
            animationFrameId = requestAnimationFrame(animate); // Continue animation
        };

        animationFrameId = requestAnimationFrame(animate); // Start animation loop

        // Cleanup animation frame on component unmount or dependencies change
        return () => cancelAnimationFrame(animationFrameId);
    }, [aquariumDimensions, animateFishes]); // Depend on animateFishes now

    return (
        <div className="relative flex flex-col h-screen w-screen font-inter overflow-hidden">
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

                {/* Render each fish */}
                {fishes.map(fish => (
                    <img
                        key={fish.id}
                        src={fish.src}
                        alt="fish"
                        // Removed 'transition-transform duration-100 ease-linear' from className
                        // to allow custom animation via style and scareProgress
                        className={`absolute ${fish.flipped ? '-scale-x-100' : ''}`}
                        style={{
                            left: `${fish.x}px`,
                            top: `${fish.y}px`,
                            width: `${fish.currentSize}px`,  // Use dynamic currentSize
                            height: `${fish.currentSize}px`, // Use dynamic currentSize
                            zIndex: fish.isScaring ? 20 : 10, // Bring to front during scare
                            objectFit: 'contain', // Ensures the entire image is visible within its bounds
                            cursor: 'pointer', // Indicates it's clickable
                            // Add transition for smooth scare animation if not controlled by scareProgress itself
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
                    /* Prevent text selection */
                    user-select: none;
                    /* Prevent image dragging for WebKit browsers (e.g., Chrome, Safari) */
                    -webkit-user-drag: none;
                    /* Prevent image dragging for Mozilla Firefox */
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
                        transform: translateY(0) scale(0.3); /* Start very small */
                        opacity: 0; /* Start invisible */
                    }
                    10% {
                        opacity: 0.2; /* Fade in slowly */
                    }
                    90% {
                        opacity: 0.1; /* Maintain low visibility */
                    }
                    100% {
                        transform: translateY(-100vh) scale(0.6); /* End larger but still small */
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
