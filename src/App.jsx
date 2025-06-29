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

    // State for jellyfish
    const [jellyfishes, setJellyfishes] = useState([]);

    // State for the anchor
    const [anchor, setAnchor] = useState({
        y: -300, // Start off-screen above the top (initial value, will be set more precisely)
        x: 0, // Will be set to a random position when it shows
        visible: false,
        state: 'hidden', // 'hidden', 'showing'
        timerStart: 0,
    });

    // NEW STATE: To keep track of the number of visible fish
    const [fishCount, setFishCount] = useState(0);

    // Constants for fish behavior
    const FISH_BASE_SPEED = 2; // Pixels per frame for normal movement
    const FISH_DEFAULT_SIZE = 200; // Default size for fish image (width and height)

    // Constants for click interactions
    const JUMP_SCARE_DURATION_MS = 2000; // Duration of the jump scare animation (grow and shrink)
    const MAX_SCARE_SIZE_RATIO = 0.9; // Max size relative to aquarium's smaller dimension (width or height) during scare

    // Shark specific constants
    const SHARK_PASS_INTERVAL_MS = 5000; // Shark passes every 5 seconds

    // Jellyfish specific constants
    const NUM_JELLYFISH = 9;
    const JELLYFISH_SIZE = 100; // Size of jellyfish image
    const JELLYFISH_RISE_SPEED = 0.8; // Pixels per frame for rising
    const JELLYFISH_FALL_SPEED = 0.5; // Pixels per frame for falling
    const JELLYFISH_FLOAT_DURATION_MS = 3000; // 3 seconds in middle
    const JELLYFISH_HIDDEN_DURATION_MS = 5000; // 3 seconds invisible before next cycle

    // Anchor specific constants
    const ANCHOR_DISPLAY_DURATION_MS = 10000; // Anchor visible for 5 seconds
    const ANCHOR_HIDDEN_DURATION_MS = 10000; // Anchor hidden for 5 seconds
    const ANCHOR_DROP_SPEED = 1; // How fast the anchor moves vertically
    const ANCHOR_SIZE = 300; // Default size for the anchor (width/height)
    const ANCHOR_X_OFFSET_PERCENT = 0.1; // 10% from left/right edge for anchor to appear

    // --- IMPORTANT: Replace these with your actual fish image URLs ---
    // Now includes a 'name' property for each fish
    const fishImageSources = [
        { src: '/fish_1.png', name: 'Nemitarus Nematophirmanio' },
        { src: '/fish_2.png', name: 'Anguila Anggaldora' },
        { src: '/fish_3.png', name: 'Widitakus Javanicus' },
        { src: '/evanbob.png', name: 'Spongivan Yudistirus' }, // This is Evan Bob
        { src: '/randugong.png', name: 'Dugonian Irdurian' },
        { src: '/koirev.png', name: 'Cokrinus Rubrofuscus' },
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
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Function to add a new fish to the aquarium (used for initial loading)
    // Modified to accept a fishData object (including src and name)
    const addFishInitial = useCallback((fishData) => {
        if (!aquariumDimensions || aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            console.warn("Aquarium dimensions not ready for adding fish. Skipping initial fish load.");
            return;
        }
        const newFishId = Date.now() + Math.random();
        let x = Math.random() * (aquariumDimensions.width - FISH_DEFAULT_SIZE);
        let y = Math.random() * (aquariumDimensions.height - FISH_DEFAULT_SIZE);
        let dx = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
        let dy = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;

        // Special initial placement for Evan Bob
        if (fishData.name === 'Spongivan Yudistirus') {
            const bottomMargin = 50; // Distance from the bottom for Evan Bob
            x = Math.random() * (aquariumDimensions.width - FISH_DEFAULT_SIZE);
            y = aquariumDimensions.height - FISH_DEFAULT_SIZE - bottomMargin; // Position at the bottom
            dx = (Math.random() > 0.5 ? FISH_BASE_SPEED : -FISH_BASE_SPEED); // Start moving left or right
            dy = 0; // No vertical movement
        }

        setFishes(prevFishes => [
            ...prevFishes,
            {
                id: newFishId,
                src: fishData.src, // Use src from fishData
                name: fishData.name, // Add the name property
                x, y,
                dx: dx === 0 ? FISH_BASE_SPEED : dx,
                dy: dy === 0 ? FISH_BASE_SPEED : dy, // Ensure non-zero for other fish, but will be overridden for Evan Bob
                flipped: dx < 0,
                isScaring: false,
                originalSize: FISH_DEFAULT_SIZE,
                currentSize: FISH_DEFAULT_SIZE,
                scareProgress: 0,
                originalX: x, originalY: y,
            },
        ]);
    }, [aquariumDimensions]);

    // Effect to automatically add fish and jellyfish on mount
    useEffect(() => {
        if (aquariumDimensions.width > 0 && aquariumDimensions.height > 0) {
            if (fishes.length === 0) {
                // Iterate over the fishImageSources objects
                fishImageSources.forEach(fishData => {
                    addFishInitial(fishData); // Pass the whole fishData object
                });
            }
            if (jellyfishes.length === 0) {
                for (let i = 0; i < NUM_JELLYFISH; i++) {
                    setJellyfishes(prev => [...prev, {
                        id: Date.now() + i + 1000,
                        x: Math.random() * (aquariumDimensions.width - JELLYFISH_SIZE),
                        y: aquariumDimensions.height + JELLYFISH_SIZE + (Math.random() * 200),
                        vy: 0,
                        size: JELLYFISH_SIZE,
                        state: 'hidden',
                        timerStart: performance.now() + (Math.random() * JELLYFISH_HIDDEN_DURATION_MS * 2),
                        src: '/jellygi.png',
                    }]);
                }
            }
        }
    }, [aquariumDimensions, fishes.length, jellyfishes.length, addFishInitial, fishImageSources]);

    // NEW EFFECT: Update fishCount whenever 'fishes' state changes
    useEffect(() => {
        setFishCount(fishes.length);
    }, [fishes]);

    // Function to handle fish click event
    const handleFishClick = useCallback((id) => {
        setFishes(prevFishes => prevFishes.map(fish => {
            if (fish.id === id) {
                return {
                    ...fish,
                    isScaring: true,
                    scareProgress: 0,
                    originalX: fish.x,
                    originalY: fish.y,
                    dx: 0,
                    dy: 0,
                };
            }
            return fish;
        }));
    }, []);

    // Main animation logic for fishes
    const animateFishes = useCallback(() => {
        if (!aquariumDimensions || aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }
        setFishes(prevFishes => {
            if (!Array.isArray(prevFishes)) return [];
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
                    // Adjusted targetX and targetY to center the entire fish + name div
                    const totalHeight = newCurrentSize + 20; // Fish size + name div height (approx)
                    const targetX = (aquariumDimensions.width / 2) - (newCurrentSize / 2);
                    const targetY = (aquariumDimensions.height / 2) - (totalHeight / 2); // Center based on total height

                    newX = fish.originalX + (targetX - fish.originalX) * newScareProgress; // Simplified movement during scare
                    newY = fish.originalY + (targetY - fish.originalY) * newScareProgress;

                    if (newScareProgress >= 1) {
                        newIsScaring = false;
                        newCurrentSize = normalSize;
                        newX = fish.originalX;
                        newY = fish.originalY;
                        // Re-randomize dx/dy for other fish, but special handling for Evan Bob
                        if (fish.name === 'Spongivan Yudistirus') {
                            newDx = (Math.random() > 0.5 ? FISH_BASE_SPEED : -FISH_BASE_SPEED); // Only horizontal movement
                            newDy = 0; // No vertical movement
                        } else {
                            newDx = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
                            newDy = (Math.random() - 0.5) * FISH_BASE_SPEED * 2;
                        }
                    }
                } else {
                    // Normal movement logic
                    newX = fish.x + newDx;
                    newY = fish.y + newDy;
                    const fishTotalRenderHeight = fish.currentSize + 20; // approximate height for name div

                    if (fish.name === 'Spongivan Yudistirus') {
                        // Evan Bob specific movement: always at the bottom, moves left/right
                        newDy = 0; // Ensure no vertical movement
                        const bottomMargin = 50; // Keep 50px from the very bottom
                        newY = aquariumDimensions.height - fishTotalRenderHeight - bottomMargin;

                        if (newX + fish.currentSize > aquariumDimensions.width || newX < 0) {
                            newDx *= -1; // Reverse horizontal direction
                            newX = fish.x; // Revert X to prevent sticking
                            newFlipped = newDx < 0;
                        }
                    } else {
                        // General fish movement logic
                        if (newX + fish.currentSize > aquariumDimensions.width || newX < 0) {
                            newDx *= -1;
                            newX = fish.x; // Revert X to prevent sticking
                            newFlipped = newDx < 0;
                        }
                        if (newY + fishTotalRenderHeight > aquariumDimensions.height || newY < 0) {
                            newDy *= -1;
                            newY = fish.y; // Revert Y to prevent sticking
                        }
                    }
                }
                return {
                    ...fish, x: newX, y: newY, dx: newDx, dy: newDy, flipped: newFlipped,
                    currentSize: newCurrentSize, isScaring: newIsScaring, scareProgress: newScareProgress,
                };
            });
        });
    }, [aquariumDimensions]);

    // Shark animation logic
    const animateShark = useCallback(() => {
        if (!aquariumDimensions || aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }
        setShark(prevShark => {
            if (!prevShark.visible) return prevShark;
            let newX = prevShark.x + (prevShark.flipped ? -prevShark.speed : prevShark.speed);
            if (prevShark.flipped && newX < -prevShark.size) {
                return { ...prevShark, visible: false, x: -prevShark.size };
            }
            if (!prevShark.flipped && newX > aquariumDimensions.width) {
                return { ...prevShark, visible: false, x: aquariumDimensions.width };
            }
            return { ...prevShark, x: newX };
        });
    }, [aquariumDimensions]);

    // Jellyfish animation logic
    const animateJellyfish = useCallback(() => {
        if (!aquariumDimensions || aquariumDimensions.width === 0 || aquariumDimensions.height === 0 || !Array.isArray(jellyfishes)) {
            return;
        }
        setJellyfishes(prevJellyfishes => {
            if (!Array.isArray(prevJellyfishes)) return [];
            return prevJellyfishes.map(jellyfish => {
                let newY = jellyfish.y;
                let newState = jellyfish.state;
                let newTimerStart = jellyfish.timerStart;
                const now = performance.now();
                const middleY = aquariumDimensions.height * 0.5 - (jellyfish.size / 2); // Center jellyfish vertically

                switch (jellyfish.state) {
                    case 'rising':
                        newY += -JELLYFISH_RISE_SPEED; // Moves up
                        if (newY <= middleY) {
                            newY = middleY;
                            newState = 'floating';
                            newTimerStart = now;
                        }
                        break;
                    case 'floating':
                        if (now - newTimerStart >= JELLYFISH_FLOAT_DURATION_MS) {
                            newState = 'falling';
                            newTimerStart = now;
                        }
                        break;
                    case 'falling':
                        newY += JELLYFISH_FALL_SPEED; // Moves down
                        if (newY >= aquariumDimensions.height + jellyfish.size) { // Fully off-screen
                            newState = 'hidden';
                            newY = aquariumDimensions.height + jellyfish.size; // Ensure off-screen
                            newTimerStart = now;
                        }
                        break;
                    case 'hidden':
                        if (now - newTimerStart >= JELLYFISH_HIDDEN_DURATION_MS) {
                            newState = 'rising';
                            newY = aquariumDimensions.height + jellyfish.size; // Reset just below screen
                            newTimerStart = now; // Reset timer for next phase
                        }
                        break;
                    default:
                        break;
                }
                return { ...jellyfish, y: newY, state: newState, timerStart: newTimerStart };
            });
        });
    }, [aquariumDimensions, jellyfishes]);

    const animateAnchor = useCallback(() => {
        if (!aquariumDimensions || aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }

        setAnchor(prevAnchor => {
            const now = performance.now();
            let newY = prevAnchor.y;
            let newState = prevAnchor.state;
            let newTimerStart = prevAnchor.timerStart;
            let newVisible = prevAnchor.visible;

            switch (prevAnchor.state) {
                case 'hidden':
                    // Wait for hidden duration, then start showing
                    if (now - newTimerStart >= ANCHOR_HIDDEN_DURATION_MS) {
                        newState = 'showing';
                        newY = -ANCHOR_SIZE; // Start off-screen top
                        newTimerStart = now;
                        newVisible = true;
                        // Set random X position when it starts showing
                        const minX = aquariumDimensions.width * ANCHOR_X_OFFSET_PERCENT;
                        const maxX = aquariumDimensions.width * (1 - ANCHOR_X_OFFSET_PERCENT) - ANCHOR_SIZE;
                        // Ensure maxX is not less than minX in case of very small aquarium width
                        const randomX = (maxX > minX) ? (minX + Math.random() * (maxX - minX)) : minX;
                        setAnchor(current => ({ ...current, x: randomX }));
                    }
                    break;
                case 'showing':
                    newY += ANCHOR_DROP_SPEED; // Drop down
                    const targetY = aquariumDimensions.height * 0; // Drops to 60% from top (changed from 0.3)
                    if (newY >= targetY) {
                        newY = targetY; // Stop at target Y
                        if (now - newTimerStart >= ANCHOR_DISPLAY_DURATION_MS) {
                            newState = 'ascending'; // After display duration, start ascending
                            newTimerStart = now; // Reset timer for ascending phase
                        }
                    }
                    break;
                case 'ascending':
                    newY -= ANCHOR_DROP_SPEED; // Ascend (move up)
                    const topY = -ANCHOR_SIZE; // Ascend back to off-screen top
                    if (newY <= topY) {
                        newY = topY; // Stop at off-screen top
                        newState = 'hidden'; // After reaching top, go back to hidden state
                        newVisible = false; // Hide it after reaching the top
                        newTimerStart = now; // Reset timer for next hidden phase
                    }
                    break;
                default:
                    break;
            }
            return { ...prevAnchor, y: newY, state: newState, visible: newVisible, timerStart: newTimerStart };
        });
    }, [aquariumDimensions]); // Only aquariumDimensions as dependency needed for this specific logic

    // Effect for the main animation loop (fish, shark, jellyfish, and anchor movement)
    useEffect(() => {
        if (aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }

        let animationFrameId;
        // The initial state set for anchor should be outside the animate function
        // It's already in the correct place, running once on mount.

        const animate = () => {
            animateFishes();
            animateShark();
            animateJellyfish();
            animateAnchor(); // Animate anchor
            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrameId);
    }, [aquariumDimensions, animateFishes, animateShark, animateJellyfish, animateAnchor]);


    // Effect to trigger shark appearance periodically
    useEffect(() => {
        if (aquariumDimensions.width === 0 || aquariumDimensions.height === 0) {
            return;
        }

        const sharkTimer = setInterval(() => {
            setShark(prevShark => {
                if (prevShark.visible) return prevShark;
                const startFromRight = Math.random() > 0.5;
                const startX = startFromRight ? aquariumDimensions.width : -shark.size;
                const startY = Math.random() * (aquariumDimensions.height - shark.size);
                return {
                    ...prevShark,
                    x: startX,
                    y: startY,
                    visible: true,
                    flipped: startFromRight,
                };
            });
        }, SHARK_PASS_INTERVAL_MS);
        return () => clearInterval(sharkTimer);
    }, [aquariumDimensions, shark.size]);

    return (
        <div className="relative flex flex-col h-screen w-screen font-inter overflow-hidden bg-gray-100">
            {/* Title Section */}
            <div className="flex flex-col items-center justify-center p-4 bg-gray-900 text-white rounded-b-2xl shadow-lg z-20">
                <h1 className="text-5xl font-bold text-teal-400 drop-shadow-lg">AslabArium</h1>
                <p className="text-xl font-bold text-gray-300 mt-1">25/26</p>
            </div>

            {/* Fish Count Display */}
            <div className="absolute top-4 right-4 z-30 bg-gray-800 text-white px-3 py-1 rounded-lg text-lg font-semibold shadow-md">
                ASLAB COUNT: {fishCount}
            </div>

            {/* Aquarium Container */}
            <div
                ref={aquariumRef}
                className="relative flex-grow bg-blue-200 bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700
                           rounded-2xl m-4 shadow-2xl overflow-hidden
                           flex items-center justify-center min-h-[calc(100vh-150px)]"
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
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="bubble absolute bg-white rounded-full opacity-0"
                            style={{
                                width: `${Math.random() * 8 + 4}px`,
                                height: `${Math.random() * 8 + 4}px`,
                                left: `${Math.random() * 100}%`,
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
                            height: 'auto',
                            zIndex: 5,
                            objectFit: 'contain',
                            opacity: 0.6,
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                )}

                {/* Render jellyfish */}
                {jellyfishes.map(jellyfish => (
                    jellyfish.state !== 'hidden' && (
                        <img
                            key={jellyfish.id}
                            src={jellyfish.src}
                            alt="jellyfish"
                            className="absolute"
                            style={{
                                left: `${jellyfish.x}px`,
                                top: `${jellyfish.y}px`,
                                width: `${jellyfish.size}px`,
                                height: `${jellyfish.size}px`,
                                opacity: jellyfish.state === 'hidden' ? 0 : 0.2,
                                zIndex: 4,
                                objectFit: 'contain',
                                transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                    )
                ))}

                {/* Render the anchor */}
                {anchor.visible && (
                    <img
                        src="/jangriq.png" /* Assuming anchor image is named anchor.png in public folder */
                        alt="anchor"
                        className="absolute"
                        style={{
                            left: `${anchor.x}px`,
                            top: `${anchor.y}px`,
                            width: `${ANCHOR_SIZE}px`,     /* EDIT SIZE HERE */
                            height: 'auto',                /* EDIT SIZE HERE - use 'auto' to maintain aspect ratio */
                            zIndex: 8,                     // Between jellyfish and fish, for visual layering
                            objectFit: 'contain',
                            // Removed transform transition as it conflicts with direct Y position updates
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                )}

                {/* Render each fish */}
                {fishes.map(fish => (
                    <div
                        key={fish.id} // Key is now on the outer div
                        className="absolute"
                        style={{
                            left: `${fish.x}px`,
                            top: `${fish.y}px`,
                            width: `${fish.currentSize}px`,
                            height: `${fish.currentSize}px`,
                            zIndex: fish.isScaring ? 20 : 10,
                            cursor: 'pointer',
                            transition: fish.isScaring ? 'all 0.1s linear' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                        }}
                        onClick={() => handleFishClick(fish.id)}
                    >
                        <img
                            src={fish.src}
                            alt={fish.name}
                            className={`w-full h-full object-contain ${fish.flipped ? '-scale-x-100' : ''}`}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        {/* Fish Name Display */}
                        <div
                            className="text-white text-sm font-bold bg-black bg-opacity-50 px-1 rounded-sm mt-1 whitespace-nowrap"
                            style={{
                                pointerEvents: 'none', // Allows clicks to pass through to the fish div
                            }}
                        >
                            {fish.name}
                        </div>
                    </div>
                ))}

                {/* Message if no fish are loaded */}
                {aquariumDimensions.width > 0 && fishes.length === 0 && (
                    <p className="text-white text-3xl font-bold z-20 text-center">
                        No fish to display.<br/>Please ensure your fish PNG files are in the public folder.
                    </p>
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