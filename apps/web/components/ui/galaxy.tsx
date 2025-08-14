'use client';

import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function GalaxyBackground() {
    const starsRef = useRef<THREE.Points>(null);
    const galaxyRef = useRef<THREE.Points>(null);
    const originalStarPositions = useRef<Float32Array | null>(null);
    const originalGalaxyPositions = useRef<Float32Array | null>(null);
    const initialStarPositions = useRef<Float32Array | null>(null);
    const initialGalaxyPositions = useRef<Float32Array | null>(null);
    const [scrollY, setScrollY] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // Galaxy parameters (similar to the provided example but optimized for Milky Way)
    const parameters = {
        size: 0.018,
        count: 80000,
        branches: 4, // Milky Way has 4 major arms
        radius: 30,
        spin: 1,
        randomness: 0.2,
        randomnessPower: 2,
        insideColor: 0x7c3aed, // Pink core (pink-500)
        outsideColor: 0x7c3aed, // Purple outer arms (violet-600)
    };

    useEffect(() => {
        // Create background stars
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 12000;
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);

        const colorInside = new THREE.Color(parameters.insideColor);
        const colorOutside = new THREE.Color(parameters.outsideColor);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;

            // Create stars around the galaxy with better distribution
            if (i < starCount * 0.7) {
                // 70% of stars in main sphere around galaxy
                starPositions[i3] = (Math.random() - 0.5) * 220;
                starPositions[i3 + 1] = (Math.random() - 0.5) * 140;
                starPositions[i3 + 2] = (Math.random() - 0.5) * 220;
            } else {
                // 30% of stars concentrated above galaxy
                starPositions[i3] = (Math.random() - 0.5) * 180;
                starPositions[i3 + 1] = Math.random() * 120 + 20; // Above galaxy plane
                starPositions[i3 + 2] = (Math.random() - 0.5) * 180;
            }

            const itemPlusOne = starPositions[i3 + 1];
            const itemPlusTwo = starPositions[i3 + 2];

            if (itemPlusOne !== undefined && itemPlusTwo !== undefined) {
                // Calculate distance from center for color
                const distanceFromCenter = Math.sqrt(
                    starPositions[i3] * starPositions[i3] + itemPlusOne * itemPlusOne + itemPlusTwo * itemPlusTwo
                );

                const maxDistance = 110; // Adjusted for larger distribution
                const colorProgress = Math.min(distanceFromCenter / maxDistance, 1);

                // Apply galaxy color scheme
                const currentColor = colorInside.clone();
                currentColor.lerp(colorOutside, colorProgress);

                starColors[i3] = currentColor.r;
                starColors[i3 + 1] = currentColor.g;
                starColors[i3 + 2] = currentColor.b;
            }

            // Vary star sizes for more realism
            starSizes[i] = Math.random() * 1.5 + 0.3;
        }

        // Store original positions for scroll animation
        originalStarPositions.current = starPositions.slice();

        // Create scattered initial positions for loading animation
        const initialPositions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            // Scatter stars far away in random directions
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();
            const distance = Math.random() * 300 + 200; // 200-500 units away

            initialPositions[i3] = direction.x * distance;
            initialPositions[i3 + 1] = direction.y * distance;
            initialPositions[i3 + 2] = direction.z * distance;
        }
        initialStarPositions.current = initialPositions;

        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
        if (starsRef.current) {
            starsRef.current.geometry = starGeometry;
        }

        // Generate galaxy using the algorithm from the provided example
        const positions = new Float32Array(parameters.count * 3);
        const colors = new Float32Array(parameters.count * 3);

        const galaxyColorInside = new THREE.Color(parameters.insideColor);
        const galaxyColorOutside = new THREE.Color(parameters.outsideColor);

        for (let i = 0; i < parameters.count; i++) {
            const i3 = i * 3;

            // Calculate branch angle
            const branchAngle = ((i % parameters.branches) / parameters.branches) * (Math.PI * 2);

            // Calculate radius with power distribution for realistic density
            const radius = Math.pow(Math.random(), parameters.randomnessPower) * parameters.radius;

            // Calculate spin based on radius
            const spin = radius * parameters.spin;

            // Color interpolation based on radius
            const currentColor = galaxyColorInside.clone();
            currentColor.lerp(galaxyColorOutside, radius / parameters.radius);

            // Add randomness with power distribution
            const randomX =
                Math.pow(Math.random(), parameters.randomnessPower) *
                (Math.random() < 0.5 ? 1 : -1) *
                radius *
                parameters.randomness;
            const randomY =
                Math.pow(Math.random(), parameters.randomnessPower) *
                (Math.random() < 0.5 ? 1 : -1) *
                radius *
                parameters.randomness *
                0.1; // Flatter galaxy
            const randomZ =
                Math.pow(Math.random(), parameters.randomnessPower) *
                (Math.random() < 0.5 ? 1 : -1) *
                radius *
                parameters.randomness;

            // Calculate final positions
            positions[i3] = Math.cos(branchAngle + spin) * radius + randomX;
            positions[i3 + 1] = randomY;
            positions[i3 + 2] = Math.sin(branchAngle + spin) * radius + randomZ;

            // Set colors
            colors[i3] = currentColor.r;
            colors[i3 + 1] = currentColor.g;
            colors[i3 + 2] = currentColor.b;
        }

        // Store original galaxy positions for scroll animation
        originalGalaxyPositions.current = positions.slice();

        // Create scattered initial positions for galaxy loading animation
        const initialGalaxyPos = new Float32Array(parameters.count * 3);
        for (let i = 0; i < parameters.count; i++) {
            const i3 = i * 3;
            // Scatter galaxy particles far away in random directions
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();
            const distance = Math.random() * 400 + 300; // 300-700 units away

            initialGalaxyPos[i3] = direction.x * distance;
            initialGalaxyPos[i3 + 1] = direction.y * distance;
            initialGalaxyPos[i3 + 2] = direction.z * distance;
        }
        initialGalaxyPositions.current = initialGalaxyPos;

        const galaxyGeometry = new THREE.BufferGeometry();
        galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        if (galaxyRef.current) {
            galaxyRef.current.geometry = galaxyGeometry;
        }

        // Add scroll event listener
        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        // Start loading animation and end it after 1.5 seconds
        setTimeout(() => {
            setIsLoading(false);
        }, 1500);

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useFrame(state => {
        const time = state.clock.getElapsedTime();

        // Apply loading animation or scroll-based star movement
        if (starsRef.current && originalStarPositions.current && initialStarPositions.current) {
            const geometry = starsRef.current.geometry;
            const position = geometry.attributes.position;

            if (position) {
                const positions = geometry.attributes.position?.array as Float32Array;
                const original = originalStarPositions.current;
                const initial = initialStarPositions.current;

                if (isLoading) {
                    // Loading animation - stars fly in from scattered positions
                    const loadingProgress = Math.min(time / 1.5, 1); // 1.5 second animation
                    const easedProgress = 1 - Math.pow(1 - loadingProgress, 3); // Cubic ease-out

                    let initialZero, originalZero, initialOne, originalOne, initialTwo, originalTwo;

                    for (let i = 0; i < positions.length; i += 3) {
                        initialZero = initial[i];
                        originalZero = original[i];
                        initialOne = initial[i + 1];
                        originalOne = original[i + 1];
                        initialTwo = initial[i + 2];
                        originalTwo = original[i + 2];

                        if (
                            initialZero !== undefined &&
                            originalZero !== undefined &&
                            initialOne !== undefined &&
                            originalOne !== undefined &&
                            initialTwo !== undefined &&
                            originalTwo !== undefined
                        ) {
                            positions[i] = initialZero + (originalZero - initialZero) * easedProgress;
                            positions[i + 1] = initialOne + (originalOne - initialOne) * easedProgress;
                            positions[i + 2] = initialTwo + (originalTwo - initialTwo) * easedProgress;
                        }
                    }
                } else {
                    // Normal scroll-based movement
                    const scrollProgress = Math.min(scrollY / window.innerHeight, 1);
                    const flySpeed = scrollProgress * 100;

                    for (let i = 0; i < positions.length; i += 3) {
                        const starX = original[i];
                        const starY = original[i + 1];
                        const starZ = original[i + 2];

                        if (starX !== undefined && starY !== undefined && starZ !== undefined) {
                            const distanceFromCenter = Math.sqrt(starX * starX + starY * starY + starZ * starZ);
                            const normalizedDistance = Math.max(distanceFromCenter, 0.1);
                            const originalAngle = Math.atan2(starZ, starX);
                            const rotationSpeed = (1 / (normalizedDistance * 0.1 + 1)) * scrollProgress * 3;
                            const newAngle = originalAngle + rotationSpeed;
                            const easedProgress = scrollProgress * scrollProgress;
                            const expansionFactor = flySpeed * easedProgress;
                            const expandedRadius = Math.sqrt(starX * starX + starZ * starZ) + expansionFactor * 0.8;

                            positions[i] = Math.cos(newAngle) * expandedRadius;
                            positions[i + 1] =
                                (original[i + 1] ?? 0) + (starY / normalizedDistance) * expansionFactor * 0.3;
                            positions[i + 2] = Math.sin(newAngle) * expandedRadius;
                        }
                    }
                }

                if (geometry.attributes.position) {
                    geometry.attributes.position.needsUpdate = true;
                }
                starsRef.current.rotation.y = time * 0.005;
            }
        }

        // Apply loading animation or scroll-based galaxy movement
        if (galaxyRef.current && originalGalaxyPositions.current && initialGalaxyPositions.current) {
            const geometry = galaxyRef.current.geometry;
            const position = geometry.attributes.position;

            if (position) {
                const positions = position.array as Float32Array;
                const original = originalGalaxyPositions.current;
                const initial = initialGalaxyPositions.current;

                if (isLoading) {
                    // Loading animation - galaxy particles fly in from scattered positions
                    const loadingProgress = Math.min(time / 1.5, 1); // 1.5 second animation
                    const easedProgress = 1 - Math.pow(1 - loadingProgress, 3); // Cubic ease-out

                    let initialZero, originalZero, initialOne, originalOne, initialTwo, originalTwo;

                    for (let i = 0; i < positions.length; i += 3) {
                        initialZero = initial[i];
                        originalZero = original[i];
                        initialOne = initial[i + 1];
                        originalOne = original[i + 1];
                        initialTwo = initial[i + 2];
                        originalTwo = original[i + 2];

                        if (
                            initialZero !== undefined &&
                            originalZero !== undefined &&
                            initialOne !== undefined &&
                            originalOne !== undefined &&
                            initialTwo !== undefined &&
                            originalTwo !== undefined
                        ) {
                            positions[i] = initialZero + (originalZero - initialZero) * easedProgress;
                            positions[i + 1] = initialOne + (originalOne - initialOne) * easedProgress;
                            positions[i + 2] = initialTwo + (originalTwo - initialTwo) * easedProgress;
                        }
                    }
                } else {
                    // Normal scroll-based movement
                    const scrollProgress = Math.min(scrollY / window.innerHeight, 1);
                    const flySpeed = scrollProgress * 100;

                    for (let i = 0; i < positions.length; i += 3) {
                        // Get original galaxy particle position
                        const starX = original[i];
                        const starY = original[i + 1];
                        const starZ = original[i + 2];

                        if (starX !== undefined && starY !== undefined && starZ !== undefined) {
                            // Calculate distance from center (0,0,0)
                            const distanceFromCenter = Math.sqrt(starX * starX + starY * starY + starZ * starZ);
                            const normalizedDistance = Math.max(distanceFromCenter, 0.1);

                            // Calculate original angle in XZ plane
                            const originalAngle = Math.atan2(starZ, starX);

                            // Apply spiral rotation - galaxy core rotates faster, arms rotate slower
                            const rotationSpeed = (1 / (normalizedDistance * 0.05 + 1)) * scrollProgress * 4; // Stronger rotation for galaxy
                            const newAngle = originalAngle + rotationSpeed;

                            // Calculate radial expansion
                            const easedProgress = scrollProgress * scrollProgress;
                            const expansionFactor = flySpeed * easedProgress;

                            // Combine spiral rotation with radial expansion
                            const expandedRadius = Math.sqrt(starX * starX + starZ * starZ) + expansionFactor * 0.6;

                            positions[i] = Math.cos(newAngle) * expandedRadius;
                            positions[i + 1] =
                                (original[i + 1] ?? 0) + (starY / normalizedDistance) * expansionFactor * 0.2; // Minimal Y expansion
                            positions[i + 2] = Math.sin(newAngle) * expandedRadius;
                        }
                    }
                }

                if (geometry.attributes.position) {
                    geometry.attributes.position.needsUpdate = true;
                }
                galaxyRef.current.rotation.y = time * 0.008;
            }
        }
    });

    return (
        <group>
            {/* Background stars */}
            <points ref={starsRef}>
                <pointsMaterial
                    size={0.08}
                    vertexColors={true}
                    transparent
                    opacity={0.6}
                    sizeAttenuation={true}
                    blending={THREE.AdditiveBlending}
                />
            </points>

            {/* Galaxy spiral */}
            <points ref={galaxyRef}>
                <pointsMaterial
                    size={parameters.size}
                    sizeAttenuation={true}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    vertexColors={true}
                    transparent
                    opacity={0.6}
                />
            </points>
        </group>
    );
}

interface GalaxyProps {
    className?: string;
}

export default function Galaxy({ className = '' }: GalaxyProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className={`absolute inset-0 ${className}`} style={{ zIndex: 1, pointerEvents: 'none' }}>
            <Canvas camera={{ position: [0, 8, 15], fov: 85 }} style={{ background: 'transparent' }}>
                <GalaxyBackground />
            </Canvas>
        </div>
    );
}
