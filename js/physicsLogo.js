// Matter.js Check
if (typeof Matter === 'undefined') {
    console.error("PhysicsLogo: Matter.js not loaded. Skipping initialization.");
    window.PhysicsLogo = {
        init: () => console.warn("PhysicsLogo disabled (Matter missing)"),
        generate: () => console.warn("PhysicsLogo disabled (Matter missing)")
    };
} else {

    // Matter.js aliases
    const Engine = Matter.Engine,
        Render = Matter.Render,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Runner = Matter.Runner,
        Composite = Matter.Composite;

    // Store active instances to allow cleanup
    // Key: container Element, Value: { engine, render, runner }
    const activePhysicsInstances = new WeakMap();

    /**
     * Initialize Physics Engine for a specific container
     * @param {HTMLElement} container - The DOM element to render into
     */
    function initPhysics(container) {
        // Cleanup existing if any
        if (activePhysicsInstances.has(container)) {
            const old = activePhysicsInstances.get(container);
            World.clear(old.engine.world);
            Engine.clear(old.engine);
            Render.stop(old.render);
            Runner.stop(old.runner);
            old.render.canvas.remove();
            old.render.canvas = null;
            old.render.context = null;
            // old.render.textures = {}; // Internal property, accessing might be unsafe if old.render is cleared
        }

        // Create engine
        const engine = Engine.create();

        // Create renderer
        const render = Render.create({
            element: container,
            engine: engine,
            options: {
                width: 90,
                height: 90,
                background: 'black', // Black background for 'Multiply' mask effect
                wireframes: false,
                pixelRatio: 'auto'
            }
        });

        // Create boundaries (walls)
        // Ground at y=90 (bottom of 90px box)
        const ground = Bodies.rectangle(45, 95, 90, 10, { isStatic: true, render: { visible: false } });
        // Walls
        const leftWall = Bodies.rectangle(-5, 45, 10, 90, { isStatic: true, render: { visible: false } });
        const rightWall = Bodies.rectangle(95, 45, 10, 90, { isStatic: true, render: { visible: false } });

        World.add(engine.world, [ground, leftWall, rightWall]);

        // Run the engine
        const runner = Runner.create();
        Runner.run(runner, engine);
        Render.run(render);

        // Store instance
        activePhysicsInstances.set(container, { engine, render, runner });

        return { engine, render, runner };
    }

    /**
     * Generate Falling Logo Text
     * @param {string} text - The text to display
     * @param {HTMLElement} container - The DOM element to render into
     * @param {string} font - Font family
     * @param {boolean} shouldPrewarm - If true, simulates physics instantly to settle text
     */
    function generateLogo(text, container, font = '"Times New Roman", serif', shouldPrewarm = false) {
        // 1. Check for Static Snapshot (Saved Card Image) and remove it if user is editing
        const staticSnap = container.querySelector('.static-logo-snapshot');
        if (staticSnap) {
            staticSnap.remove();
            // Also force valid cleanup of any stale physics engine attached to this container
            if (activePhysicsInstances.has(container)) {
                const old = activePhysicsInstances.get(container);
                World.clear(old.engine.world);
                Engine.clear(old.engine);
                activePhysicsInstances.delete(container);
            }
        }

        let instance = activePhysicsInstances.get(container);

        // If no instance exists or canvas is missing/cleared, re-init
        if (!instance || !container.querySelector('canvas')) {
            instance = initPhysics(container);
        }

        const { engine } = instance;

        // Clear existing dynamic bodies
        const allBodies = Composite.allBodies(engine.world);
        const dynamicBodies = allBodies.filter(body => !body.isStatic);
        World.remove(engine.world, dynamicBodies);

        // If text is empty or just whitespace, do nothing (or clear)
        if (!text || !text.trim()) return;

        // Reverse Input Order (Last char typed falls first)
        const chars = text.split('').reverse();
        const pixelRatio = window.devicePixelRatio || 1;

        chars.forEach((char, index) => {
            // Random Size logic: Restore chaos as requested!
            const fontSize = Math.floor(Math.random() * (68 - 32 + 1) + 32);

            // Create canvas for texture
            const size = fontSize * 1.5;
            const canvas = document.createElement('canvas');

            // High-DPI Scaling for Texture
            canvas.width = size * pixelRatio;
            canvas.height = size * pixelRatio;
            const ctx = canvas.getContext('2d');
            ctx.scale(pixelRatio, pixelRatio);

            // Draw WHITE text (for Multiply blend mode: White becomes transparent if background is black? 
            // Wait, previous code said "Draw WHITE text". 
            // If background is transparent/black, white text is visible.
            // Let's stick to original logic: White text.

            // --- FONT FALLBACK LOGIC ---
            // Ensure valid font string
            let validFont = font ? font.replace(/['"]/g, '') : "Times New Roman, serif";
            if (!validFont || validFont.trim() === "") validFont = "Times New Roman, serif";

            ctx.font = `bold ${fontSize}px ${validFont}`;
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Measure
            const metrics = ctx.measureText(char);
            const textWidth = metrics.width;
            const textHeight = fontSize * 0.7;

            ctx.fillText(char, size / 2, size / 2);

            const texture = canvas.toDataURL();

            // Create body with CUSTOM DIMENSIONS based on letter shape
            const body = Bodies.rectangle(
                20 + (Math.random() * 50), // Random X (within 90px width)
                -50 - (index * 80),        // Staggered Y start
                Math.max(textWidth * 0.8, 10),
                textHeight,
                {
                    angle: Math.random() * Math.PI,
                    restitution: 0.4,
                    chamfer: { radius: 2 },
                    render: {
                        sprite: {
                            texture: texture,
                            xScale: 1 / pixelRatio, // Scale down to match physics size
                            yScale: 1 / pixelRatio
                        }
                    }
                }
            );

            World.add(engine.world, body);
        });

        // PRE-WARM SIMULATION (Instant Settle)
        if (shouldPrewarm) {
            // Simulate approx 2.5 seconds (150 frames @ 16.6ms)
            for (let i = 0; i < 150; i++) {
                Engine.update(engine, 16.666);
            }
        }
    }

    // Attach to window for global access
    window.PhysicsLogo = {
        init: initPhysics,
        generate: generateLogo
    };
}
